// Copyright 2015-2024 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

/**
 * Initial parameters for the "piece" defined in this module.
 */
export class PieceParams {
  /** @returns {object} The parameters. */
  static get PARAMS() {
    return {
      alpha: 1.0,
      amp:   0.5,
      poles: 5
    };
  }
}
