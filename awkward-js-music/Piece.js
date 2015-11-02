/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";

var PI = Math.PI;
var HALF_PI = PI / 2;
var TWO_PI = PI * 2;


// The musical piece per se.
class Piece {
    constructor(sampleRate) {
        // Sample rate (samples per second).
        this.sampleRate = sampleRate;

        // Decay rate of notes, in particular, the number of samples it takes
        // a note to reduce in volume by 10%. As defined, it is 0.1sec.
        this.decayRate = sampleRate / 10;

        // Wavelength of the primary note.
        this.wla = this.randomWl();

        // Wavelength of the secondary note.
        this.wlb = 0;

        // Index of (number of samples into) the current note-pair.
        this.idx = 0;

        // Duration (total number of samples) for the current note-pair.
        this.dur = 0;

        // Most recently-generated sample. Used for de-clicking.
        this.lastSamp = 0;

        // Whether we are currently de-clicking.
        this.declick = false;
    }

    // Pick a random wavelength within the harmonic confines of the piece.
    // The result is the number of samples in a single cycle of the note.
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
        return (this.sampleRate / 160) *
            Math.pow(0.8705506, Math.trunc(Math.random() * 10));
    }

    // Perform one iteration of generation, returning a single sample.
    nextSample() {
        if (this.declick) {
            // We're "de-clicking." This just means we gracefully (but promptly)
            // decay to near-0. De-click is over if the sample is close enough
            // to 0.

            var samp = this.lastSamp * 0.99;

            this.declick = (samp < -0.000001) || (samp > 0.000001);
            this.lastSamp = samp;
            return samp;
        }

        if (this.idx >= this.dur) {
            // We hit the duration of the current note-pair. Pick a new note,
            // and indicate we're now de-clicking.
            this.wlb = this.wla;
            this.wla = this.randomWl();

            if (this.wla === this.wlb) {
                // If we happen to pick the same note, instead go down an
                // octave.
                this.wla *= 2;
            }

            this.dur =
                Math.trunc((Math.random() * 10 + 5) * this.sampleRate / 4);
            this.idx = 0;
            this.declick = true;
            return this.lastSamp;
        }

        // See definition of `decayRate` above. We add a little bit so that
        // notes never fully decay; aesthetically, this prevents the occasional
        // jarring moment of total silence.
        var vol = Math.pow(0.9, this.idx / this.decayRate) * 0.95 + 0.05;

        var sa = Piece.waveform(TWO_PI * this.idx / this.wla) * 0.5;
        var sb = Piece.waveform(TWO_PI * this.idx / this.wlb) * 0.25;
        var samp = vol * (sa + sb);

        // This quantizes the sample, recreating the "shimmer" effect of the
        // original awk code.
        samp = Math.trunc(samp * 64) / 64;

        this.idx++;
        this.lastSamp = samp;
        return samp;
    }

    // Wave function. Same cycle as sine (2*PI). Doesn't expect to be given
    // negative angles.
    static waveform(angle) {
        return triangleWave(angle);

        // Reasonably interesting choices.

        function triangleWave(angle) {
            // `+ HALF_PI` makes it so that `triangle(0) == 0`.
            var x = (angle + HALF_PI) % TWO_PI;
            if (x < PI) {
                return (x / PI) * 2 - 1;
            } else {
                return -(((x - PI) / PI) * 2 - 1);
            }
        }

        function sineWave(angle) {
            return Math.sin(angle);
        }

        function squareWave(angle) {
            var x = angle % TWO_PI;
            return (x < PI) ? -1 : 1;
        }
    }
}
