/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

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

new SliderWidget(document.querySelector('#inAmp'), {
  minValue:       0,
  maxValue:       10,
  increment:      0.1,
  precision:      1,
  target:         gen,
  targetProperty: 'inAmp'
});

new SliderWidget(document.querySelector('#f0'), {
  minValue:       20,
  maxValue:       8000,
  increment:      1,
  precision:      0,
  target:         gen,
  targetProperty: 'f0'
});

new SliderWidget(document.querySelector('#q'), {
  minValue:       0,
  maxValue:       500,
  increment:      0.01,
  precision:      2,
  target:         gen,
  targetProperty: 'q'
});

new SliderWidget(document.querySelector('#amp'), {
  minValue:       0,
  maxValue:       10,
  increment:      0.1,
  precision:      1,
  target:         gen,
  targetProperty: 'amp'
});

const filterRadios =
    document.querySelectorAll("input[name='filterType']");
for (let i = 0; i < filterRadios.length; i++) {
  const r = filterRadios[i];
  r.onclick = function () {
    gen.filterType = this.value;
  };
}
