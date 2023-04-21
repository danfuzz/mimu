// Copyright 2015-2023 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

import { AudioGenerator } from '../lib/AudioGenerator.js';
import { PieceParams } from './PieceParams.js';

/**
 * How many "subsamples" to produce per actual sample output. This is done
 * in order to reduce aliasing artifacts.
 */
const OVERSAMPLE = 4;

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
  /** Sample rate (samples per second). */
  #sampleRate = sampleRate * OVERSAMPLE;

  /**
   * Frequency of the note (Hz, that is, cycles per second). 440 is
   * Middle A.
   */
  #freq;

  /** Output amplitude. */
  #amp;

  /** Upward bias. */
  #upBias;

  /** Positive bias. */
  #posBias;

  /** Amping bias. */
  #ampBias;

  // Derived parameters

  /**
   * How "fast" to index through a single cycle, given the current
   * note frequency and sample rate.
   */
  #idxRate = 0;

  /**
   * Width of segment A. This is also the index at the start of segment
   * B (but we also include that separately for clarity).
   */
  #widthA = 0;

  /** Width of segment B. */
  #widthB = 0;

  /** Width of segment C. */
  #widthC = 0;

  /** Width of segment D. */
  #widthD = 0;

  /** Index at the start of segment B. */
  #idxB = 0;

  /** Index at the start of segment C. */
  #idxC = 0;

  /** Index at the start of segment D. */
  #idxD = 0;

  // Continuous variables

  /**
   * Whether the derived parameters are in need of a refresh. We
   * service this at the start of each waveform cycle (upward
   * zero-crossing).
   */
  #needCalc = true;

  /**
   * Current index into a single cycle of the waveform. Ranges from `0`
   * to `1`.
   */
  #idx = 0;

  /**
   * Contructs an instance.
   *
   * @param {object} options Options, as defined by the `AudioWorkletProcessor`
   *   API.
   */
  constructor(options) {
    super(options);

    for (const [key, value] of Object.entries(PieceParams.PARAMS)) {
      this[key] = value;
    }

    this.#calcDerived();
  }

  /** @returns {number} The output amplitude. */
  get amp() {
    return this.#amp;
  }

  /**
   * Sets the output amplitude.
   *
   * @param {number} value The output amplitude.
   */
  set amp(value) {
    this.#amp = value;
  }

  /** @returns {number} The amping bias. */
  get ampBias() {
    return this.#ampBias;
  }

  /**
   * Sets the amping bias.
   *
   * @param {number} value The amping bias.
   */
  set ampBias(value) {
    this.#ampBias = value;
    this.#needCalc = true;
  }

  /** @returns {number} The note frequency, in Hz. */
  get freq() {
    return this.#freq;
  }

  /**
   * Sets the note frequency.
   *
   * @param {number} freq The note frequency, in Hz.
   */
  set freq(freq) {
    this.#freq = freq;
    this.#needCalc = true;
  }

  /** @returns {number} The positive bias. */
  get posBias() {
    return this.#posBias;
  }

  /**
   * Sets the positive bias.
   *
   * @param {number} value The positive bias.
   */
  set posBias(value) {
    this.#posBias = value;
    this.#needCalc = true;
  }

  /** @returns {number} The upward bias. */
  get upBias() {
    return this.#upBias;
  }

  /**
   * Sets the upward bias.
   *
   * @param {number} value The upward bias.
   */
  set upBias(value) {
    this.#upBias = value;
    this.#needCalc = true;
  }

  /** @override */
  _impl_nextSample() {
    let idx = this.#idx;
    let samp = 0;

    // Produce a sum of `OVERSAMPLE` "subsamples." These are simply
    // averaged to produce the final sample. It's a naive technique, but
    // also efficient and good enough for the purpose here.
    for (let i = 0; i < OVERSAMPLE; i++) {
      if (idx < this.#idxB) {
        // Ramp from `0` to `1`.
        samp += idx / this.#widthA;
      } else if (idx < this.#idxC) {
        // Ramp from `1` to `0`.
        samp += ((idx - this.#idxB) / this.#widthB) * -1 + 1;
      } else if (idx < this.#idxD) {
        // Ramp from `0` to `-1`.
        samp += ((idx - this.#idxC) / this.#widthC) * -1;
      } else {
        // Ramp from `-1` to `0`.
        samp += ((idx - this.#idxD) / this.#widthD) - 1;
      }

      idx += this.#idxRate;

      if (idx > 1) {
        idx %= 1;
        if (this.#needCalc) {
          this.#calcDerived();
          this.#needCalc = false;
        }
      }
    }

    this.#idx = idx;
    return samp / OVERSAMPLE * this.#amp;
  }

  /**
   * Calculates all the derived parameters.
   */
  #calcDerived() {
    this.#idxRate = this.#freq / this.#sampleRate;

    // Clamp the biases to prevent NaN results at the extremes.
    if      (this.#upBias  < -0.999) { this.#upBias  = -0.999; }
    else if (this.#upBias  >  0.999) { this.#upBias  =  0.999; }
    if      (this.#posBias < -0.999) { this.#posBias = -0.999; }
    else if (this.#posBias >  0.999) { this.#posBias =  0.999; }
    if      (this.#ampBias < -0.999) { this.#ampBias = -0.999; }
    else if (this.#ampBias >  0.999) { this.#ampBias =  0.999; }

    // Start with even segment sizes, and then apply each bias.
    let widthA = 1;
    let widthB = 1;
    let widthC = 1;
    let widthD = 1;

    widthA *= this.#upBias + 1;
    widthB *= 1 - this.#upBias;
    widthC *= 1 - this.#upBias;
    widthD *= this.#upBias + 1;

    widthA *= this.#posBias + 1;
    widthB *= this.#posBias + 1;
    widthC *= 1 - this.#posBias;
    widthD *= 1 - this.#posBias;

    widthA *= this.#ampBias + 1;
    widthB *= 1 - this.#ampBias;
    widthC *= this.#ampBias + 1;
    widthD *= 1 - this.#ampBias;

    // Scale the widths so that the total is 1. Note that we can't just
    // start with segment sizes of 0.25 each and *not* perform a correction
    // like this, because errors can build up during the math above which
    // would make the total width be something other than 1.
    for (;;) {
      const widthScale = 1 / (widthA + widthB + widthC + widthD);
      widthA *= widthScale;
      widthB *= widthScale;
      widthC *= widthScale;
      widthD *= widthScale;

      // If any width is under 0.005, clamp it. This prevents us from ever
      // eliding over a zero crossing, making for a little bit nicer display.
      if (widthA < 0.005) { widthA = 0.005; continue; }
      if (widthB < 0.005) { widthB = 0.005; continue; }
      if (widthC < 0.005) { widthC = 0.005; continue; }
      if (widthD < 0.005) { widthD = 0.005; continue; }
      break;
    }

    this.#widthA = widthA;
    this.#widthB = widthB;
    this.#widthC = widthC;
    this.#widthD = widthD;
    this.#idxB = widthA;
    this.#idxC = this.#idxB + widthB;
    this.#idxD = this.#idxC + widthC;
  }
}

registerProcessor('Piece', Piece);
