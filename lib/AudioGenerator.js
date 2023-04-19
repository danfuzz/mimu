/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

// Note: Available globals:
//
// * sampleRate
// * currentFrame
// * currentTime

export class AudioGenerator extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
  }

  process(inputs, outputs, parameters) {
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
