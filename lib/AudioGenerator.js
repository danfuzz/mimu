// Copyright 2015-2023 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

// Note: Available globals:
//
// * sampleRate
// * currentFrame
// * currentTime

export class AudioGenerator extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
  }

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
