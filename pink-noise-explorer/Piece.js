/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";


/**
 * Pink noise generator, with adjustable alpha.
 *
 * This code is based on the `PinkNoise` class by Sampo Niskane, at
 * <http://sampo.kapsi.fi/PinkNoise/>.
 *
 * The gaussian random function is based on the one found at
 * <http://blog.yjl.im/2010/09/simulating-normal-random-variable-using.html>.
 * That code is itself based on _A First Course of Probability_ by
 * Sheldon Ross (6th edition, page 464), and one can find other variants of
 * this code scattered around the net as well. See the Wikipedia page
 * <https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform> for a general
 * introduction to the technique used.
 */
class Piece {
    /**
     * Contructs an instance, given a `sampleRate` (in samples per second).
     */
    constructor(sampleRate) {
        // Base parameters

        /** Sample rate (samples per second). */
        this._sampleRate = sampleRate;

        /** Alpha. 1.0 is "normal" pink noise. */
        this._alpha = 1.0;

        /** Number of poles. */
        this._poles = 5;

        /**
         * Amplitude of the noise. This is only an approximation, in that
         * pink noise inherently has no real limit on range.
         */
        this._amp = 0.5;

        // Derived values

        /** Amp including adjustment multiplier for the given alpha. */
        this._ampAdjusted = 0;

        /** Multipliers for the IIR filter. One per pole. */
        this._multipliers = [];

        /** Circular history of recently-generated values. One per pole. */
        this._values = [];

        /** Notional start index of the `values` array. */
        this._at = 0;

        // Final setup.
        this.calcFilter();
        this.calcAmp();
    }

    /**
     * Sets the output amplitude.
     */
    set amp(value) {
        this._amp = value;
        this.calcAmp();
    }

    /**
     * Sets the alpha.
     */
    set alpha(value) {
        if (value < 0) {
            value = 0;
        } else if (value > 2) {
            value = 2;
        }

        this._alpha = value;
        this.calcFilter();
        this.calcAmp();
    }

    /**
     * Sets the count of poles.
     */
    set poles(value) {
        this._poles = value;
        this.calcFilter();
    }

    /**
     * Calculates derived parameters for amplitude. This formula was derived
     * empirically and is probably off.
     */
    calcAmp() {
        this._ampAdjusted = this._amp *
            (Math.log(1.05 + (2 - this._alpha)) / 4.5);
    }

    /**
     * Calculates the derived filter parameters, and initializes the `values`
     * array if not already done.
     */
    calcFilter() {
        var poles = this._poles;
        var alpha = this._alpha;

        this._multipliers = new Float64Array(poles);
        this._at = 0;

        var a = 1;
        for (var i = 0; i < poles; i++) {
            a = (i - (alpha / 2)) * a / (i + 1);
            this._multipliers[i] = a;
        }

        // Set up the historical `values` array, if this is the first time
        // `calcFilter()` is called *or* if the number of poles has changed.
        // Otherwise, we "let it ride" to avoid a discontinuity of the waveform.
        if (!(this._values && (this._values.length == poles))) {
            this._values = new Float64Array(poles);

            // Fill history with random values.
            for (var i = 0; i < (5 * poles); i++) {
                this.nextSample();
            }
        }
    }

    /**
     * Performs one iteration of generation, returning a single sample.
     */
    nextSample() {
        var poles = this._poles;
        var multipliers = this._multipliers;
        var values = this._values;
        var at = this._at;
        var x = Piece.randomGaussian();

        for (var i = 0; i < poles; i++) {
            x -= multipliers[i] * values[(at + i) % poles];
        }

        at = (at + poles + 1) % poles;
        values[at] = x;
        this._at = at;

        // Scale by the indicated amp. The additional `0.2` multiplier is to
        // get most samples to be in the range -1 to 1. After that, clamp to
        // the valid range -1 to 1.
        x *= this._ampAdjusted;

        return (x < -1) ? -1 : ((x > 1) ? 1 : x);
    }

    /**
     * Gets a gaussian-distribution random number using the "polar" method.
     */
    static randomGaussian() {
        // In a general implementation, these could be arguments.
        var mean = 0;
        var variance = 1;

        // This loop picks random candidate points until we find one that falls
        // within the unit circle. We explicitly avoid the center point
        // (unlikely though it may be), as it can't be scaled.
        var v1, v2, s;
        do {
            var v1 = (Math.random() * 2) - 1;  // Generate two uniform random...
            var v2 = (Math.random() * 2) - 1;  // ...numbers in the range -1..1.
            s = (v1 * v1) + (v2 * v2);         // Distance^2 from origin.
        } while ((s > 1) || (s === 0));

        var mult = Math.sqrt(variance) * Math.sqrt(-2 * Math.log(s) / s);
        var x = mean + (mult * v1);

        // If we want a second random value:
        // var y = mean + (mult * v2);

        return x;
    }
}
