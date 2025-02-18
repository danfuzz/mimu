// Copyright 2015-2025 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

import { AudioGenerator } from '../lib/AudioGenerator.js';
import { PieceParams } from './PieceParams.js';

/**
 * Filter generator, with adjustable type, center frequency, and Q. What it
 * filters is adjustable-amplitude white noise.
 *
 * The filters implemented herein are two-pole IIR filters, as described by
 * Robert Bristow-Johnson in
 * <https://www.musicdsp.org/files/Audio-EQ-Cookbook.txt>.
 */
export class Piece extends AudioGenerator {
  /** Input amplitude. */
  #inAmp;

  /**
   * Filter type. Must be one of: `low-pass` `high-pass` `band-pass` `notch`.
   */
  #filterType;

  /** Center frequency. */
  #f0;

  /** Q (filter quality). */
  #q;

  /** Amplitude of the output. */
  #amp;

  // Derived values

  /** Previous input sample. (Subscripts are taken as negative indices.) */
  #x1 = 0;

  /** Second-previous input sample. */
  #x2 = 0;

  /** Previous output sample. */
  #y1 = 0;

  /** Second-previous output sample. */
  #y2 = 0;

  /** Filter coefficient applied to `x0`. */
  #x0Co;

  /** Filter coefficient applied to `x1`. */
  #x1Co;

  /** Filter coefficient applied to `x2`. */
  #x2Co;

  /** Filter coefficient applied to `y1`. */
  #y1Co;

  /** Filter coefficient applied to `y2`. */
  #y2Co;

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

    this.#calcFilter();
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

  /** @returns {number} The center frequency. */
  get f0() {
    return this.#f0;
  }

  /**
   * Sets the center frequency.
   *
   * @param {number} value The center frequency.
   */
  set f0(value) {
    this.#f0 = value;
    this.#calcFilter();
  }

  /** @returns {string} The filter type. */
  get filterType() {
    return this.#filterType;
  }

  /**
   * Sets the filter type.
   *
   * @param {string} value The filter type.
   */
  set filterType(value) {
    switch (value) {
      case 'low-pass':
      case 'high-pass':
      case 'band-pass':
      case 'notch': {
        // These are okay.
        break;
      }
      default: {
        value = 'low-pass';
      }
    }

    this.#filterType = value;
    this.#calcFilter();
  }

  /** @returns {number} The input amplitude. */
  get inAmp() {
    return this.#inAmp;
  }

  /**
   * Sets the input amplitude.
   *
   * @param {number} value The input amplitude.
   */
  set inAmp(value) {
    this.#inAmp = value;
  }

  /** @returns {number} Q (the filter quality). */
  get q() {
    return this.#q;
  }

  /**
   * Sets Q (the filter quality).
   *
   * @param {number} value Q (the filter quality).
   */
  set q(value) {
    if (value <= 0.0001) {
      value = 0.0001;
    }

    this.#q = value;
    this.#calcFilter();
  }

  /** @override */
  _impl_nextSample() {
    const x1 = this.#x1;
    const x2 = this.#x2;
    const y1 = this.#y1;
    const y2 = this.#y2;

    const x0 = ((Math.random() * 2) - 1) * this.#inAmp;  // Input sample.
    const y0 = (this.#x0Co * x0) + (this.#x1Co * x1) + (this.#x2Co * x2) +
      (this.#y1Co * y1) + (this.#y2Co * y2);

    this.#x2 = this.#x1;
    this.#x1 = x0;
    this.#y2 = this.#y1;
    this.#y1 = y0;

    return Math.max(Math.min(y0 * this.#amp, 1), -1);
  }

  /**
   * Calculates the derived filter parameters.
   */
  #calcFilter() {
    const w0 = 2 * Math.PI * this.#f0 / sampleRate;
    const alpha = Math.sin(w0) / (this.#q * 2);
    const cosW0 = Math.cos(w0);
    let b0, b1, b2, a0, a1, a2;

    switch (this.#filterType) {
      case 'low-pass': {
        b0 = (1 - cosW0) / 2;
        b1 = 1 - cosW0;
        b2 = (1 - cosW0) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cosW0;
        a2 = 1 - alpha;
        break;
      }
      case 'high-pass': {
        b0 = (1 + cosW0) / 2;
        b1 = -(1 + cosW0);
        b2 = (1 + cosW0) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cosW0;
        a2 = 1 - alpha;
        break;
      }
      case 'band-pass': {
        // This is the "peak gain = Q" BPF variant from the Audio EQ
        // Cookbook.
        b0 = this.#q * alpha;
        b1 = 0;
        b2 = -this.#q * alpha;
        a0 = 1 + alpha;
        a1 = -2 * cosW0;
        a2 = 1 - alpha;
        break;
      }
      case 'notch': {
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

    this.#x0Co = b0 / a0;
    this.#x1Co = b1 / a0;
    this.#x2Co = b2 / a0;
    this.#y1Co = -a1 / a0;
    this.#y2Co = -a2 / a0;
  }
}

registerProcessor('Piece', Piece);
