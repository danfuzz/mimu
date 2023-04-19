/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";

 requirejs.config({
    paths: {
        lib: "../lib"
    }
});

requirejs(
["lib/Harmonics", "lib/MusicControl", "lib/Oscilloscope"],
function(Harmonics, MusicControl, Oscilloscope) {

var mc = new MusicControl('./Piece.js');
mc.oscilloscope = new Oscilloscope(document.querySelector("#oscCell"));
mc.harmonics = new Harmonics(document.querySelector("#harmCell"));

document.querySelector("#playPause").onclick = function() {
    mc.playPause();
};

var waveRadios =
    document.querySelectorAll("input[name='waveform']");
for (var i = 0; i < waveRadios.length; i++) {
    var r = waveRadios[i];
    r.onclick = function() {
        gen.waveform = this.value;
    };
}

});
