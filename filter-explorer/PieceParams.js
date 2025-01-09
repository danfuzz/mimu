// Copyright 2015-2025 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

/**
 * Initial parameters for the "piece" defined in this module.
 */
export class PieceParams {
  /** @returns {object} The parameters. */
  static get PARAMS() {
    return {
      filterType: 'band-pass',
      inAmp:      1.0,
      f0:         440,
      q:          10.0,
      amp:        0.5
    };
  }
}
