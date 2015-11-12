/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";


/**
 * Filter generator, with adjustable center frequency and Q. What it filters
 * is white noise.
 *
 * This is an implementation of a two-pole IIR band-pass filter, as described
 * by Robert Bristow-Johnson in
 * <http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt>.
 */
class Piece {
    constructor(sampleRate) {
        // Base parameters

        // Sample rate (samples per second).
        this.sampleRate = sampleRate;

        // Input amplitude.
        this._inAmp = 1;

        // Center frequency.
        this._f0 = 440;

        // Q.
        this._q = 30.0;

        // Amplitude of the output.
        this._amp = 0.5;

        // Derived values

        // Previous two input samples. Subscripts are taken as negative
        // indices.
        this._x1 = 0;
        this._x2 = 0;

        // Previous two output samples. Subscripts are taken as negative
        // indices.
        this._y1 = 0;
        this._y2 = 0;

        // Coefficients for the filter. Named after what element they apply to.
        this._x0Co = 0;
        this._x1Co = 0;
        this._x2Co = 0;
        this._y1Co = 0;
        this._y2Co = 0;

        // Final setup.
        this.calcFilter();
    }

    set inAmp(value) {
        this._inAmp = value;
    }

    set amp(value) {
        this._amp = value;
    }

    set f0(value) {
        this._f0 = value;
        this.calcFilter();
    }

    set q(value) {
        if (value <= 0.0001) {
            value = 0.0001;
        }

        this._q = value;
        this.calcFilter();
    }

    // Calculate the filter parameters.
    calcFilter() {
        var w0 = 2 * Math.PI * this._f0 / this.sampleRate;
        var alpha = Math.sin(w0) / (this._q * 2);

        var b0 = this._q * alpha;
        var b1 = 0;
        var b2 = -this._q * alpha;
        var a0 = 1 + alpha;
        var a1 = -2 * Math.cos(w0);
        var a2 = 1 - alpha;

        this._x0Co = b0 / a0;
        this._x1Co = b1 / a0;
        this._x2Co = b2 / a0;
        this._y1Co = -a1 / a0;
        this._y2Co = -a2 / a0;
    }

    // Perform one iteration of generation, returning a single sample.
    nextSample() {
        var x1 = this._x1;
        var x2 = this._x2;
        var y1 = this._y1;
        var y2 = this._y2;

        var x0 = Math.random() * this._inAmp;  // Current input sample.
        var y0 = (this._x0Co * x0) + (this._x1Co * x1) + (this._x2Co * x2) +
            (this._y1Co * y1) + (this._y2Co * y2);

        this._x2 = this._x1;
        this._x1 = x0;
        this._y2 = this._y1;
        this._y1 = y0;;

        return Math.max(Math.min(y0 * this._amp, 1), -1);
    }
}
