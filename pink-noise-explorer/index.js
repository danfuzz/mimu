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
["lib/Harmonics", "lib/MusicControl", "lib/Oscilloscope",
    "lib/SliderWidget"],
function(Harmonics, MusicControl, Oscilloscope, SliderWidget) {

var mc = new MusicControl('./Piece.js');
mc.oscilloscope = new Oscilloscope(document.querySelector("#oscCell"));
mc.harmonics = new Harmonics(document.querySelector("#harmCell"));

document.querySelector("#playPause").onclick = function() {
    mc.playPause();
};

const gen = '<TODO FIX ME>';

new SliderWidget(document.querySelector("#alpha"), {
    minValue:       0,
    maxValue:       2,
    increment:      0.02,
    precision:      2,
    target:         gen,
    targetProperty: "alpha"
});

new SliderWidget(document.querySelector("#amp"), {
    minValue:       0,
    maxValue:       1,
    increment:      0.02,
    precision:      2,
    target:         gen,
    targetProperty: "amp"
});

});
