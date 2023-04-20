// Copyright 2015-2023 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

import { AudioGenerator } from '../lib/AudioGenerator.js';

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
class Piece extends AudioGenerator {
  /** Alpha. 1.0 is "normal" pink noise. */
  #alpha = 1.0;

  /** Number of poles. */
  #poles = 5;

  /**
   * Amplitude of the noise. This is only an approximation, in that
   * pink noise inherently has no real limit on range.
   */
  #amp = 0.5;

  // Derived values

  /** Amp including adjustment multiplier for the given alpha. */
  #ampAdjusted = 0;

  /** Multipliers for the IIR filter. One per pole. */
  #multipliers = [];

  /** Circular history of recently-generated values. One per pole. */
  #values = [];

  /** Notional start index of the `values` array. */
  #at = 0;

  /**
   * Contructs an instance.
   */
  constructor(options) {
    super(options);

    this.#calcFilter();
    this.#calcAmp();
  }

  /**
   * Gets the output amplitude.
   */
  get amp() {
    return this.#amp;
  }

  /**
   * Sets the output amplitude.
   */
  set amp(value) {
    this.#amp = value;
    this.#calcAmp();
  }

  /**
   * Gets the alpha.
   */
  get alpha() {
    return this.#alpha;
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

    this.#alpha = value;
    this.#calcFilter();
    this.#calcAmp();
  }

  /**
   * Gets the count of poles.
   */
  get poles() {
    return this.#poles;
  }

  /**
   * Sets the count of poles.
   */
  set poles(value) {
    this.#poles = value;
    this.#calcFilter();
  }

  /** @override */
  _impl_nextSample() {
    const poles = this.#poles;
    const multipliers = this.#multipliers;
    const values = this.#values;
    let at = this.#at;
    let x = Piece.#randomGaussian();

    for (let i = 0; i < poles; i++) {
      x -= multipliers[i] * values[(at + i) % poles];
    }

    at = (at + poles + 1) % poles;
    values[at] = x;
    this.#at = at;

    // Scale by the indicated amp. The additional `0.2` multiplier is to
    // get most samples to be in the range -1 to 1. After that, clamp to
    // the valid range -1 to 1.
    x *= this.#ampAdjusted;

    return Math.min(Math.max(x, -1), 1);
  }

  /**
   * Calculates derived parameters for amplitude. This formula was derived
   * empirically and is probably off.
   */
  #calcAmp() {
    this.#ampAdjusted = this.#amp *
            (Math.log(1.05 + (2 - this.#alpha)) / 4.5);
  }

  /**
   * Calculates the derived filter parameters, and initializes the `values`
   * array if not already done.
   */
  #calcFilter() {
    const poles = this.#poles;
    const alpha = this.#alpha;

    this.#multipliers = new Float64Array(poles);
    this.#at = 0;

    let a = 1;
    for (let i = 0; i < poles; i++) {
      a = (i - (alpha / 2)) * a / (i + 1);
      this.#multipliers[i] = a;
    }

    // Set up the historical `values` array, if this is the first time
    // `#calcFilter()` is called *or* if the number of poles has changed.
    // Otherwise, we "let it ride" to avoid a discontinuity of the waveform.
    if (!(this.#values && (this.#values.length === poles))) {
      this.#values = new Float64Array(poles);

      // Fill history with random values.
      for (let i = 0; i < (5 * poles); i++) {
        this._impl_nextSample();
      }
    }
  }


  //
  // Static members
  //

  /**
   * Gets a gaussian-distribution random number using the "polar" method.
   */
  static #randomGaussian() {
    // In a general implementation, these could be arguments.
    const mean = 0;
    const variance = 1;

    // This loop picks random candidate points until we find one that falls
    // within the unit circle. We explicitly avoid the center point
    // (unlikely though it may be), as it can't be scaled.
    let s, v1;
    do {
      v1       = (Math.random() * 2) - 1;  // Generate two uniform random...
      const v2 = (Math.random() * 2) - 1;  // ...numbers in the range -1..1.
      s = (v1 * v1) + (v2 * v2);         // Distance^2 from origin.
    } while ((s > 1) || (s === 0));

    const mult = Math.sqrt(variance) * Math.sqrt(-2 * Math.log(s) / s);
    const x = mean + (mult * v1);

    // If we want a second random value:
    // var y = mean + (mult * v2);

    return x;
  }
}

registerProcessor('Piece', Piece);
