// Copyright 2015-2023 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

import { Harmonics } from '../lib/Harmonics.js';
import { MusicControl } from '../lib/MusicControl.js';
import { Oscilloscope } from '../lib/Oscilloscope.js';
import { PieceParams } from './PieceParams.js';

const mc = new MusicControl('./Piece.js');
mc.oscilloscope = new Oscilloscope(document.querySelector('#oscCell'));
mc.harmonics = new Harmonics(document.querySelector('#harmCell'));

document.querySelector('#playPause').onclick = () => mc.playPause();

const PARAMS = PieceParams.PARAMS;

const waveRadios = document.querySelectorAll("input[name='waveform']");
for (const radio of waveRadios) {
  if (radio.value === PARAMS.waveform) {
    radio.checked = true;
  }
  radio.onclick = function () {
    mc.sendGenerator('waveform', this.value);
  };
}
