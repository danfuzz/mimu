/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

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
  /**
     * Takes an `AudioContext` instance and the composition generator.
     */
  constructor(genScript) {
    /** Currently playing? */
    this._playing = false;

    /**
         * Current overall amplitude (volume). Adjusted when starting or
         * stopping playing.
         */
    this._amp = 0;

    /**
         * Current target amplitude. Used to do a smooth "fade" when starting
         * or stopping playing.
         */
    this._ampTarget = 0;

    /** Total time to be taken for a fade, in samples. */
    this._ampTotalTime = 0;

    /** Current time into a fade, in samples. */
    this._ampTime = 0;

    /** The name of the sound generator script. */
    this._genScript = genScript;

    /** The oscilloscope, if any. */
    this._oscilloscope = undefined;

    /** The harmonics graph, if any. */
    this._harmonics = undefined;

    /** The overall audio context instance. */
    this._audioCtx = undefined;

    /** Analyser node, for rendering harmonics. */
    this._analyserNode = undefined;

    /** Script processor node, set up to generate from the `gen`. */
    this._scriptNode = undefined;
  }

  /**
     * Sets the harmonics visualizer.
     */
  set harmonics(harm) {
    this._harmonics = harm;
    if (harm) {
      harm.sampleRate = this._audioCtx?.sampleRate ?? 0;
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
    this._oscilloscope = osc;
    if (osc) {
      osc.sampleRate = this._audioCtx?.sampleRate ?? 0;
      osc.buffer = new Float32Array(BUF_SIZE);
    }
  }

  /**
     * Toggles whether or not sound is playing.
     */
  async playPause() {
    await this._setUpIfNecessary();

    if (this._ampTotalTime !== 0) {
      // In the middle of a fade; turn it into a fast fade-down.
      this._startFade(0, 0.1);
    } else if (this._playing) {
      this._startFade(0, 5);
    } else {
      this._scriptNode.connect(this._audioCtx.destination);
      this._scriptNode.connect(this._analyserNode);
      this._playing = true;
      this._startFade(1, 0.25);
    }
  }

  /**
     * Sets up a new fade, starting at the current amp and hitting the
     * indicated target amp after the indicated time in seconds.
     */
  _startFade(target, time) {
    this._amp = this._nextAmp();
    this._ampTarget = target;
    this._ampTime = 0;
    this._ampTotalTime = time * this._audioCtx.sampleRate;
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
  _nextAmp() {
    if (this._ampTime >= this._ampTotalTime) {
      // We hit the time limit of the fade.
      this._amp = this._ampTarget;
      this._ampTime = 0;
      this._ampTotalTime = 0;
      return this._amp;
    } else {
      const ampDiff = this._ampTarget - this._amp;
      const ampTimeFrac = this._ampTime / this._ampTotalTime;
      this._ampTime++;
      return this._amp + ampDiff * Math.sin(ampTimeFrac * (Math.PI / 2));
    }
  }

  /**
     * Generates enough samples to fill the given buffer. Returns true if there
     * was anything but silence (silence defined as a full buffer at zero
     * amplitude).
     */
  _generateBuf(buf) {
    const bufSz = buf.length;
    const gen = this._gen;
    const amp = this._amp;

    if (this._ampTotalTime === 0) {
      // The easy case of steady amplitude.
      for (var i = 0; i < bufSz; i++) {
        buf[i] = gen.nextSample() * amp;
      }

      if (amp === 0) {
        // We just generated a buffer full of silence.
        return false;
      }
    } else {
      // We are amping up or down. See `_nextAmp()` for details.
      for (var i = 0; i < bufSz; i++) {
        buf[i] = gen.nextSample() * this._nextAmp();
      }
    }

    return true;
  }

  /**
     * Sets up and returns the analyser node.
     */
  _makeAnalyserNode() {
    const node = this._audioCtx.createAnalyser();
    node.fftSize = FREQ_SIZE * 2;
    node.smoothingTimeConstant = 0.1;

    this._analyserNode = node;
  }

  /**
     * Sets up the audio context.
     */
  _makeAudioContext() {
    const audioCtx = new AudioContext();

    const sampleRate = audioCtx.sampleRate;

    if (this._harmonics) {
      this._harmonics.sampleRate = sampleRate;
    }

    if (this._oscilloscope) {
      this._oscilloscope.sampleRate = sampleRate;
    }

    this._audioCtx = audioCtx;
  }

  /**
     * Sets up and returns the script processing node.
     */
  async _makeScriptNode() {
    const ctx = this._audioCtx;

    const simpleName = this._genScript
      .replace(/^.*[/]/, '')
      .replace(/[.][^.]+$/, '');

    await ctx.audioWorklet.addModule(this._genScript);
    const worklet = new AudioWorkletNode(ctx, simpleName);

    this._scriptNode = worklet;
    return;

    // OLD BITS FOLLOW.

    const outerThis = this; // Capture `this` for the callback.
    const sampleRate = this._audioCtx.sampleRate;

    // Construct a script processor node with no input channels and one
    // output channel.
    const node = this._audioCtx.createScriptProcessor(BUF_SIZE, 0, 1);

    // Set up for grabbing frequency data out of the analyser. We trigger
    // harmonics display from the `onaudioprocess` callback, below.
    const analyser = this._analyserNode;

    // Give the script node a function to process audio events.
    node.onaudioprocess = function (audioEvent) {
      const buf = audioEvent.outputBuffer.getChannelData(0);
      const genResult = outerThis._generateBuf(buf);

      if (!genResult) {
        // We just generated a buffer full of silence. This means
        // we just finished fading out. Kill the sound generation.
        outerThis._scriptNode.disconnect();
        outerThis._playing = false;
      }

      const osc = outerThis._oscilloscope;
      if (osc) {
        osc.buffer.set(buf);
        osc.renderForeground();
      }

      const harm = outerThis._harmonics;
      if (harm) {
        analyser.getFloatFrequencyData(harm.buffer);
        harm.renderForeground();
      }
    };

    return node;
  }

  async _setUpIfNecessary() {
    if (!this._audioCtx) {
      this._makeAudioContext();
      this._makeAnalyserNode();
      await this._makeScriptNode();
    }
  }
}
