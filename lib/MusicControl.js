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

        // Current target amplitude. Used to do a smooth "fade" when starting
        // or stopping playing.
        this.ampTarget = 0;

        // Total time to be taken for a fade, in samples.
        this.ampTotalTime = 0;

        // Current time into a fade, in samples.
        this.ampTime = 0;

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
        if (this.ampTotalTime != 0) {
            // In the middle of a fade; turn it into a fast fade-down.
            this.ampTarget = 0;
            this.ampTime = 0;
            this.ampTotalTime = 0.1 * this.audioCtx.sampleRate;
        } else if (this.playing) {
            this.ampTarget = 0;
            this.ampTime = 0;
            this.ampTotalTime = 5 * this.audioCtx.sampleRate;
        } else {
            this.scriptNode.connect(this.audioCtx.destination);
            this.scriptNode.connect(this.analyserNode);
            this.playing = true;
            this.ampTarget = 1;
            this.ampTime = 0;
            this.ampTotalTime = 0.25 * this.audioCtx.sampleRate;
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
            var ampTotalTime = outerThis.ampTotalTime;

            if (ampTotalTime == 0) {
                // The easy case of steady amplitude.
                for (var i = 0; i < bufSz; i++) {
                    buf[i] = gen.nextSample() * amp;
                }

                if (amp == 0) {
                    // We just generated a buffer full of silence. This means
                    // we just finished fading out. Kill the sound generation.
                    outerThis.scriptNode.disconnect();
                    outerThis.playing = false;
                }
            } else {
                // We are amping up or down. What we do is add to (or subtract
                // from) the base amp a point along the first quadrant of a
                // sine wave, scaled appropriately.
                var ampDiff = outerThis.ampTarget - amp;
                var ampTime = outerThis.ampTime;

                // Generate the samples, with incremental amp adjustment.
                var i;
                for (i = 0; (i < bufSz) && (ampTime < ampTotalTime); i++) {
                    var ampExtra = ampDiff *
                        Math.sin((ampTime / ampTotalTime) * (Math.PI / 2));
                    buf[i] = gen.nextSample() * (amp + ampExtra);
                    ampTime++;
                }

                // Store back the new time, for the next round.
                outerThis.ampTime = ampTime;

                if (ampTime == ampTotalTime) {
                    // We hit the end of the curve. Reset the fade values, and
                    // emit any remaining samples at the target amp.
                    amp = outerThis.ampTarget;
                    outerThis.amp = amp;
                    outerThis.ampTime = 0;
                    outerThis.ampTotalTime = 0;
                    outerThis.ampTarget = 0;
                    for (/*i*/; i < bufSz; i++) {
                        buf[i] = gen.nextSample() * amp;
                    }
                }
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
