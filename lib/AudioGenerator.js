// Copyright 2015-2023 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

// Note: Available globals:
//
// * sampleRate
// * currentFrame
// * currentTime

/**
 * Base class for all the specific audio generators.
 */
export class AudioGenerator extends AudioWorkletProcessor {
  /**
   * Constructs an instance.
   *
   * @param {object} options Options, as defined by the `AudioWorkletProcessor`
   *   API.
   */
  constructor(options) {
    super(options);
  }

  /**
   * Processes a frame. This method is defined by the `AudioWorkletProcessor`
   * API.
   *
   * @param {Float32Array[][]} inputs_unused Incoming inputs.
   * @param {Float32Array[][]} outputs Outgoing outputs.
   * @param {object} parameters_unused Real-time modifiable parameters.
   */
  process(inputs_unused, outputs, parameters_unused) {
    const output   = outputs[0];
    const frameLen = output[0].length;

    for (let i = 0; i < frameLen; i++) {
      const sample = this._impl_nextSample();
      for (const channel of output) {
        channel[i] = sample;
      }
    }

    return true;
  }
}
