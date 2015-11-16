/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";


/**
 * Filter generator, with adjustable type, center frequency, and Q. What it
 * filters is adjustable-amplitude white noise.
 *
 * The filters implemented herein are two-pole IIR filters, as described by
 * Robert Bristow-Johnson in
 * <http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt>.
 */
class Piece {
    /**
     * Contructs an instance, given a `sampleRate` (in samples per second).
     */
    constructor(sampleRate) {
        // Base parameters

        /** Sample rate (samples per second). */
        this._sampleRate = sampleRate;

        /** Input amplitude. */
        this._inAmp = 1;

        /**
         * Filter type. Must be one of:
         * `"low-pass" "high-pass" "band-pass" "notch"`
         */
        this._filterType = "band-pass";

        /** Center frequency. */
        this._f0 = 440;

        /** Q (filter quality). */
        this._q = 10.0;

        /** Amplitude of the output. */
        this._amp = 0.5;

        // Derived values

        /**
         * Previous input sample. (Subscripts are taken as negative indices.)
         */
        this._x1 = 0;

        /** Second-previous input sample. */
        this._x2 = 0;

        /** Previous output sample. */
        this._y1 = 0;

        /** Second-previous output sample. */
        this._y2 = 0;

        /** Filter coefficient applied to `x0`. */
        this._x0Co = 0;

        /** Filter coefficient applied to `x1`. */
        this._x1Co = 0;

        /** Filter coefficient applied to `x2`. */
        this._x2Co = 0;

        /** Filter coefficient applied to `y1`. */
        this._y1Co = 0;

        /** Filter coefficient applied to `y2`. */
        this._y2Co = 0;

        // Final setup.
        this._calcFilter();
    }

    /**
     * Sets the input amplitude.
     */
    set inAmp(value) {
        this._inAmp = value;
    }

    /**
     * Sets the output amplitude.
     */
    set amp(value) {
        this._amp = value;
    }

    /**
     * Sets the filter type.
     */
    set filterType(value) {
        switch (value) {
            case "low-pass":
            case "high-pass":
            case "band-pass":
            case "notch": {
                // These are okay.
                break;
            }
            default: {
                value = "low-pass";
            }
        }

        this._filterType = value;
        this._calcFilter();
    }

    /**
     * Sets the center frequency.
     */
    set f0(value) {
        this._f0 = value;
        this._calcFilter();
    }

    /**
     * Sets Q (the filter quality).
     */
    set q(value) {
        if (value <= 0.0001) {
            value = 0.0001;
        }

        this._q = value;
        this._calcFilter();
    }

    /**
     * Calculates the derived filter parameters.
     */
    _calcFilter() {
        var w0 = 2 * Math.PI * this._f0 / this._sampleRate;
        var alpha = Math.sin(w0) / (this._q * 2);
        var cosW0 = Math.cos(w0);
        var b0, b1, b2, a0, a1, a2;

        switch (this._filterType) {
            case "low-pass": {
                b0 = (1 - cosW0) / 2;
                b1 = 1 - cosW0;
                b2 = (1 - cosW0) / 2;
                a0 = 1 + alpha;
                a1 = -2 * cosW0;
                a2 = 1 - alpha;
                break;
            }
            case "high-pass": {
                b0 = (1 + cosW0) / 2;
                b1 = -(1 + cosW0);
                b2 = (1 + cosW0) / 2;
                a0 = 1 + alpha;
                a1 = -2 * cosW0;
                a2 = 1 - alpha;
                break;
            }
            case "band-pass": {
                // This is the "peak gain = Q" BPF variant from the Audio EQ
                // Cookbook.
                b0 = this._q * alpha;
                b1 = 0;
                b2 = -this._q * alpha;
                a0 = 1 + alpha;
                a1 = -2 * cosW0;
                a2 = 1 - alpha;
                break;
            }
            case "notch": {
                b0 = 1;
                b1 = -2 * cosW0;
                b2 = 1;
                a0 = 1 + alpha;
                a1 = -2 * cosW0;
                a2 = 1 - alpha;
                break;
            }
            default: {
                // Unknown filter type.
                b0 = b1 = b2 = a0 = a1 = a2 = 0;
                break;
            }
        }

        this._x0Co = b0 / a0;
        this._x1Co = b1 / a0;
        this._x2Co = b2 / a0;
        this._y1Co = -a1 / a0;
        this._y2Co = -a2 / a0;
    }

    /**
     * Performs one iteration of generation, returning a single sample.
     */
    nextSample() {
        var x1 = this._x1;
        var x2 = this._x2;
        var y1 = this._y1;
        var y2 = this._y2;

        var x0 = ((Math.random() * 2) - 1) * this._inAmp;  // Input sample.
        var y0 = (this._x0Co * x0) + (this._x1Co * x1) + (this._x2Co * x2) +
            (this._y1Co * y1) + (this._y2Co * y2);

        this._x2 = this._x1;
        this._x1 = x0;
        this._y2 = this._y1;
        this._y1 = y0;;

        return Math.max(Math.min(y0 * this._amp, 1), -1);
    }
}
