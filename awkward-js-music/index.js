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
