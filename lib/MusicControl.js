// Copyright 2015-2023 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

/**
 * Number of frequency bins to use in harmonic analysis. The Web Audio API
 * requires this to be a power of two.
 */
const FREQ_SIZE = 1024;

/**
 * Maximum dB to register on the harmonics display.
 */
const MAX_DB = -10;

/**
 * Minimum dB to register on the harmonics display.
 */
const MIN_DB = -90;

/**
 * Presumed sample rate (so that displays can render something reasonable before
 * audio starts flowing).
 */
const PRESUMED_SAMPLE_RATE = 44100;

/**
 * Overall control of music / sound generation.
 */
export class MusicControl {
  /** Currently playing? */
  #playing = false;

  /** The URL path to the sound generator script. */
  #genScript = null;

  /** The oscilloscope, if any. */
  #oscilloscope = null;

  /** The harmonics graph, if any. */
  #harmonics = null;

  /** Pending parameters, to be sent to the generator once it exists. */
  #pendingParameters = new Map();

  /** The overall audio context instance. */
  #audioCtx = null;

  /** Generator node; the scripted thing that produces raw samples. */
  #generatorNode = null;

  /** Gain node, for controlling output volume. */
  #gainNode = null;

  /** Analyser node, for rendering harmonics. */
  #analyserNode = null;

  /**
   * Takes an `AudioContext` instance and the composition generator.
   *
   * @param {string} genScript The URL path to the generator script.
   */
  constructor(genScript) {
    this.#genScript = genScript;
    this.#animate();
  }

  /**
   * Sets the harmonics visualizer.
   *
   * @param {Element} harm The harmonics node.
   */
  set harmonics(harm) {
    this.#harmonics = harm;
    if (harm) {
      harm.sampleRate = this.#audioCtx?.sampleRate ?? PRESUMED_SAMPLE_RATE;
      harm.buffer     = new Float32Array(FREQ_SIZE);
      harm.minValue   = MIN_DB;
      harm.maxValue   = MAX_DB;

      harm.buffer.fill(MIN_DB);
    }
  }

  /**
   * Sets the oscilloscope (waveform visualizer).
   *
   * @param {Element} osc The oscilloscope node.
   */
  set oscilloscope(osc) {
    this.#oscilloscope = osc;
    if (osc) {
      osc.sampleRate = this.#audioCtx?.sampleRate ?? PRESUMED_SAMPLE_RATE;
      // `FREQ_SIZE * 2` because that's what the `AnalyserNode` will provide.
      osc.buffer = new Float32Array(FREQ_SIZE * 2);
    }
  }

  /**
   * Toggles whether or not sound is playing.
   */
  async playPause() {
    if (!this.#audioCtx) {
      await this.#makeAudioContext();
    }

    const audioCtx = this.#audioCtx;

    if (this.#playing) {
      // Five-second fade down to silence, starting now. `1` means "one second,"
      // but it's an exponential constant. Technically, at five seconds, the
      // gain is 99.3% faded.
      this.#gainNode.gain.cancelScheduledValues(0);
      this.#gainNode.gain.setTargetAtTime(0, 0, 1);
      this.#gainNode.gain.setValueAtTime(0, audioCtx.currentTime + 5);
      this.#playing = false;
      setTimeout(() => {
        if (!this.#playing && (audioCtx.state === 'running')) {
          this.#audioCtx.suspend();
        }
      }, 5000);
    } else {
      // Ten-second fade up to full volume, starting now. (See above for
      // details.)
      this.#gainNode.gain.cancelScheduledValues(0);
      this.#gainNode.gain.setTargetAtTime(1, 0, 2);
      this.#gainNode.gain.setValueAtTime(1, audioCtx.currentTime + 10);
      this.#playing = true;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }
  }

  /**
   * Sends a name/value pair to the audio generator, via its message port. We do
   * this instead of using an `AudioParam` because (a) it's more efficient, (b)
   * we can send things other than numbers, and (c) it's way simpler to set up.
   *
   * @param {string} name The parameter name.
   * @param {*} value The parameter value.
   */
  sendGenerator(name, value) {
    const port = this.#generatorNode?.port;

    if (port) {
      port.postMessage({ name, value });
    } else {
      this.#pendingParameters.set(name, value);
    }
  }

  /**
   * Sets up rendering.
   */
  #animate() {
    const render = () => {
      requestAnimationFrame(render);

      const anNode  = this.#analyserNode;
      const running = this.#audioCtx?.state === 'running';

      if (!anNode) {
        return;
      }

      const osc = this.#oscilloscope;
      if (osc) {
        if (running) {
          anNode.getFloatTimeDomainData(osc.buffer);
        } else {
          osc.buffer.fill(0);
        }
        osc.renderForeground();
      }

      const harm = this.#harmonics;
      if (harm) {
        if (running) {
          anNode.getFloatFrequencyData(harm.buffer);
        } else {
          harm.buffer.fill(MIN_DB);
        }
        harm.renderForeground();
      }
    };

    requestAnimationFrame(render);
  }

  /**
   * Sets up the audio context.
   */
  async #makeAudioContext() {
    const audioCtx   = new AudioContext();
    const sampleRate = audioCtx.sampleRate;
    const genNode    = await this.#makeGeneratorNode(audioCtx);
    const gainNode   = new GainNode(audioCtx, { gain: 0 });
    const anNode     = new AnalyserNode(audioCtx, {
      fftSize:               FREQ_SIZE * 2,
      maxDecibels:           MAX_DB,
      minDecibels:           MIN_DB,
      smoothingTimeConstant: 0.1
    });

    await audioCtx.suspend();
    genNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    gainNode.connect(anNode);

    this.#audioCtx      = audioCtx;
    this.#generatorNode = genNode;
    this.#gainNode      = gainNode;
    this.#analyserNode  = anNode;

    if (this.#harmonics) {
      this.#harmonics.sampleRate = sampleRate;
    }

    if (this.#oscilloscope) {
      this.#oscilloscope.sampleRate = sampleRate;
    }

    for (const [name, value] of this.#pendingParameters) {
      this.sendGenerator(name, value);
    }
    this.#pendingParameters.clear();
  }

  /**
   * Sets up and returns the audio generator node, based on the {@link
   * #genScript}.
   *
   * @param {AudioContext} audioCtx The audio context.
   * @returns {AudioWorkletNode} The constructed and configured node.
   */
  async #makeGeneratorNode(audioCtx) {
    const simpleName = this.#genScript
      .replace(/^.*[/]/, '')
      .replace(/[.][^.]+$/, '');

    await audioCtx.audioWorklet.addModule(this.#genScript);

    return new AudioWorkletNode(audioCtx, simpleName);
  }
}
