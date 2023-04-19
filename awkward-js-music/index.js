/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

import { Harmonics } from '../lib/Harmonics.js';
import { MusicControl } from '../lib/MusicControl.js';
import { Oscilloscope } from '../lib/Oscilloscope.js';

var mc = new MusicControl('./Piece.js');
mc.oscilloscope = new Oscilloscope(document.querySelector("#oscCell"));
mc.harmonics = new Harmonics(document.querySelector("#harmCell"));

document.querySelector("#playPause").onclick = function() {
    mc.playPause();
};

const gen = '<TODO FIX ME>';

var waveRadios =
    document.querySelectorAll("input[name='waveform']");
for (var i = 0; i < waveRadios.length; i++) {
    var r = waveRadios[i];
    r.onclick = function() {
        gen.waveform = this.value;
    };
}
