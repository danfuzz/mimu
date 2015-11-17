/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";

define([], function() {

/**
 * Buffer size (in samples) to use when generating sound. The Web Audio API
 * requires this to be a power of two.
 */
var BUF_SIZE = 2048;

/**
 * Number of frequency bins to use in harmonic analysis. The Web Audio API
 * requires this to be a power of two.
 */
var FREQ_SIZE = 1024;

/**
 * Overall control of music / sound generation.
 */
class MusicControl {
    /**
     * Takes an `AudioContext` instance and the composition generator.
     */
    constructor(audioCtx, gen) {
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

        /** The overall audio context instance. */
        this._audioCtx = audioCtx;

        /** The sound generator. */
        this._gen = gen;

        /** The oscilloscope, if any. */
        this._oscilloscope = undefined;

        /** The harmonics graph, if any. */
        this._harmonics = undefined;

        /** Analyser node, for rendering harmonics. */
        this._analyserNode = this._makeAnalyserNode();

        /** Script processor node, set up to generate from the `gen`. */
        this._scriptNode = this._makeScriptNode();
    }

    /**
     * Sets the harmonics visualizer.
     */
    set harmonics(harm) {
        this._harmonics = harm;
        if (harm) {
            harm.sampleRate = this._audioCtx.sampleRate;
            harm.buffer = new Float32Array(FREQ_SIZE);
            harm.minValue = -90;
            harm.maxValue = -10;

            // Note: Ideally this would be `harm.buffer.fill(-90)`, however
            // `Float32Array.fill()` is not ubiquitously defined.
            var buf = harm.buffer;
            for (var i = 0; i < buf.length; i++) {
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
            osc.sampleRate = this._audioCtx.sampleRate;
            osc.buffer = new Float32Array(BUF_SIZE);
        }
    }

    /**
     * Toggles whether or not sound is playing.
     */
    playPause() {
        if (this._ampTotalTime != 0) {
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
            var ampDiff = this._ampTarget - this._amp;
            var ampTimeFrac = this._ampTime / this._ampTotalTime;
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
        var bufSz = buf.length;
        var gen = this._gen;
        var amp = this._amp;

        if (this._ampTotalTime == 0) {
            // The easy case of steady amplitude.
            for (var i = 0; i < bufSz; i++) {
                buf[i] = gen.nextSample() * amp;
            }

            if (amp == 0) {
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
        var node = this._audioCtx.createAnalyser();
        node.fftSize = FREQ_SIZE * 2;
        node.smoothingTimeConstant = 0.1;

        return node;
    }

    /**
     * Sets up and return the script processing node.
     */
    _makeScriptNode() {
        var outerThis = this; // Capture `this` for the callback.
        var sampleRate = this._audioCtx.sampleRate;

        // Construct a script processor node with no input channels and one
        // output channel.
        var node = this._audioCtx.createScriptProcessor(BUF_SIZE, 0, 1);

        // Set up for grabbing frequency data out of the analyser. We trigger
        // harmonics display from the `onaudioprocess` callback, below.
        var analyser = this._analyserNode;

        // Give the script node a function to process audio events.
        node.onaudioprocess = function(audioEvent) {
            var buf = audioEvent.outputBuffer.getChannelData(0);
            var genResult = outerThis._generateBuf(buf);

            if (!genResult) {
                // We just generated a buffer full of silence. This means
                // we just finished fading out. Kill the sound generation.
                outerThis._scriptNode.disconnect();
                outerThis._playing = false;
            }

            var osc = outerThis._oscilloscope;
            if (osc) {
                osc.buffer.set(buf);
                osc.render();
            }

            var harm = outerThis._harmonics;
            if (harm) {
                analyser.getFloatFrequencyData(harm.buffer);
                harm.render();
            }
        }

        return node;
    }
}

return MusicControl;
});
