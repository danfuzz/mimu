// Copyright 2015-2025 the Mimu Authors (Dan Bornstein et alia).
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

new SliderWidget(document.querySelector('#alpha'), {
  minValue:  0,
  maxValue:  2,
  increment: 0.02,
  precision: 2,
  updater:   (v) => mc.sendGenerator('alpha', v),
  value:     PARAMS.alpha
});

new SliderWidget(document.querySelector('#amp'), {
  minValue:  0,
  maxValue:  1,
  increment: 0.02,
  precision: 2,
  updater:   (v) => mc.sendGenerator('amp', v),
  value:     PARAMS.amp
});
