/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";

define(["./CanvasWidget", "./Color"], function(CanvasWidget, Color) {

/** Fraction of width to use for the label. */
var LABEL_WIDTH_AMT = 0.25;

/** Fraction of width to use for the slider. */
var SLIDER_WIDTH_AMT = 0.75;

/** Fraction of width to use for the handle. */
var HANDLE_WIDTH_AMT = 0.025;

/** Fraction of heightto use for the handle. */
var HANDLE_HEIGHT_AMT = 0.95;


/**
 * Slider control widget, with settable label, range, increment, and display
 * precision. Use the `target` and `targetProperty` properties to give it an
 * object property to control.
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

        /** Value precision in decimal places. */
        this._precision = 1;

        /** Current value. */
        this._value = 0;

        /** Target object to control. */
        this._target = undefined;

        /** Name of the property of the target to control. */
        this._targetProperty = undefined;

        this.renderBackground();
        this.render();
        this._inputSetup();
    }

    /**
     * Sets up input event handling.
     */
    _inputSetup() {
        var outerThis = this;
        var target = this._divNode;  // Wrapper element for this instance.
        var view = target.ownerDocument.defaultView;  // The window.
        var pendingDelta = 0;  // Scroll delta not yet used.

        target.addEventListener("mousedown", mousedown);
        target.addEventListener("wheel", wheel);

        // If and when `target.setCapture(true)` (or something like it) becomes
        // standardly available, then that should be used, at which point the
        // `mousemove` event could be placed on the `target` instead of `view`,
        // thereby avoiding all the work to convert `view` coordinates to
        // `target` coordinates in the event handler.

        function mousedown(event) {
            outerThis.value = outerThis._xToValue(event.offsetX);

            view.addEventListener("mousemove", mousemove, true);
            view.addEventListener("mouseup", mouseup, true);
        }

        function mouseup(event) {
            view.removeEventListener("mousemove", mousemove, true);
            view.removeEventListener("mouseup", mouseup, true);
        }

        function mousemove(event) {
            event.stopPropagation();
            event.preventDefault();
            var targetCoords = target.getBoundingClientRect();
            var x = event.clientX - targetCoords.left;
            outerThis.value = outerThis._xToValue(x);
        }

        function wheel(event) {
            event.stopPropagation();
            event.preventDefault();

            // We treat both up and left as decrement, and down and right as
            // increment. In addition, we scale the delta if given lines or
            // pages.
            var delta = -(event.deltaX + event.deltaY);
            switch (event.deltaMode) {
                case WheelEvent.DOM_DELTA_LINE: { delta *= 10;  break; }
                case WheelEvent.DOM_DELTA_PAGE: { delta *= 100; break; }
            }

            // We only increment by "lines." However, if we're given pixels, we
            // have to build up a line across a series of events. Thus, we
            // accumulate into `pendingDelta` and take action when it's over
            // the line threshold.
            pendingDelta += delta;
            if (Math.abs(pendingDelta) > 10) {
                outerThis.value += (pendingDelta / 10) * outerThis._increment;
                pendingDelta %= 10;
            }
        }
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
        this.value = this.value;  // Clamp if necessary.
        this.render();
    }

    /**
     * Sets the maximum value.
     */
    set maxValue(value) {
        this._maxValue = value;
        this.value = this.value;  // Clamp if necessary.
        this.render();
    }

    /**
     * Sets the increment.
     */
    set increment(value) {
        this._increment = value;
        this.value = this.value;  // Clamp if necessary.
    }

    /**
     * Sets the precision, in decimal places.
     */
    set precision(value) {
        this._precision = value;
        this.render();
    }

    /**
     * Sets the target to control. The existing value in the target is pulled
     * in as the value of this instance.
     */
    set target(t) {
        this._target = t;
        if (t && this._targetProperty) {
            this.value = t[this._targetProperty];
        }
    }

    /**
     * Sets the target property to control (by name).
     */
    set targetProperty(name) {
        this._targetProperty = name;
        this._target = this._target; // Grab the value if possible.
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

            if (this._target && this._targetProperty) {
                this._target[this._targetProperty] = value;
            }
        }
    }

    /**
     * Gets the current value.
     */
    get value() {
        return this._value;
    }

    /**
     * Gets the current value as formatted text.
     */
    get valueText() {
        return this._value.toFixed(this._precision);
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
        style.fontSize = this.fontSizePx;
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

        if (this._value === undefined) {
            return;
        }

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
        ctx.beginPath();
        ctx.moveTo(x, halfHeight - (handleHeight / 2));
        ctx.lineTo(x, halfHeight + (handleHeight / 2));
        ctx.stroke();

        ctx.font = style.font;
        var fontSize = Math.round(handleHeight * 0.25);
        var boxHeight = fontSize * 3;
        style.fontSize = fontSize + "px";
        var text = " " + this.valueText + " ";
        var textWidth = ctx.measureText(text).width;
        var textX = (this._sliderSide === "left")
            ? (x + (handleWidth * 2))
            : (x - (handleWidth * 2) - textWidth);
        SliderWidget._roundRectPath(ctx,
            textX, halfHeight - (boxHeight / 2),
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
        ctx.fillText(text, textX, halfHeight);
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
        // on either end, plus a little bit extra to account for the thickness
        // of the stroke around the handle.
        return this._labelWidth + (this._handleWidth / 2) + this.thinLineWidth;
    }

    /** The element-relative x value corresponding to `maxValue`. */
    get _xMax() {
        // Note: The actual "throw" of slider is cut off by half a slider width
        // on either end.
        return this._labelWidth + this._sliderWidth - (this._handleWidth / 2)
            - this.thinLineWidth;
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
     * Which side the slider is on. Either "left" or "right".
     */
    get _sliderSide() {
        return (this._value < ((this._minValue + this._maxValue) / 2))
            ? "left" : "right";
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
