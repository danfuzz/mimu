/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";

/**
 * The AWK Music composition.
 */
class Piece {
    /**
     * Contructs an instance, given a `sampleRate` (in samples per second).
     */
    constructor(sampleRate) {
        /** Sample rate (samples per second). */
        this._sampleRate = sampleRate;

        /**
         * Decay rate of notes, in particular, the number of samples it takes
         * a note to reduce in volume by 10%. As defined, it is 0.1sec.
         */
        this._decayRate = sampleRate / 10;

        /** Wavelength of the primary note. */
        this._wla = this.randomWl();

        /** Wavelength of the secondary note. */
        this._wlb = 0;

        /** Index of (number of samples into) the current note-pair. */
        this._idx = 0;

        /** Duration (total number of samples) for the current note-pair. */
        this._dur = 0;

        /** Most recently-generated sample. Used for de-clicking. */
        this._lastSamp = 0;

        /** Whether we are currently de-clicking. */
        this._declick = false;
    }

    /**
     * Picks a random wavelength within the harmonic confines of the piece.
     * The result is the number of samples in a single cycle of the note.
     */
    randomWl() {
        // What do all those numbers mean?
        //
        // `160` below sets the base (lowest) note to be 160Hz, which is
        // close to E3 (the E below Middle C).
        //
        // `0.8705506` is the fifth root of 1/2, which means that the notes are
        // all on an equal-tempered pentatonic scale, which is not the usual
        // scale in Western music but nonetheless lends itself to
        // pleasing-to-humans results.
        //
        // `10` is the number of choices of note. That is, we pick amongst
        // the notes of two octaves.
        return (this._sampleRate / 160) *
            Math.pow(0.8705506, Math.trunc(Math.random() * 10));
    }

    /**
     * Performs one iteration of generation, returning a single sample.
     */
    nextSample() {
        if (this._declick) {
            // We're "de-clicking." This just means we gracefully (but promptly)
            // decay to near-0. De-click is over if the sample is close enough
            // to 0.

            var samp = this._lastSamp * 0.99;

            this._declick = (samp < -0.000001) || (samp > 0.000001);
            this._lastSamp = samp;
            return samp;
        }

        if (this._idx >= this._dur) {
            // We hit the duration of the current note-pair. Pick a new note,
            // and indicate we're now de-clicking.
            this._wlb = this._wla;
            this._wla = this.randomWl();

            if (this._wla === this._wlb) {
                // If we happen to pick the same note, instead go down an
                // octave.
                this._wla *= 2;
            }

            this._dur =
                Math.trunc((Math.random() * 10 + 5) * this._sampleRate / 4);
            this._idx = 0;
            this._declick = true;
            return this._lastSamp;
        }

        // See definition of `decayRate` above. We add a little bit so that
        // notes never fully decay; aesthetically, this prevents the occasional
        // jarring moment of total silence.
        var vol = Math.pow(0.9, this._idx / this._decayRate) * 0.95 + 0.05;

        var sa = Piece.waveform(this._idx / this._wla) * 0.5;
        var sb = Piece.waveform(this._idx / this._wlb) * 0.25;
        var samp = vol * (sa + sb);

        // This quantizes the sample, recreating the "shimmer" effect of the
        // original awk code.
        samp = Math.trunc(samp * 64) / 64;

        this._idx++;
        this._lastSamp = samp;
        return samp;
    }

    /**
     * Given a non-negative index into the cycle, returns a value for the
     * wave function. Cycle time is 1.
     */
    static waveform(n) {
        return triangleWave(n);
        // return sineWave(n);
        // return squareWave(n);

        // Reasonably interesting choices.

        function triangleWave(n) {
            // `+ 0.25` makes it so that `triangle(0) == 0`.
            var x = (n + 0.25) % 1;
            if (x < 0.5) {
                return (x * 4) - 1;
            } else {
                x -= 0.5;
                return 1 - (x * 4);
            }
        }

        function sineWave(n) {
            return Math.sin(n * (Math.PI * 2));
        }

        function squareWave(n) {
            var x = n % 1;
            return (x < 0.5) ? -1 : 1;
        }
    }
}
