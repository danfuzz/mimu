/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";

// Buffer size (in samples) to use when generating sound. The Web Audio API
// requires this to be a power of two.
var BUF_SIZE = 2048;

// Number of frequency bins to use in harmonic analysis. The Web Audio API
// requires this to be a power of two.
var FREQ_SIZE = 1024;

// Overall control of music generation.
class MusicControl {
    // Takes an `AudioContext` instance. `gen` is the composition generator.
    constructor(audioCtx, gen) {
        // Currently playing?
        this.playing = false;

        // Current overall amplitude (volume). Adjusted when starting or
        // stopping playing.
        this.amp = 0;

        // Current multiplier for amplitude adjustment, in change per second.
        this.ampMult = 1;

        // The overall audio context instance.
        this.audioCtx = audioCtx;

        // The oscilloscope, if any.
        this._oscilloscope = undefined;

        // The harmonics graph, if any.
        this._harmonics = undefined;

        // Analyser node, for rendering harmonics.
        this.analyserNode = this.makeAnalyserNode();

        // Script processor node, set up to generate from the `gen`.
        this.scriptNode = this.makeScriptNode(gen);
    }

    set harmonics(harm) {
        this._harmonics = harm;
        if (harm) {
            harm.sampleRate = this.audioCtx.sampleRate;
            harm.frequencyBinCount = FREQ_SIZE;
        }
    }

    set oscilloscope(osc) {
        this._oscilloscope = osc;
        if (osc) {
            osc.sampleRate = this.audioCtx.sampleRate;
            osc.bufferSize = BUF_SIZE;
        }
    }

    // Toggle playingness.
    playPause() {
        if (this.playing) {
            this.ampMult = (this.ampMult >= 1) ? 0.1 : 20;
        } else {
            this.scriptNode.connect(this.audioCtx.destination);
            this.scriptNode.connect(this.analyserNode);
            this.playing = true;
            this.ampMult = 20;
        }
    }

    // Set up and return the analyser node.
    makeAnalyserNode() {
        var node = this.audioCtx.createAnalyser();
        node.fftSize = FREQ_SIZE * 2;
        node.maxDecibels = -10;
        node.smoothingTimeConstant = 0.1;

        return node;
    }

    // Set up and return the script processing node.
    makeScriptNode(gen) {
        var outerThis = this; // Capture `this` for the callback.
        var sampleRate = this.audioCtx.sampleRate;

        // Construct a script processor node with no input channels and one
        // output channel.
        var node = this.audioCtx.createScriptProcessor(BUF_SIZE, 0, 1);

        // Set up for grabbing frequency data out of the analyser. We trigger
        // harmonics display from the `onaudioprocess` callback, below.
        var analyser = this.analyserNode;
        var freqBuf = new Uint8Array(FREQ_SIZE);

        // Give the script node a function to process audio events.
        node.onaudioprocess = function(audioEvent) {
            var buf = audioEvent.outputBuffer.getChannelData(0);
            var bufSz = buf.length;
            var amp = outerThis.amp;
            var ampMult = outerThis.ampMult;

            if (ampMult == 0) {
                // The easy case of steady amplitude.
                for (var i = 0; i < bufSz; i++) {
                    buf[i] = gen.nextSample() * amp;
                }
            } else {
                // We are amping up or down. Scale `ampMult` so it is in terms
                // of mult per sample instead of per second.
                ampMult = Math.pow(ampMult, 1 / sampleRate);

                if ((ampMult > 1) && (amp <= 0)) {
                    // We're fading up, so ensure that we're multiplying up
                    // a non-zero number.
                    amp = 0.05;
                }

                // Generate the samples, while adjusting amplitude.
                for (var i = 0; i < bufSz; i++) {
                    buf[i] = gen.nextSample() * amp;
                    amp *= ampMult;
                }

                // Store back the new amplitude, and detect when we've hit a
                // limit of fading up or down.
                if (amp >= 1) {
                    amp = 1;
                    outerThis.ampMult = 1;
                } else if (amp <= 0.001) {
                    // We have just faded to silence. Kill the sound generation.
                    amp = 0;
                    outerThis.ampMult = 1;
                    outerThis.scriptNode.disconnect();
                    outerThis.playing = false;
                }
                outerThis.amp = amp;
            }

            var osc = outerThis._oscilloscope;
            if (osc) {
                osc.render(buf);
            }

            var harm = outerThis._harmonics;
            if (harm) {
                analyser.getByteFrequencyData(freqBuf);
                harm.render(freqBuf);
            }
        }

        return node;
    }
}
