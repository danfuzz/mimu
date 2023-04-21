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

    // React to incoming messages by setting properties (which are presumed to
    // be defined by the concrete subclass).
    this.port.onmessage = (event) => {
      const { name, value } = event.data;
      this[name] = value;
    };
  }

  /**
   * Processes a frame. This method is defined by the `AudioWorkletProcessor`
   * API.
   *
   * @param {Float32Array[][]} inputs_unused Incoming inputs.
   * @param {Float32Array[][]} outputs Outgoing outputs.
   * @param {object} parameters_unused Real-time modifiable parameters.
   * @returns {boolean} "Force-alive" flag.
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

  /**
   * Performs one iteration of generation, returning a single sample. Must be
   * overridden by the concrete subclass.
   *
   * @abstract
   * @returns {number} The generated sample.
   */
  _impl_nextSample() {
    throw new Error('Abstract method.');
  }
}
