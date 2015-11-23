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
["Piece", "lib/Harmonics", "lib/MusicControl", "lib/Oscilloscope",
    "lib/PianoWidget", "lib/SliderWidget"],
function(Piece, Harmonics, MusicControl, Oscilloscope, PianoWidget,
    SliderWidget) {

// The overall audio context instance. Unfortunately, the name
// `AudioContext` isn't fully standardized and is prefixed in some
// browsers. Ideally, the expression would just be `new AudioContext()`
// per se.
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

var gen = new Piece(audioCtx.sampleRate);
var mc = new MusicControl(audioCtx, gen);
mc.oscilloscope = new Oscilloscope(document.querySelector("#oscCell"));
mc.harmonics = new Harmonics(document.querySelector("#harmCell"));

document.querySelector("#playPause").onclick = function() {
    mc.playPause();
};

new PianoWidget(document.querySelector("#piano"));

new SliderWidget(document.querySelector("#upBias"), {
    minValue:       -1,
    maxValue:       1,
    increment:      0.005,
    precision:      3,
    target:         gen,
    targetProperty: "upBias"
});

new SliderWidget(document.querySelector("#posBias"), {
    minValue:       -1,
    maxValue:       1,
    increment:      0.005,
    precision:      3,
    target:         gen,
    targetProperty: "posBias"
});

new SliderWidget(document.querySelector("#ampBias"), {
    minValue:       -1,
    maxValue:       1,
    increment:      0.005,
    precision:      3,
    target:         gen,
    targetProperty: "ampBias"
});

new SliderWidget(document.querySelector("#freq"), {
    minValue:       20,
    maxValue:       8000,
    increment:      1,
    precision:      0,
    target:         gen,
    targetProperty: "freq"
});

new SliderWidget(document.querySelector("#amp"), {
    minValue:       0,
    maxValue:       1,
    increment:      0.01,
    precision:      2,
    target:         gen,
    targetProperty: "amp"
});

});
