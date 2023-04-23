// Copyright 2015-2023 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

import { Harmonics } from '../lib/Harmonics.js';
import { MusicControl } from '../lib/MusicControl.js';
import { Oscilloscope } from '../lib/Oscilloscope.js';
import { SliderWidget } from '../lib/SliderWidget.js';
import { PieceParams } from './PieceParams.js';

const mc = new MusicControl('./Piece.js');
mc.oscilloscope = new Oscilloscope(document.querySelector('table.oscilloscope td'));
mc.harmonics = new Harmonics(document.querySelector('table.harmonics td'));

document.querySelector('#playPause').onclick = () => mc.playPause();

const PARAMS = PieceParams.PARAMS;

new SliderWidget(document.querySelector('#inAmp'), {
  minValue:  0,
  maxValue:  10,
  increment: 0.1,
  precision: 1,
  updater:   (v) => mc.sendGenerator('inAmp', v),
  value:     PARAMS.inAmp
});

new SliderWidget(document.querySelector('#f0'), {
  minValue:  20,
  maxValue:  8000,
  increment: 1,
  precision: 0,
  updater:   (v) => mc.sendGenerator('f0', v),
  value:     PARAMS.f0
});

new SliderWidget(document.querySelector('#q'), {
  minValue:  0,
  maxValue:  500,
  increment: 0.01,
  precision: 2,
  updater:   (v) => mc.sendGenerator('q', v),
  value:     PARAMS.q
});

new SliderWidget(document.querySelector('#amp'), {
  minValue:  0,
  maxValue:  10,
  increment: 0.1,
  precision: 1,
  updater:   (v) => mc.sendGenerator('amp', v),
  value:     PARAMS.amp
});

const filterRadios = document.querySelectorAll("input[name='filterType']");
for (const radio of filterRadios) {
  if (radio.value === PARAMS.filterType) {
    radio.checked = true;
  }
  radio.onclick = () => mc.sendGenerator('filterType', radio.value);
}
