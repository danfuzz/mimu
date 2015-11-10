/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";

// Width of the canvas in pixels. We keep this fixed and then calculate the
// height in pixels based on this and the elements measured height.
var CANVAS_WIDTH = 1024;

// Fraction of width which is to be used for labels.
var LABEL_WIDTH_AMT = 0.06;

// Oscilloscope renderer. Expects values in the range `-1` to `1`. If timing
// labels are to be emitted, then the `sampleRate` and `bufferSize` need to be
// set.
//
// Note that, only half of a buffer will ever be rendered: The renderer
// attempts to find an upward zero-crossing somewhere in the first half of
// the buffer and renders from there. This helps make for a more stable
// display.
class Oscilloscope {
    // Takes a DOM node to insert an oscilloscope into.
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
        div.className = "soundDisplay";
        style = div.style;
        style.position = "relative";
        style.width = "100%";
        style.height = "100%";
        this._styleNode = div;
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

    set bufferSize(value) {
        this._bufferSize = value;
        this.renderBackground();
    }

    set sampleRate(value) {
        this._sampleRate = value;
        this.renderBackground();
    }

    // Render the background canvas.
    renderBackground() {
        var canvas = this.background;
        var style = StyleUtil.cloneComputedStyle(this._styleNode);
        var ctx = canvas.getContext("2d");
        var width = canvas.width;
        var height = canvas.height;
        var labelWidth = width * LABEL_WIDTH_AMT;
        var graphWidth = width - labelWidth;
        var graphHeight = height;
        var middleY = graphHeight / 2;

        var backgroundColor = Color.parse(style.backgroundColor);
        var foregroundColor = Color.parse(style.color);
        var mainColor = foregroundColor.mix(backgroundColor, 0.5).toCss();
        var darkColor = foregroundColor.mix(backgroundColor, 0.1).toCss();
        backgroundColor = backgroundColor.toCss();

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = darkColor;
        ctx.fillRect(labelWidth, graphHeight * 0.25, graphWidth, 2);
        ctx.fillRect(labelWidth, graphHeight * 0.75, graphWidth, 2);

        ctx.fillStyle = mainColor;
        ctx.fillRect(labelWidth, middleY, graphWidth, 2);
        ctx.fillRect(labelWidth, 0, 2, graphHeight);

        var bufferSize = this._bufferSize;
        var sampleRate = this._sampleRate;
        if (!(   bufferSize && (bufferSize > 0)
              && sampleRate && (sampleRate > 0))) {
            return;
        }

        // Aim for up to ten labels (with zero unlabeled). The `labelSecs`
        // calculation rounds the total buffer width in seconds down to a
        // power of ten; from there, we double the label count until we hit
        // more than ten.
        var renderSize = bufferSize / 2;
        var renderSecs = renderSize / sampleRate;
        var labelSecs = Math.pow(10, Math.floor(Math.log10(renderSecs)));

        for (;;) {
            var labelCount = Math.floor(renderSecs / labelSecs);
            if (labelCount > 10) {
                labelSecs *= 2;  // Because we went one too far in the loop.
                break;
            }
            labelSecs /= 2;
        }

        var tickHeight = height / 25;

        style.fontSize = Math.round(width / 70) + "px";
        ctx.font = style.font;
        ctx.textBaseline = "top";

        for (var s = labelSecs; s < renderSecs; s += labelSecs) {
            var x = (graphWidth * ((s * sampleRate) / renderSize)) + labelWidth;
            var text = (Math.round(s * 100000) / 100) + "\u200Ams";

            ctx.fillStyle = darkColor;
            ctx.fillRect(x, 0, 2, height);

            ctx.fillStyle = mainColor;
            ctx.fillRect(x, middleY - (tickHeight / 2), 2, tickHeight);

            var textWidth = ctx.measureText(text).width;
            if ((x + (textWidth / 2)) < width) {
                ctx.fillText(text,
                    x - (textWidth / 2), middleY + (tickHeight / 2));
            }
        }
    }

    // Render the given buffer into the oscilloscope.
    render(buf) {
        var canvas = this.foreground;
        var ctx = canvas.getContext("2d");
        var width = canvas.width;
        var height = canvas.height;
        var labelWidth = width * LABEL_WIDTH_AMT;
        var graphWidth = width - labelWidth;
        var graphHeight = height;

        ctx.clearRect(0, 0, width, height);

        if (!buf) {
            return;
        }

        ctx.strokeStyle = StyleUtil.getComputedStyle(this._styleNode).color;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();

        // Find an upward zero-crossing, or fall back if it doesn't seem
        // fruitful.
        var idxMax = buf.length / 2;
        var base = 0;
        while ((base < idxMax) && (buf[base] >= 0)) { base++; }
        while ((base < idxMax) && (buf[base] < 0)) { base++; }
        if (base >= idxMax) {
            base = 0; // No suitable zero-crossing.
        }

        for (var idx = 0; idx < idxMax; idx++) {
            var samp = buf[base + idx];
            var x = labelWidth + (idx / idxMax * graphWidth);
            var y = (-samp + 1) / 2 * graphHeight;
            if (idx === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
}
