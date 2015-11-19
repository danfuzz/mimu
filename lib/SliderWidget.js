/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";

define(["./CanvasWidget", "./Color"], function(CanvasWidget, Color) {

/** Label font size as a fraction of canvas height. */
var LABEL_HEIGHT_AMT = 0.5;

/** Fraction of width to use for the label. */
var LABEL_WIDTH_AMT = 0.25;

/** Fraction of width to use for the slider. */
var SLIDER_WIDTH_AMT = 0.75;

/** Fraction of width to use for the handle. */
var HANDLE_WIDTH_AMT = 0.01;

/** Fraction of heightto use for the handle. */
var HANDLE_HEIGHT_AMT = 0.9;


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
        this._increment = 1;

        /** Current value. */
        this._value = 0;

        this.renderBackground();
        this.render();
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
     * Sets the current value.
     */
    set value(value) {
        value = Math.round(value * this._increment) / this._increment;
        value = Math.min(value, this._maxValue);
        value = Math.max(value, this._minValue);

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
        var canvas = this.foreground;
        var style = this.cloneComputedStyle();
        var ctx = canvas.getContext("2d");
        var width = canvas.width;
        var height = canvas.height;
        var labelWidth = width * LABEL_WIDTH_AMT;
        var sliderWidth = width * SLIDER_WIDTH_AMT;
        var handleWidth = width * HANDLE_WIDTH_AMT;
        var halfHeight = height / 2;

        var backgroundColor = Color.parse(style.backgroundColor).toCss();
        var foregroundColor = Color.parse(style.color).toCss();

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        var text = this._label + " ";
        var textWidth = ctx.measureText(text).width;
        style.fontSize = Math.round(height * LABEL_HEIGHT_AMT) + "px";
        ctx.fillStyle = foregroundColor;
        ctx.font = style.font;
        ctx.textBaseline = "middle";
        ctx.fillText(text, labelWidth - textWidth, halfHeight);

        ctx.strokeStyle = foregroundColor;
        ctx.lineWidth = this.thickLineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(labelWidth + (handleWidth/2), halfHeight);
        ctx.lineTo(labelWidth + sliderWidth - (handleWidth/2), halfHeight);
        ctx.stroke();
    }

    /**
     * Renders the control position into the foreground canvas.
     */
    render() {
        var canvas = this.background;
        var style = this.cloneComputedStyle();
        var ctx = canvas.getContext("2d");
        var width = canvas.width;
        var height = canvas.height;
        var labelWidth = width * LABEL_WIDTH_AMT;
        var sliderWidth = width * SLIDER_WIDTH_AMT;
        var handleWidth = width * HANDLE_WIDTH_AMT;
        var handleHeight = height * HANDLE_HEIGHT_AMT;
        var halfHeight = height / 2;

        var foregroundColor = Color.parse(style.color).toCss();

        ctx.clearRect(0, 0, width, height);

        // Actual "throw" of slider is cut off by half a slider width on either
        // end.
        var totalRange = this._maxValue - this._minValue;
        var totalSlide = sliderWidth - handleWidth;
        var x = labelWidth + (sliderWidth/2) +
            ((this._value - this._minValue) / totalRange * totalSlide);

        ctx.fillStyle = foregroundColor;
        SliderWidget._roundRectPath(ctx,
            x - (handleWidth/2), halfHeight - (handleHeight/2),
            handleWidth, handleHeight,
            handleWidth * 0.25);
        ctx.fill();
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
