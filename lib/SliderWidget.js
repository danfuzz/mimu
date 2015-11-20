/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";

define(["./CanvasWidget", "./Color"], function(CanvasWidget, Color) {

/** Label font size as a fraction of canvas height. */
var LABEL_HEIGHT_AMT = 0.6;

/** Fraction of width to use for the label. */
var LABEL_WIDTH_AMT = 0.25;

/** Fraction of width to use for the slider. */
var SLIDER_WIDTH_AMT = 0.75;

/** Fraction of width to use for the handle. */
var HANDLE_WIDTH_AMT = 0.025;

/** Fraction of heightto use for the handle. */
var HANDLE_HEIGHT_AMT = 0.95;


/**
 * Slider control widget, with settable label, range, increment, and targeting.
 */
class SliderWidget extends CanvasWidget {
    /**
     * Takes a DOM node to insert the widget into. The node should be an empty
     * container.
     */
    constructor(node) {
        super(node, "slider");

        /** Label. */
        this._label = "";

        /** Minimum value. */
        this._minValue = 0;

        /** Maximum value. */
        this._maxValue = 10;

        /** Value increment. */
        this._increment = 0.1;

        /** Current value. */
        this._value = 0;

        this.renderBackground();
        this.render();

        var outerThis = this;
        this._divNode.addEventListener("mousedown", function(event) {
            outerThis.value = outerThis._xToValue(event.offsetX);
        });
        this._divNode.addEventListener("mousemove", function(event) {
            if (event.buttons !== 0) {
                outerThis.value = outerThis._xToValue(event.offsetX);
            }
        });
    }

    /**
     * Sets the label.
     */
    set label(value) {
        this._label = value;
        this.renderBackground();
    }

    /**
     * Sets the minimum value.
     */
    set minValue(value) {
        this._minValue = value;
        this.renderBackground();
        this.value = this.value;  // Clamp if necessary.
    }

    /**
     * Sets the maximum value.
     */
    set maxValue(value) {
        this._maxValue = value;
        this.renderBackground();
        this.value = this.value;  // Clamp if necessary.
    }

    /**
     * Sets the increment.
     */
    set increment(value) {
        this._increment = value;
        this.renderBackground();
        this.value = this.value;  // Clamp if necessary.
    }

    /**
     * Clamps and quantizes the given (would-be) value.
     */
    _clampAndQuantize(value) {
        value = Math.round(value / this._increment) * this._increment;
        value = Math.min(value, this._maxValue);
        value = Math.max(value, this._minValue);
        return value;
    }

    /**
     * Sets the current value.
     */
    set value(value) {
        value = this._clampAndQuantize(value);

        // Only do anything more if the value has changed.
        if (value !== this._value) {
            this._value = value;
            this.render();
        }
    }

    /**
     * Gets the current value.
     */
    get value() {
        return this._value;
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
        var labelWidth = this._labelWidth;
        var halfHeight = height / 2;

        var foregroundColor = Color.parse(style.color).toCss();

        ctx.clearRect(0, 0, width, height);

        ctx.font = style.font;
        style.fontSize = Math.round(height * LABEL_HEIGHT_AMT) + "px";
        var text = this._label + " ";
        var textWidth = ctx.measureText(text).width;
        ctx.fillStyle = foregroundColor;
        ctx.textBaseline = "middle";
        ctx.fillText(text, labelWidth - textWidth, halfHeight);

        ctx.strokeStyle = foregroundColor;
        ctx.lineWidth = this.thickLineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(this._xMin, halfHeight);
        ctx.lineTo(this._xMax, halfHeight);
        ctx.stroke();
    }

    /**
     * Renders the control position into the foreground canvas.
     */
    renderForeground() {
        var canvas = this.foreground;
        var style = this.cloneComputedStyle();
        var ctx = canvas.getContext("2d");
        var width = canvas.width;
        var height = canvas.height;
        var handleWidth = this._handleWidth;
        var handleHeight = height * HANDLE_HEIGHT_AMT;
        var halfHeight = height / 2;

        var backgroundColor = Color.parse(style.backgroundColor).toCss();
        var foregroundColor = Color.parse(style.color).toCss();

        ctx.clearRect(0, 0, width, height);

        var x = this._sliderX;
        SliderWidget._roundRectPath(ctx,
            x - (handleWidth / 2), halfHeight - (handleHeight / 2),
            handleWidth, handleHeight,
            handleWidth * 0.25);
        ctx.fillStyle = backgroundColor;
        ctx.fill();
        ctx.strokeStyle = foregroundColor;
        ctx.lineWidth = this.thinLineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        ctx.font = style.font;
        var fontSize = Math.round(handleHeight * 0.4);
        var boxHeight = fontSize * 1.5;
        style.fontSize = fontSize + "px";
        var text = " " + this._value + " ";
        var textWidth = ctx.measureText(text).width;
        var textX = (x < ((this._xMin + this._xMax) / 2))
            ? (x + handleWidth)
            : (x - handleWidth - textWidth);
        SliderWidget._roundRectPath(ctx,
            x + handleWidth, halfHeight - (boxHeight / 2),
            textWidth, boxHeight,
            handleWidth * 0.25);
        ctx.fillStyle = backgroundColor;
        ctx.fill();
        ctx.strokeStyle = foregroundColor;
        ctx.lineWidth = this.thinLineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        ctx.fillStyle = foregroundColor;
        ctx.textBaseline = "middle";
        ctx.fillText(text, x + handleWidth, halfHeight);
    }

    /** The width of the left-hand label. */
    get _labelWidth() {
        return this._foreground.width * LABEL_WIDTH_AMT;
    }

    /** The overall width of the slider area (including padding zones). */
    get _sliderWidth() {
        return this._foreground.width * SLIDER_WIDTH_AMT;
    }

    /** The width of the slider handle. */
    get _handleWidth() {
        return this._foreground.width * HANDLE_WIDTH_AMT;
    }

    /** The element-relative x value corresponding to `minValue`. */
    get _xMin() {
        // Note: The actual "throw" of slider is cut off by half a slider width
        // on either end.
        return this._labelWidth + (this._handleWidth / 2);
    }

    /** The element-relative x value corresponding to `maxValue`. */
    get _xMax() {
        // Note: The actual "throw" of slider is cut off by half a slider width
        // on either end.
        return this._labelWidth + this._sliderWidth - (this._handleWidth / 2);
    }

    /**
     * The current slider x position as an element-relative x coordinate,
     * based on the current value.
     */
    get _sliderX() {
        var totalRange = this._maxValue - this._minValue;
        var totalSlide = this._xMax - this._xMin;
        var valueRatio = (this._value - this._minValue) / totalRange;
        return this._xMin + (valueRatio * totalSlide);
    }

    /**
     * Given an element-relative x coordinate, return the corresponding
     * scaled and quantized value.
     */
    _xToValue(x) {
        var totalRange = this._maxValue - this._minValue;
        var totalSlide = this._xMax - this._xMin;
        var valueRatio = (x - this._xMin) / totalSlide;
        var value = this._minValue + (valueRatio * totalRange);
        return this._clampAndQuantize(value);
    }

    /**
     * Draws a roundrect with given radius. This code was adapted from
     * the Mozilla "Drawing Shapes" tutorial, at
     * <https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_shapes>.
     */
    static _roundRectPath(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x, y + radius);
        ctx.lineTo(x, y + height - radius);
        ctx.quadraticCurveTo(x, y + height, x + radius, y + height);
        ctx.lineTo(x + width - radius, y + height);
        ctx.quadraticCurveTo(x + width, y + height,
            x + width, y + height-radius);
        ctx.lineTo(x + width, y + radius);
        ctx.quadraticCurveTo(x + width, y, x + width - radius, y);
        ctx.lineTo(x + radius, y);
        ctx.quadraticCurveTo(x, y, x, y + radius);
    }
}

return SliderWidget;
});
