/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";

// Width of the canvas in pixels. We keep this fixed and then calculate the
// height in pixels based on this and the elements measured height.
var CANVAS_WIDTH = 1024;

// Fraction of width which is to be used as the label height. We do it this
// way because the width (not height) is the driver of the overall dimensions.
var LABEL_HEIGHT_AMT = 0.03;

// Harmonics renderer. Expects values in the range `0` to `255`.
class Harmonics {
    // Takes a DOM node to insert a harmonics graph into.
    constructor(node) {
        var doc = node.ownerDocument;
        var style;

        // Sample rate. Used for generating labels.
        this._sampleRate = 0;

        // Expected size of frequency array. Used for generating labels.
        this._frequencyBinCount = 0;

        // Make a `div` to hold the two canvases. It has to be set for
        // explicit relative positioning, otherwise the child nodes "leak"
        // out.
        var div = doc.createElement("div");
        style = div.style;
        style.position = "relative";
        style.width = "100%";
        style.height = "100%";
        node.appendChild(div);

        // Figure out the pixel height based on the (fixed) pixel width and
        // the `div` element's measured aspect ratio. This ensures that
        // rendered pixels will be square.
        var width = CANVAS_WIDTH;
        var height = (width / div.clientWidth) * div.clientHeight;

        // The fixed background canvas.
        this.background = doc.createElement("canvas");
        this.background.width = width;
        this.background.height = height;
        style = this.background.style;
        style.position = "absolute";
        style.top = "0";
        style.left = "0";
        style.width = "100%";
        style.height = "100%";
        style.zIndex = "1";

        // The main display canvas.
        this.foreground = doc.createElement("canvas");
        this.foreground.width = width;
        this.foreground.height = height;
        style = this.foreground.style;
        style.position = "absolute";
        style.top = "0";
        style.left = "0";
        style.width = "100%";
        style.height = "100%";
        style.zIndex = "1";
        style.opacity = "0.9";

        div.appendChild(this.background);
        div.appendChild(this.foreground);

        this.render(undefined);  // Draw an empty oscilloscope.

        // Because the style can change after the instance is instantiated
        // (including particularly because fonts are loaded), we set up a
        // timer to refresh the background once a second. This is hacky, but
        // unfortunately there doesn't seem to be a good way to simply react
        // to changes.
        var outerThis = this;
        function refreshBackground() {
            outerThis.renderBackground();
            doc.defaultView.setTimeout(refreshBackground, 1000);
        }
        refreshBackground();
    }

    set frequencyBinCount(value) {
        this._frequencyBinCount = value;
        this.renderBackground();
    }

    set sampleRate(value) {
        this._sampleRate = value;
        this.renderBackground();
    }

    // Render the background canvas.
    renderBackground() {
        var canvas = this.background;
        var style = StyleUtil.cloneComputedStyle(canvas);
        var ctx = canvas.getContext("2d");
        var width = canvas.width;
        var height = canvas.height;
        var labelHeight = width * LABEL_HEIGHT_AMT;  // Yes, width. See def'n.
        var graphHeight = height - labelHeight;

        var backgroundColor = "#000000";
        var darkColor = "#001100";
        var mainColor = "#116611";

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = mainColor;
        ctx.fillRect(0, 0, 2, graphHeight);
        ctx.fillRect(0, graphHeight - 2, width, 2);

        var freqBins = this._frequencyBinCount;
        var sampleRate = this._sampleRate;

        if (!(   freqBins && (freqBins > 0)
              && sampleRate && (sampleRate > 0))) {
            return;
        }

        // Aim for up to twenty labels (with zero unlabeled). The `labelHz`
        // calculation rounds the total buffer width in Hz down to a power of
        // ten; from there, we double the label count until we hit more than
        // twenty.
        var renderHz = sampleRate / 2;
        var labelHz = Math.pow(10, Math.floor(Math.log10(renderHz)));

        for (;;) {
            var labelCount = Math.floor(renderHz / labelHz);
            if (labelCount > 20) {
                labelHz *= 2;  // Because we went one too far in the loop.
                break;
            }
            labelHz /= 2;
        }

        var tickHeight = labelHeight * 0.4;

        style.fontSize = Math.round(labelHeight * 0.5) + "px";
        ctx.font = style.font;
        ctx.textBaseline = "top";

        for (var hz = labelHz; hz < renderHz; hz += labelHz) {
            var x = hz / renderHz * width;
            var text = (Math.round(hz * 10) / 10) + "\u200AHz";

            ctx.fillStyle = darkColor;
            ctx.fillRect(x, 0, 2, graphHeight - 4);

            ctx.fillStyle = mainColor;
            ctx.fillRect(x, graphHeight, 2, tickHeight);

            var textWidth = ctx.measureText(text).width;
            if ((x + (textWidth / 2)) < width) {
                ctx.fillText(text,
                    x - (textWidth / 2), graphHeight + tickHeight);
            }
        }

    }

    // Render the given buffer into the harmonics graph.
    render(buf) {
        var canvas = this.foreground;
        var ctx = canvas.getContext("2d");
        var width = canvas.width;
        var height = canvas.height;
        var labelHeight = width * LABEL_HEIGHT_AMT;  // Yes, width. See def'n.
        var graphHeight = height - labelHeight;

        ctx.clearRect(0, 0, width, height);

        if (!buf) {
            return;
        }

        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();

        for (var i = 0; i < buf.length; i++) {
            var v = buf[i];
            var x = i / buf.length * width;
            var y = graphHeight * (1 - (v / 255));
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
}
