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

  /**
   * Current overall amplitude (volume). Adjusted when starting or
   * stopping playing.
   */
  #amp = 0;

  /**
   * Current target amplitude. Used to do a smooth "fade" when starting
   * or stopping playing.
   */
  #ampTarget = 0;

  /** Total time to be taken for a fade, in samples. */
  #ampTotalTime = 0;

  /** Current time into a fade, in samples. */
  #ampTime = 0;

  /** The name of the sound generator script. */
  #genScript = null;

  /** The oscilloscope, if any. */
  #oscilloscope = undefined;

  /** The harmonics graph, if any. */
  #harmonics = undefined;

  /** The overall audio context instance. */
  #audioCtx = undefined;

  /** Analyser node, for rendering harmonics. */
  #analyserNode = undefined;

  /** Script processor node, set up to generate from the `gen`. */
  #scriptNode = undefined;

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

    if (this.#ampTotalTime !== 0) {
      // In the middle of a fade; turn it into a fast fade-down.
      this.#startFade(0, 0.1);
    } else if (this.#playing) {
      this.#startFade(0, 5);
    } else {
      this.#scriptNode.connect(this.#audioCtx.destination);
      this.#scriptNode.connect(this.#analyserNode);
      this.#playing = true;
      this.#startFade(1, 0.25);
    }
  }

  /**
   * Sets up a new fade, starting at the current amp and hitting the
   * indicated target amp after the indicated time in seconds.
   */
  #startFade(target, time) {
    this.#amp = this.#nextAmp();
    this.#ampTarget = target;
    this.#ampTime = 0;
    this.#ampTotalTime = time * this.#audioCtx.sampleRate;
  }

  /**
   * Gets the current overall amp, taking fading parameters into account,
   * and advancing the time index into the fade. If we hit the end time of
   * the fade, then this will update the amp parameters to indicate that the
   * fade is complete.
   *
   * The overall fade effect consists of curving the amp from its initial
   * start point along the first quadrant of a sine wave, in order to hit the
   * indicated target amp at the indicated time.
   */
  #nextAmp() {
    if (this.#ampTime >= this.#ampTotalTime) {
      // We hit the time limit of the fade.
      this.#amp = this.#ampTarget;
      this.#ampTime = 0;
      this.#ampTotalTime = 0;
      return this.#amp;
    } else {
      const ampDiff = this.#ampTarget - this.#amp;
      const ampTimeFrac = this.#ampTime / this.#ampTotalTime;
      this.#ampTime++;
      return this.#amp + ampDiff * Math.sin(ampTimeFrac * (Math.PI / 2));
    }
  }

  /**
   * Generates enough samples to fill the given buffer. Returns true if there
   * was anything but silence (silence defined as a full buffer at zero
   * amplitude).
   */
  #generateBuf(buf) {
    const bufSz = buf.length;
    const gen = null /* was: this.#gen */;
    const amp = this.#amp;

    if (this.#ampTotalTime === 0) {
      // The easy case of steady amplitude.
      for (let i = 0; i < bufSz; i++) {
        buf[i] = gen.nextSample() * amp;
      }

      if (amp === 0) {
        // We just generated a buffer full of silence.
        return false;
      }
    } else {
      // We are amping up or down. See `_nextAmp()` for details.
      for (let i = 0; i < bufSz; i++) {
        buf[i] = gen.nextSample() * this.#nextAmp();
      }
    }

    return true;
  }

  /**
   * Sets up and returns the analyser node.
   */
  #makeAnalyserNode() {
    const node = this.#audioCtx.createAnalyser();
    node.fftSize = FREQ_SIZE * 2;
    node.smoothingTimeConstant = 0.1;

    this.#analyserNode = node;
  }

  /**
   * Sets up the audio context.
   */
  #makeAudioContext() {
    const audioCtx = new AudioContext();

    const sampleRate = audioCtx.sampleRate;

    if (this.#harmonics) {
      this.#harmonics.sampleRate = sampleRate;
    }

    if (this.#oscilloscope) {
      this.#oscilloscope.sampleRate = sampleRate;
    }

    this.#audioCtx = audioCtx;
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
    const worklet = new AudioWorkletNode(ctx, simpleName);

    this.#scriptNode = worklet;

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
      this.#makeAudioContext();
      this.#makeAnalyserNode();
      await this.#makeScriptNode();
    }
  }
}
