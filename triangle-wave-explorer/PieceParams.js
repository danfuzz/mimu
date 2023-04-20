// Copyright 2015-2023 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

/**
 * Initial parameters for the "piece" defined in this module.
 */
export class PieceParams {
  /** @returns {object} The parameters. */
  static get PARAMS() {
    return {
      amp:  0.75,
      ampBias: 0.0,
      freq: 440.0,
      posBias: 0.0,
      upBias: 0.0
    };
  }
}
