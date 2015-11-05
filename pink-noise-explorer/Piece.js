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
 * <http://sampo.kapsi.fi/PinkNoise/> and the gaussian random function
 * found at <http://blog.yjl.im/2010/09/simulating-normal-random-variable-using.html>.
 * The gaussian code is itself based on _A First Course of Probability_ by
 * Sheldon Ross (6th edition, page 464), and one can find other variants of
 * this code scattered around the net as well.
 */
class Piece {
    constructor(sampleRate) {
        // Base parameters

        // Sample rate (samples per second).
        this.sampleRate = sampleRate;

        // Alpha.
        this._alpha = 1.0;  // "Normal" pink noise.

        // Number of poles.
        this._poles = 5;

        // Amplitude of the noise. This is only an approximation, in that
        // pink noise inherently has no real limit on range.
        this._amp = 0.5;

        // Derived values

        // Amp including adjustment multiplier for the given alpha.
        this._ampAdjusted = 0;

        // Multipliers for the IIR filter. One per pole.
        this._multipliers = [];

        // Circular history of recently-generated values. One per pole.
        this._values = [];

        // Notional start index of the `values` array.
        this._at = 0;

        // Final setup.
        this.calcFilter();
        this.calcAmp();
    }

    set amp(value) {
        this._amp = value;
        this.calcAmp();
    }

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

    set poles(value) {
        this._poles = value;
        this.calcFilter();
    }

    // Calculate adjusted amp. This formula was derived empirically and is
    // probably off.
    calcAmp() {
        this._ampAdjusted = this._amp *
            (Math.log(1.05 + (2 - this._alpha)) / 4.5);
    }

    // Calculate the filter parameters, and initialize the `values` array.
    calcFilter() {
        var poles = this._poles;
        var alpha = this._alpha;

        this._multipliers = new Float64Array(poles);
        this._values = new Float64Array(poles);
        this._at = 0;

        var a = 1;
        for (var i = 0; i < poles; i++) {
            a = (i - (alpha / 2)) * a / (i + 1);
            this._multipliers[i] = a;
        }

        // Fill history with random values.
        for (var i = 0; i < (5 * poles); i++) {
            this.nextSample();
        }
    }

    // Perform one iteration of generation, returning a single sample.
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

    // Get a gaussian-distribution random number using the "polar" method.
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
