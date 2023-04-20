// Copyright 2015-2023 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

/**
 * Buffer size (in samples) to use when generating sound. The Web Audio API
 * requires this to be a power of two.
 */
const BUF_SIZE = 2048;

/**
 * Number of frequency bins to use in harmonic analysis. The Web Audio API
 * requires this to be a power of two.
 */
const FREQ_SIZE = 1024;

/**
 * Overall control of music / sound generation.
 */
export class MusicControl {
  /** Currently playing? */
  #playing = false;

  /** The name of the sound generator script. */
  #genScript = null;

  /** The oscilloscope, if any. */
  #oscilloscope = null;

  /** The harmonics graph, if any. */
  #harmonics = null;

  /** The overall audio context instance. */
  #audioCtx = null;

  /** Gain node, for controlling output volume. */
  #gainNode = null;

  /** Analyser node, for rendering harmonics. */
  #analyserNode = null;

  /** Script processor node, set up to generate from the `gen`. */
  #scriptNode = null;

  /**
   * Takes an `AudioContext` instance and the composition generator.
   */
  constructor(genScript) {
    this.#genScript = genScript;
  }

  /**
   * Sets the harmonics visualizer.
   */
  set harmonics(harm) {
    this.#harmonics = harm;
    if (harm) {
      harm.sampleRate = this.#audioCtx?.sampleRate ?? 0;
      harm.buffer = new Float32Array(FREQ_SIZE);
      harm.minValue = -90;
      harm.maxValue = -10;

      // Note: Ideally this would be `harm.buffer.fill(-90)`, however
      // `Float32Array.fill()` is not ubiquitously defined.
      const buf = harm.buffer;
      for (let i = 0; i < buf.length; i++) {
        buf[i] = -90;
      }
    }
  }

  /**
   * Sets the oscilloscope (waveform visualizer).
   */
  set oscilloscope(osc) {
    this.#oscilloscope = osc;
    if (osc) {
      osc.sampleRate = this.#audioCtx?.sampleRate ?? 0;
      osc.buffer = new Float32Array(BUF_SIZE);
    }
  }

  /**
   * Toggles whether or not sound is playing.
   */
  async playPause() {
    await this.#setUpIfNecessary();

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
   * Sets up and returns the analyser node.
   */
  #makeAnalyserNode() {
    const node = this.#audioCtx.createAnalyser();
    node.fftSize = FREQ_SIZE * 2;
    node.smoothingTimeConstant = 0.1;

    this.#gainNode.connect(node);

    this.#analyserNode = node;
  }

  /**
   * Sets up the audio context.
   */
  async #makeAudioContext() {
    const audioCtx   = new AudioContext();
    const sampleRate = audioCtx.sampleRate;
    const gainNode   = new GainNode(audioCtx, { gain: 0 });

    await audioCtx.suspend();
    gainNode.connect(audioCtx.destination);

    this.#audioCtx = audioCtx;
    this.#gainNode = gainNode;

    if (this.#harmonics) {
      this.#harmonics.sampleRate = sampleRate;
    }

    if (this.#oscilloscope) {
      this.#oscilloscope.sampleRate = sampleRate;
    }
  }

  /**
   * Sets up and returns the script processing node.
   */
  async #makeScriptNode() {
    const ctx = this.#audioCtx;

    const simpleName = this.#genScript
      .replace(/^.*[/]/, '')
      .replace(/[.][^.]+$/, '');

    await ctx.audioWorklet.addModule(this.#genScript);
    const node = new AudioWorkletNode(ctx, simpleName);

    node.connect(this.#gainNode);

    this.#scriptNode = node;

    // OLD BITS FOLLOW.

    /*
    const outerThis = this; // Capture `this` for the callback.
    const sampleRate = this.#audioCtx.sampleRate;

    // Construct a script processor node with no input channels and one
    // output channel.
    const node = this.#audioCtx.createScriptProcessor(BUF_SIZE, 0, 1);

    // Set up for grabbing frequency data out of the analyser. We trigger
    // harmonics display from the `onaudioprocess` callback, below.
    const analyser = this.#analyserNode;

    // Give the script node a function to process audio events.
    node.onaudioprocess = function (audioEvent) {
      const buf = audioEvent.outputBuffer.getChannelData(0);
      const genResult = outerThis.#generateBuf(buf);

      if (!genResult) {
        // We just generated a buffer full of silence. This means
        // we just finished fading out. Kill the sound generation.
        outerThis.#scriptNode.disconnect();
        outerThis.#playing = false;
      }

      const osc = outerThis.#oscilloscope;
      if (osc) {
        osc.buffer.set(buf);
        osc.renderForeground();
      }

      const harm = outerThis.#harmonics;
      if (harm) {
        analyser.getFloatFrequencyData(harm.buffer);
        harm.renderForeground();
      }
    };

    return node;
    */
  }

  async #setUpIfNecessary() {
    if (!this.#audioCtx) {
      await this.#makeAudioContext();
      this.#makeAnalyserNode();
      await this.#makeScriptNode();
    }
  }
}
