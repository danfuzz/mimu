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

var f0Text = document.querySelector("#f0Text");
var qText = document.querySelector("#qText");
var ampText = document.querySelector("#ampText");

document.querySelector("#playPause").onclick = function() {
    mc.playPause();
};

document.querySelector("#inAmp").oninput = function() {
    gen.inAmp = parseFloat(this.value);
    inAmpText.textContent = this.value;
};

document.querySelector("#f0").oninput = function() {
    gen.f0 = parseFloat(this.value);
    f0Text.textContent = this.value;
};

document.querySelector("#q").oninput = function() {
    gen.q = parseFloat(this.value);
    qText.textContent = this.value;
};

document.querySelector("#amp").oninput = function() {
    gen.amp = parseFloat(this.value);
    ampText.textContent = this.value;
};

var filterRadios =
    document.querySelectorAll("input[name='filterType']");
for (var i = 0; i < filterRadios.length; i++) {
    var r = filterRadios[i];
    r.onclick = function() {
        gen.filterType = this.value;
    };
}

var slider = new SliderWidget(document.querySelector("#sliderCell"));

});
