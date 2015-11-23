/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";

define(["./CanvasWidget", "./Color"], function(CanvasWidget, Color) {

/** Fraction of font size to use as the width of keys. */
var KEY_WIDTH_AMT = 2;

/**
 * Fraction of font size to use as spacing between keys, both horizontally
 * and vertically.
 */
var KEY_SPACING_AMT = 0.25;

/**
 * Fraction of font size to use as padding on all sides. Note that the "stroke"
 * around keys will end up in this area.
 */
var PADDING_AMT = 0.1;

/**
 * Piano keyboard control widget.
 */
class PianoWidget extends CanvasWidget {
    /**
     * Takes a DOM node to insert the widget into. The node should be an empty
     * container.
     */
    constructor(node) {
        super(node, "piano");

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
        var touchId = undefined;  // Id of touch currently being tracked.
        var pendingDelta = 0;  // Scroll delta not yet used.

        target.addEventListener("touchstart",  touch);
        target.addEventListener("touchend",    touch);
        target.addEventListener("touchmove",   touch);
        target.addEventListener("touchcancel", touch);
        target.addEventListener("mousedown",   mousedown);
        target.addEventListener("wheel",       wheel);

        // If and when `target.setCapture(true)` (or something like it) becomes
        // standardly available, then that should be used, at which point the
        // `mousemove` event could be placed on `target` instead of on `view`,
        // thereby avoiding all the work to add and remove mouse event handlers.
        //
        // Note that touch events already do the right thing, that is, touches
        // that start within a given element will continue to generate events
        // for that element even after the touch has moved out of the element's
        // bounds.

        function touch(event) {
            // All touch events are processed by the same handler (this
            // function). Multitouch is handled here by ignoring all but
            // whichever touch was last tracked. If that touch is no longer
            // available, then a different one is picked.

            var touches = event.targetTouches;
            if (touches.length === 0) {
                return;
            }

            event.stopPropagation();
            event.preventDefault();

            var t = touches[0];  // By default, pick the first touch.
            if (touchId !== undefined) {
                // Grab the previously-tracked touch, if available.
                for (var i = 0; i < touches.length; i++) {
                    if (touches[i].identifier === touchId) {
                        t = touches[i];
                        break;
                    }
                }
            }

            var targetCoords = target.getBoundingClientRect();

            outerThis.value = outerThis._xToValue(
                t.clientX - targetCoords.left);
            touchId = t.identifier;
        }

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

            // We treat both down and left as decrement, and up and right as
            // increment. In addition, we scale the delta if given lines or
            // pages.
            var delta = -event.deltaX + event.deltaY;
            switch (event.deltaMode) {
                case WheelEvent.DOM_DELTA_LINE: { delta *= 10;  break; }
                case WheelEvent.DOM_DELTA_PAGE: { delta *= 100; break; }
            }

            // We only increment by "lines." However, if we're given in the
            // event pixels, then we might have to build up a line across a
            // series of events. Thus, we accumulate into `pendingDelta` and
            // take action when it's over the line threshold.
            pendingDelta += delta;
            if (Math.abs(pendingDelta) > 10) {
                outerThis.value += (pendingDelta / 10) * outerThis._increment;
                pendingDelta %= 10;
            }
        }
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
        var halfHeight = height / 2;
        var fontSize = this.fontSize;
        var rectRadius = fontSize * 0.25;
        var keyWidth = fontSize * KEY_WIDTH_AMT;
        var keySpacing = fontSize * KEY_SPACING_AMT;
        var padding = fontSize * PADDING_AMT;
        var keyHeight = halfHeight - (keySpacing / 2) - padding;
        var x, y;

        var backgroundColor = Color.parse(style.backgroundColor);
        var foregroundColor = Color.parse(style.color);
        var borderColor = backgroundColor.mix(foregroundColor);

        ctx.clearRect(0, 0, width, height);

        ctx.strokeStyle = borderColor.toCss();
        ctx.lineWidth = this.thinLineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.fillStyle = foregroundColor.toCss();
        y = halfHeight + (keySpacing / 2);
        for (var i = 0; i < 25; i++) {
            x = padding + (i * (keySpacing + keyWidth));
            PianoWidget._roundRectPath(ctx, x, y, keyWidth, keyHeight,
                rectRadius);
            ctx.fill();
            ctx.stroke();
        }

        ctx.fillStyle = backgroundColor.toCss();
        y = halfHeight - (keySpacing / 2) - keyHeight;
        for (var i = 0; i < 25; i++) {
            var note = i % 7;
            if ((note === 2) || (note === 6)) {
                continue;
            }
            x = padding + ((i + 0.5) * (keySpacing + keyWidth));
            PianoWidget._roundRectPath(ctx, x, y, keyWidth, keyHeight,
                rectRadius);
            ctx.fill();
            ctx.stroke();
        }
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

        ctx.clearRect(0, 0, width, height);
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

return PianoWidget;
});
