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
["Piece", "lib/Harmonics", "lib/MusicControl", "lib/Oscilloscope"],
function(Piece, Harmonics, MusicControl, Oscilloscope) {

// The overall audio context instance. Unfortunately, the name
// `AudioContext` isn't fully standardized and is prefixed in some
// browsers. Ideally, the expression would just be `new AudioContext()`
// per se.
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

var gen = new Piece(audioCtx.sampleRate);
var mc = new MusicControl(audioCtx, gen);
mc.oscilloscope = new Oscilloscope(document.querySelector("#oscCell"));
mc.harmonics = new Harmonics(document.querySelector("#harmCell"));

var alphaText = document.querySelector("#alphaText");
var ampText = document.querySelector("#ampText");

document.querySelector("#playPause").onclick = function() {
    mc.playPause();
};

document.querySelector("#alpha").oninput = function() {
    gen.alpha = parseFloat(this.value);
    alphaText.textContent = this.value;
};

document.querySelector("#amp").oninput = function() {
    gen.amp = parseFloat(this.value);
    ampText.textContent = this.value;
};

});
