// Copyright 2015-2024 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

import { Harmonics } from '../lib/Harmonics.js';
import { MusicControl } from '../lib/MusicControl.js';
import { Oscilloscope } from '../lib/Oscilloscope.js';
import { SliderWidget } from '../lib/SliderWidget.js';
import { PieceParams } from './PieceParams.js';

const mc = new MusicControl('./Piece.js');
mc.oscilloscope = new Oscilloscope(document.querySelector('table.oscilloscope td'));
mc.harmonics = new Harmonics(document.querySelector('table.harmonics td'));

document.querySelector('button.playPause').onclick = () => mc.playPause();

const PARAMS = PieceParams.PARAMS;

new SliderWidget(document.querySelector('#upBias'), {
  minValue:  -1,
  maxValue:  1,
  increment: 0.005,
  precision: 3,
  updater:   (v) => mc.sendGenerator('upBias', v),
  value:     PARAMS.upBias
});

new SliderWidget(document.querySelector('#posBias'), {
  minValue:  -1,
  maxValue:  1,
  increment: 0.005,
  precision: 3,
  updater:   (v) => mc.sendGenerator('posBias', v),
  value:     PARAMS.posBias
});

new SliderWidget(document.querySelector('#ampBias'), {
  minValue:  -1,
  maxValue:  1,
  increment: 0.005,
  precision: 3,
  updater:   (v) => mc.sendGenerator('ampBias', v),
  value:     PARAMS.ampBias
});

new SliderWidget(document.querySelector('#freq'), {
  minValue:  20,
  maxValue:  8000,
  increment: 1,
  precision: 0,
  updater:   (v) => mc.sendGenerator('freq', v),
  value:     PARAMS.freq
});

new SliderWidget(document.querySelector('#amp'), {
  minValue:  0,
  maxValue:  1,
  increment: 0.01,
  precision: 2,
  updater:   (v) => mc.sendGenerator('amp', v),
  value:     PARAMS.amp
});
