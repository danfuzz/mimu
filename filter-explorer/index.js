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
    "lib/SliderWidget"],
function(Piece, Harmonics, MusicControl, Oscilloscope, SliderWidget) {

// The overall audio context instance. Unfortunately, the name
// `AudioContext` isn't fully standardized and is prefixed in some
// browsers. Ideally, the expression would just be `new AudioContext()`
// per se.
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

var gen = new Piece(audioCtx.sampleRate);
var mc = new MusicControl(audioCtx, gen);
mc.oscilloscope = new Oscilloscope(document.querySelector("#oscCell"));
mc.harmonics = new Harmonics(document.querySelector("#harmCell"));

var f0Text = document.querySelector("#f0Text");
var qText = document.querySelector("#qText");
var ampText = document.querySelector("#ampText");

document.querySelector("#playPause").onclick = function() {
    mc.playPause();
};

new SliderWidget(document.querySelector("#inAmp"), {
    minValue:       0,
    maxValue:       10,
    increment:      0.1,
    precision:      1,
    target:         gen,
    targetProperty: "inAmp"
});

new SliderWidget(document.querySelector("#f0"), {
    minValue:       20,
    maxValue:       8000,
    increment:      1,
    precision:      0,
    target:         gen,
    targetProperty: "f0"
});

new SliderWidget(document.querySelector("#q"), {
    minValue:       0,
    maxValue:       500,
    increment:      0.01,
    precision:      2,
    target:         gen,
    targetProperty: "q"
});

new SliderWidget(document.querySelector("#amp"), {
    minValue:       0,
    maxValue:       10,
    increment:      0.1,
    precision:      1,
    target:         gen,
    targetProperty: "amp"
});

var filterRadios =
    document.querySelectorAll("input[name='filterType']");
for (var i = 0; i < filterRadios.length; i++) {
    var r = filterRadios[i];
    r.onclick = function() {
        gen.filterType = this.value;
    };
}

});
