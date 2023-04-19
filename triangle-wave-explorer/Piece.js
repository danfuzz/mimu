/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

import { AudioGenerator } from '../lib/AudioGenerator.js';

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
class Piece extends AudioGenerator {
    /**
     * Contructs an instance.
     */
    constructor(options) {
        super(options);

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
        this._upBias = 0.0;

        /** Positive bias. */
        this._posBias = 0.0;

        /** Amping bias. */
        this._ampBias = 0.0;

        // Derived parameters

        /**
         * How "fast" to index through a single cycle, given the current
         * note frequency and sample rate.
         */
        this._idxRate = 0;

        /**
         * Width of segment A. This is also the index at the start of segment
         * B (but we also include that separately for clarity).
         */
        this._widthA = 0;

        /** Width of segment B. */
        this._widthB = 0;

        /** Width of segment C. */
        this._widthC = 0;

        /** Width of segment D. */
        this._widthD = 0;

        /** Index at the start of segment B. */
        this._idxB = 0;

        /** Index at the start of segment C. */
        this._idxC = 0;

        /** Index at the start of segment D. */
        this._idxD = 0;

        // Continuous variables

        /**
         * Whether the derived parameters are in need of a refresh. We
         * service this at the start of each waveform cycle (upward
         * zero-crossing).
         */
        this._needCalc = true;

        /**
         * Current index into a single cycle of the waveform. Ranges from `0`
         * to `1`.
         */
        this._idx = 0;

        // Final setup.
        this._calcDerived();
    }

    /**
     * Sets the output amplitude.
     */
    set amp(value) {
        this._amp = value;
    }

    /**
     * Gets the output amplitude.
     */
    get amp() {
        return this._amp;
    }

    /**
     * Sets the note frequency.
     */
    set freq(freq) {
        this._freq = freq;
        this._needCalc = true;
    }

    /**
     * Gets the note frequency.
     */
    get freq() {
        return this._freq;
    }

    /**
     * Sets the upward bias.
     */
    set upBias(value) {
        this._upBias = value;
        this._needCalc = true;
    }

    /**
     * Gets the upward bias.
     */
    get upBias() {
        return this._upBias;
    }

    /**
     * Sets the positive bias.
     */
    set posBias(value) {
        this._posBias = value;
        this._needCalc = true;
    }

    /**
     * Gets the upward bias.
     */
    get posBias() {
        return this._posBias;
    }

    /**
     * Sets the amping bias.
     */
    set ampBias(value) {
        this._ampBias = value;
        this._needCalc = true;
    }

    /**
     * Gets the amping bias.
     */
    get ampBias() {
        return this._ampBias;
    }

    /**
     * Calculates all the derived parameters.
     */
    _calcDerived() {
        this._idxRate = this._freq / this._sampleRate;

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

        this._widthA = widthA;
        this._widthB = widthB;
        this._widthC = widthC;
        this._widthD = widthD;
        this._idxB = widthA;
        this._idxC = this._idxB + widthB;
        this._idxD = this._idxC + widthC;
    }

    /**
     * Performs one iteration of generation, returning a single sample.
     */
    _impl_nextSample() {
        var idx = this._idx;
        var samp = 0;

        // Produce a sum of `OVERSAMPLE` "subsamples." These are simply
        // averaged to produce the final sample. It's a naive technique, but
        // also efficient and good enough for the purpose here.
        for (var i = 0; i < OVERSAMPLE; i++) {
            if (idx < this._idxB) {
                // Ramp from `0` to `1`.
                samp += idx / this._widthA;
            } else if (idx < this._idxC) {
                // Ramp from `1` to `0`.
                samp += ((idx - this._idxB) / this._widthB) * -1 + 1;
            } else if (idx < this._idxD) {
                // Ramp from `0` to `-1`.
                samp += ((idx - this._idxC) / this._widthC) * -1;
            } else {
                // Ramp from `-1` to `0`.
                samp += ((idx - this._idxD) / this._widthD) - 1;
            }

            idx += this._idxRate;

            if (idx > 1) {
                idx %= 1;
                if (this._needCalc) {
                    this._calcDerived();
                    this._needCalc = false;
                }
            }
        }

        this._idx = idx;
        return samp / OVERSAMPLE * this._amp;
    }
}

registerProcessor("Piece", Piece);
