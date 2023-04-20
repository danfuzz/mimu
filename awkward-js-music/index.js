// Copyright 2015-2023 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

import { Harmonics } from '../lib/Harmonics.js';
import { MusicControl } from '../lib/MusicControl.js';
import { Oscilloscope } from '../lib/Oscilloscope.js';

const mc = new MusicControl('./Piece.js');
mc.oscilloscope = new Oscilloscope(document.querySelector('#oscCell'));
mc.harmonics = new Harmonics(document.querySelector('#harmCell'));

document.querySelector('#playPause').onclick = function () {
  mc.playPause();
};

const waveRadios =
    document.querySelectorAll("input[name='waveform']");
for (let i = 0; i < waveRadios.length; i++) {
  const r = waveRadios[i];
  r.onclick = function () {
    mc.sendGenerator('waveform', this.value);
  };
}
