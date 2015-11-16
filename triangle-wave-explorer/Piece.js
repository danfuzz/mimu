/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";

/**
 * How many "subsamples" to produce per actual sample output. This is done
 * in order to reduce aliasing artifacts.
 */
var OVERSAMPLE = 4;

/**
 * Parametric triangle(esque) wave. This represents a wave as four segments,
 * labeled A through D in order:
 *
 * * A &mdash; Linear rise from 0 to 1.
 * * B &mdash; Linear drop from 1 to 0.
 * * C &mdash; Linear drop from 0 to -1.
 * * D &mdash; Linear rise from -1 to 0.
 *
 * Three parameters control how much of a single cycle is taken by each of
 * these segment. Rather than make these parameters simply be a relative
 * width of each segment, the parameters are chosen such that each one
 * represents a particular element of symmetry within the wave. Each parameter
 * is a "bias," ranging from -1 to 1, which breaks a symmetry given any value
 * other than 0.  Modifying one parameter only affects that one symmetry,
 * leaving the other two unchanged. The three symmetries / biases are:
 *
 * * upward bias &mdash; Balance between upward-sloping and downward-sloping
 *   portions of a wave. `0` means upward and downward slopes are equal. `-1`
 *   means *downward slope totally dominates. `1` means that upward slope
 *   totally dominates.
 * * positive bias &mdash; Balance between positive-value and negative-value
 *   portions of a wave. `0` means positive and negative values are equally
 *   represented. `-1` means negative values totally dominate. `1` means
 *   that positive values totally dominate.
 * * amping bias &mdash; Balance between directional movement away from
 *   (amping) and toward zero (de-amping) in a wave. `0` means both directions
 *   of movement are equally represented. `-1` means movement towards zero
 *   totally dominates. `1` means that movement away from zero totally
 *   dominates.
 */
class Piece {
    /**
     * Contructs an instance, given a `sampleRate` (in samples per second).
     */
    constructor(sampleRate) {
        // Base parameters

        /** Sample rate (samples per second). */
        this._sampleRate = sampleRate * OVERSAMPLE;

        /**
         * Frequency of the note (Hz, that is, cycles per second). 440 is
         * Middle A.
         */
        this._freq = 440.0;

        /** Output amplitude. */
        this._amp = 0.75;

        /** Upward bias. */
        this._upBias = 0.005;

        /** Positive bias. */
        this._posBias = 0.0;

        /** Amping bias. */
        this._ampBias = 0.0;

        // Derived parameters

        /**
         * How "fast" to index through a single cycle, given the current
         * note frequency and sample rate.
         */
        this.idxRate = 0;

        /**
         * Width of segment A. This is also the index at the start of segment
         * B (but we also include that separately for clarity).
         */
        this.widthA = 0;

        /** Width of segment B. */
        this.widthB = 0;

        /** Width of segment C. */
        this.widthC = 0;

        /** Width of segment D. */
        this.widthD = 0;

        /** Index at the start of segment B. */
        this.idxB = 0;

        /** Index at the start of segment C. */
        this.idxC = 0;

        /** Index at the start of segment D. */
        this.idxD = 0;

        // Continuous variables

        /**
         * Whether the derived parameters are in need of a refresh. We
         * service this at the start of each waveform cycle (upward
         * zero-crossing).
         */
        this.needCalc = true;

        /**
         * Current index into a single cycle of the waveform. Ranges from `0`
         * to `1`.
         */
        this.idx = 0;

        // Final setup.
        this.calcDerived();
    }

    /**
     * Sets the output amplitude.
     */
    set amp(value) {
        this._amp = value;
    }

    /**
     * Sets note frequency.
     */
    set freq(freq) {
        this._freq = freq;
        this.needCalc = true;
    }

    /**
     * Sets the upward bias.
     */
    set upBias(value) {
        this._upBias = value;
        this.needCalc = true;
    }

    /**
     * Sets the positive bias.
     */
    set posBias(value) {
        this._posBias = value;
        this.needCalc = true;
    }

    /**
     * Sets the amping bias.
     */
    set ampBias(value) {
        this._ampBias = value;
        this.needCalc = true;
    }

    /**
     * Calculates all the derived parameters.
     */
    calcDerived() {
        this.idxRate = this._freq / this._sampleRate;

        // Clamp the biases to prevent NaN results at the extremes.
        if      (this._upBias  < -0.999) { this._upBias  = -0.999; }
        else if (this._upBias  >  0.999) { this._upBias  =  0.999; }
        if      (this._posBias < -0.999) { this._posBias = -0.999; }
        else if (this._posBias >  0.999) { this._posBias =  0.999; }
        if      (this._ampBias < -0.999) { this._ampBias = -0.999; }
        else if (this._ampBias >  0.999) { this._ampBias =  0.999; }

        // Start with even segment sizes, and then apply each bias.
        var widthA = 1;
        var widthB = 1;
        var widthC = 1;
        var widthD = 1;

        widthA *= this._upBias + 1;
        widthB *= 1 - this._upBias;
        widthC *= 1 - this._upBias;
        widthD *= this._upBias + 1;

        widthA *= this._posBias + 1;
        widthB *= this._posBias + 1;
        widthC *= 1 - this._posBias;
        widthD *= 1 - this._posBias;

        widthA *= this._ampBias + 1;
        widthB *= 1 - this._ampBias;
        widthC *= this._ampBias + 1;
        widthD *= 1 - this._ampBias;

        // Scale the widths so that the total is 1. Note that we can't just
        // start with segment sizes of 0.25 each and *not* perform a correction
        // like this, because errors can build up during the math above which
        // would make the total width be something other than 1.
        for (;;) {
            var widthScale = 1 / (widthA + widthB + widthC + widthD);
            widthA *= widthScale;
            widthB *= widthScale;
            widthC *= widthScale;
            widthD *= widthScale;

            // If any width is under 0.005, clamp it. This prevents us from
            // ever eliding over a zero crossing, making for a little bit
            // nicer display.
            if (widthA < 0.005) { widthA = 0.005; continue; }
            if (widthB < 0.005) { widthB = 0.005; continue; }
            if (widthC < 0.005) { widthC = 0.005; continue; }
            if (widthD < 0.005) { widthD = 0.005; continue; }
            break;
        }

        this.widthA = widthA;
        this.widthB = widthB;
        this.widthC = widthC;
        this.widthD = widthD;
        this.idxB = widthA;
        this.idxC = this.idxB + widthB;
        this.idxD = this.idxC + widthC;
    }

    /**
     * Performs one iteration of generation, returning a single sample.
     */
    nextSample() {
        var idx = this.idx;
        var samp = 0;

        // Produce a sum of `OVERSAMPLE` "subsamples." These are simply
        // averaged to produce the final sample. It's a naive technique, but
        // also efficient and good enough for the purpose here.
        for (var i = 0; i < OVERSAMPLE; i++) {
            if (idx < this.idxB) {
                // Ramp from `0` to `1`.
                samp += idx / this.widthA;
            } else if (idx < this.idxC) {
                // Ramp from `1` to `0`.
                samp += ((idx - this.idxB) / this.widthB) * -1 + 1;
            } else if (idx < this.idxD) {
                // Ramp from `0` to `-1`.
                samp += ((idx - this.idxC) / this.widthC) * -1;
            } else {
                // Ramp from `-1` to `0`.
                samp += ((idx - this.idxD) / this.widthD) - 1;
            }

            idx += this.idxRate;

            if (idx > 1) {
                idx %= 1;
                if (this.needCalc) {
                    this.calcDerived();
                    this.needCalc = false;
                }
            }
        }

        this.idx = idx;
        return samp / OVERSAMPLE * this._amp;
    }
}
