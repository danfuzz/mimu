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
 * Harmonics renderer, with settable dynamic range. Expects floating point
 * values in its input buffer.
 */
class Harmonics extends CanvasWidget {
    /**
     * Takes a DOM node to insert a harmonics graph into. The node should
     * be an empty container.
     */
    constructor(node) {
        super(node, "soundDisplay");

        /** Sample rate. Used for generating labels. */
        this._sampleRate = 0;

        /** Harmonic data (frequency bins) buffer. */
        this._buffer = undefined;

        /** Minimum expected value in decibels. */
        this._minValue = -100;

        /** Maximum expected value in decibels. */
        this._maxValue = -30;

        this.foregroundOpacity = 0.9;  // Show a bit of the background through.
        this.render();                 // Draw an empty display.
    }

    /**
     * Override of parent method. In this case, the font size follows the
     * width of the canvas.
     */
    get fontSize() {
        return this.foreground.width / 70;
    }

    /**
     * Sets the harmonic data buffer. These are the "frequency bins" from
     * the Web Audio API.
     */
    set buffer(buffer) {
        this._buffer = buffer;
        this.renderBackground();
    }

    /**
     * Gets the harmonic data buffer.
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
     * Sets the minimum level expected in the data buffer. Values below this
     * get clipped in the graph.
     */
    set minValue(value) {
        this._minValue = value;
        this.renderBackground();
    }

    /**
     * Sets the maximum level expected in the data buffer. Values above this
     * get clipped in the graph.
     */
    set maxValue(value) {
        this._maxValue = value;
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
        var labelHeight = this.fontSize * 2;
        var graphWidth = width - labelWidth;
        var graphHeight = height - labelHeight;
        var thin = this.thinLineWidth;
        var tickLength = this.fontSize / 2;

        var backgroundColor = Color.parse(style.backgroundColor);
        var foregroundColor = Color.parse(style.color);
        var mainColor = foregroundColor.mix(backgroundColor, 0.5).toCss();
        var darkColor = foregroundColor.mix(backgroundColor, 0.1).toCss();
        backgroundColor = backgroundColor.toCss();

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = mainColor;
        ctx.fillRect(labelWidth, 0, thin, graphHeight);
        ctx.fillRect(labelWidth, graphHeight, graphWidth, thin);

        var freqBins = this._buffer && this._buffer.length;
        var sampleRate = this._sampleRate;

        if (!(   freqBins && (freqBins > 0)
              && sampleRate && (sampleRate > 0))) {
            return;
        }

        style.fontSize = this.fontSizePx;
        ctx.font = style.font;

        // Aim for up to twenty labels. The `labelHz` calculation rounds the
        // total buffer width in Hz down to a power of ten; from there, we
        // double the label count until we hit more than twenty.

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

        ctx.textBaseline = "top";

        for (var hz = 0; hz < renderHz; hz += labelHz) {
            var x = (hz / renderHz * graphWidth) + labelWidth;
            var text = "" + (Math.round(hz * 10) / 10);

            if (hz === 0) {
                text += "\u200AHz";
            } else {
                ctx.fillStyle = darkColor;
                ctx.fillRect(x, 0, thin, graphHeight - (thin*2));
            }

            ctx.fillStyle = mainColor;
            ctx.fillRect(x, graphHeight, thin, tickLength);

            var textWidth = ctx.measureText(text).width;
            if ((x + (textWidth / 2)) < width) {
                ctx.fillText(text,
                    x - (textWidth / 2), graphHeight + tickLength);
            }
        }

        // Aim for up to seven decibel labels. This is harder to calculate than
        // the horizontal axis in that the axes don't cross at 0 but rather at
        // an arbitrary value. Note that decibel values are typically
        // *negative*.

        var renderDb = this._maxValue - this._minValue;
        var labelDb = Math.pow(10, Math.floor(Math.log10(renderDb)));

        for (;;) {
            var labelCount = Math.floor(renderDb / labelDb) +
                Math.floor(this._maxValue / labelDb);
            if (labelCount >= 7) {
                break;
            }
            labelDb /= 10;
        }

        for (;;) {
            var labelCount = Math.floor(renderDb / labelDb) +
                Math.floor(this._maxValue / labelDb);
            if (labelCount <= 7) {
                break;
            }
            labelDb *= 2;
        }

        ctx.textBaseline = "middle";

        for (var db = 0; db <= -this._minValue; db += labelDb) {
            var axis = false;
            if (db >= -(this._minValue + (labelDb * 0.9))) {
                db = -this._minValue;
                axis = true;
            }

            var y = (db + this._maxValue) / renderDb * graphHeight;

            if (y < (labelHeight / 2)) {
                continue;
            }

            var text = "" + (-Math.round(db * 10) / 10);

            if (axis) {
                text += "\u200AdB ";
            } else {
                text += " ";
                ctx.fillStyle = darkColor;
                ctx.fillRect(labelWidth + (thin*2), y,
                    graphWidth - (thin*2), thin);
            }

            ctx.fillStyle = mainColor;
            ctx.fillRect(labelWidth - tickLength, y, tickLength, thin);

            var textWidth = ctx.measureText(text).width;
            ctx.fillText(text, labelWidth - tickLength - textWidth, y);
        }
    }

    /**
     * Renders the harmonic buffer into the foreground canvas.
     */
    renderForeground() {
        var buf = this._buffer;
        var canvas = this.foreground;
        var ctx = canvas.getContext("2d");
        var width = canvas.width;
        var height = canvas.height;
        var labelWidth = width * LABEL_WIDTH_AMT;
        var labelHeight = this.fontSize * 2;
        var graphWidth = width - labelWidth;
        var graphHeight = height - labelHeight;
        var minValue = this._minValue;
        var maxValue = this._maxValue;
        var range = maxValue - minValue;

        ctx.clearRect(0, 0, width, height);

        if (!buf) {
            return;
        }

        ctx.strokeStyle = this.getComputedStyle().color;
        ctx.lineWidth = this.thickLineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();

        for (var i = 0; i < buf.length; i++) {
            var v = buf[i];
            if (v < minValue) { v = minValue; }
            else if (v > maxValue) { v = maxValue; }

            var x = (i / buf.length * graphWidth) + labelWidth;
            var y = graphHeight * (1 - ((v - minValue) / range));

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
}

return Harmonics;
});
