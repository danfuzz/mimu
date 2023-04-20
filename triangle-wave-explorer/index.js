// Copyright 2015-2023 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

import { Harmonics } from '../lib/Harmonics.js';
import { MusicControl } from '../lib/MusicControl.js';
import { Oscilloscope } from '../lib/Oscilloscope.js';
import { SliderWidget } from '../lib/SliderWidget.js';

const mc = new MusicControl('./Piece.js');
mc.oscilloscope = new Oscilloscope(document.querySelector('#oscCell'));
mc.harmonics = new Harmonics(document.querySelector('#harmCell'));

document.querySelector('#playPause').onclick = function () {
  mc.playPause();
};

const gen = '<TODO FIX ME>';

new SliderWidget(document.querySelector('#upBias'), {
  minValue:  -1,
  maxValue:  1,
  increment: 0.005,
  precision: 3,
  updater:   (v) => mc.sendGenerator('upBias', v)
});

new SliderWidget(document.querySelector('#posBias'), {
  minValue:  -1,
  maxValue:  1,
  increment: 0.005,
  precision: 3,
  updater:   (v) => mc.sendGenerator('posBias', v)
});

new SliderWidget(document.querySelector('#ampBias'), {
  minValue:  -1,
  maxValue:  1,
  increment: 0.005,
  precision: 3,
  updater:   (v) => mc.sendGenerator('ampBias', v)
});

new SliderWidget(document.querySelector('#freq'), {
  minValue:  20,
  maxValue:  8000,
  increment: 1,
  precision: 0,
  updater:   (v) => mc.sendGenerator('freq', v)
});

new SliderWidget(document.querySelector('#amp'), {
  minValue:  0,
  maxValue:  1,
  increment: 0.01,
  precision: 2,
  updater:   (v) => mc.sendGenerator('amp', v)
});
