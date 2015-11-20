/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";

define(["./CanvasWidget", "./Color"], function(CanvasWidget, Color) {

/** Fraction of width which is to be used for labels. */
var LABEL_WIDTH_AMT = 0.06;

/**
 * Oscilloscope renderer. Expects values in the range `-1` to `1`. If timing
 * labels are to be drawn, then the `sampleRate` needs to be set.
 *
 * Note that, only half of a buffer will ever be rendered: The renderer
 * attempts to find an upward zero-crossing somewhere in the first half of
 * the buffer and renders from there. This helps make for a more stable
 * display.
 */
class Oscilloscope extends CanvasWidget {
    /**
     * Takes a DOM node to insert an oscilloscope into. The node should
     * be an empty container.
     */
    constructor(node) {
        super(node, "soundDisplay");

        /** Sample rate. Used for generating labels. */
        this._sampleRate = 0;

        /** Buffer of samples to render.*/
        this._buffer = undefined;

        this.foregroundOpacity = 0.9;  // Show a bit of the background through.
        this.render();  // Draw an empty display.
    }

    /**
     * Sets the sample data buffer.
     */
    set buffer(buffer) {
        this._buffer = buffer;
        this.renderBackground();
    }

    /**
     * Gets the sample data buffer.
     */
    get buffer() {
        return this._buffer;
    }

    /**
     * Sets the sample rate, in samples per second.
     */
    set sampleRate(value) {
        this._sampleRate = value;
        this.renderBackground();
    }

    /**
     * Renders the background canvas.
     */
    renderBackground() {
        var canvas = this.background;
        var style = this.cloneComputedStyle();
        var ctx = canvas.getContext("2d");
        var width = canvas.width;
        var height = canvas.height;
        var labelWidth = width * LABEL_WIDTH_AMT;
        var graphWidth = width - labelWidth;
        var graphHeight = height;
        var middleY = graphHeight / 2;
        var thin = this.thinLineWidth;

        var backgroundColor = Color.parse(style.backgroundColor);
        var foregroundColor = Color.parse(style.color);
        var mainColor = foregroundColor.mix(backgroundColor, 0.5).toCss();
        var darkColor = foregroundColor.mix(backgroundColor, 0.1).toCss();
        backgroundColor = backgroundColor.toCss();

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = mainColor;
        ctx.fillRect(labelWidth, 0, thin, graphHeight);

        var bufferSize = this._buffer && this._buffer.length;
        var sampleRate = this._sampleRate;
        if (!(   bufferSize && (bufferSize > 0)
              && sampleRate && (sampleRate > 0))) {
            return;
        }

        var tickLength = height / 50;

        style.fontSize = Math.round(width / 70) + "px";
        ctx.font = style.font;

        // Label the y axis (instantaneous amplitude).

        ctx.textBaseline = "middle";

        for (var v = -0.75; v < 1; v += 0.25) {
            var y = (-v + 1) / 2 * graphHeight;
            var text = v + " ";
            if ((v * 2) == Math.round(v * 2)) {
                var extraX = (v === 0) ? 0 : (thin * 2);
                ctx.fillStyle = (v === 0) ? mainColor : darkColor;
                ctx.fillRect(labelWidth + extraX, y, graphWidth - extraX, thin);
            }
            ctx.fillStyle = mainColor;
            ctx.fillRect(labelWidth - tickLength, y, tickLength, thin);

            var textWidth = ctx.measureText(text).width;
            ctx.fillText(text, labelWidth - tickLength - textWidth, y);
        }

        // Aim for up to ten time labels (with zero unlabeled). The `labelSecs`
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

        ctx.textBaseline = "top";

        for (var s = labelSecs; s < renderSecs; s += labelSecs) {
            var x = (graphWidth * ((s * sampleRate) / renderSize)) + labelWidth;
            var text = (Math.round(s * 100000) / 100) + "\u200Ams";

            ctx.fillStyle = darkColor;
            ctx.fillRect(x, 0, thin, height);

            ctx.fillStyle = mainColor;
            ctx.fillRect(x, middleY - (tickLength / 2), thin, tickLength);

            var textWidth = ctx.measureText(text).width;
            if ((x + (textWidth / 2)) < width) {
                ctx.fillText(text,
                    x - (textWidth / 2), middleY + (tickLength / 2));
            }
        }
    }

    /**
     * Renders the oscilloscope's sample buffer into the foreground canvas.
     */
    render() {
        var buf = this._buffer;
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

        ctx.strokeStyle = this.getComputedStyle().color;
        ctx.lineWidth = this.thickLineWidth;
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

return Oscilloscope;
});
