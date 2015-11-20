/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";

define(["./StyleUtil"], function(StyleUtil) {

/** Fraction of the canvas width to take as the width of a thin line. */
var THIN_LINE_AMT = 0.002;

/** Fraction of the canvas width to take as the width of a thick line. */
var THICK_LINE_AMT = 0.00275;

/**
 * Canvas-drawn widget shell. This class provides the basic mechanism for
 * a complex widget to be built out within a specified container node
 * (typically a `div`). Drawing is assumed to be done by layering a foreground
 * and background canvas, where the former is more actively modified than the
 * latter. Subclasses are expected to fill in rendering functions and event
 * handling as desired.
 *
 * This class takes care of creating the foreground and background canvases,
 * sizing them such that when rendered they have square pixels, and adding them
 * to the DOM. It also has a few utilities (e.g. accessing the style) to help
 * simplify subclasses.
 */
class CanvasWidget {
    /**
     * Takes a DOM `node` to insert into. The node should be an empty container.
     * `cssClass` is the class that will be assigned to a `div` which will be
     * used as the source for style information.
     */
    constructor(node, cssClass) {
        var doc = node.ownerDocument;
        var style;

        // Make a `div` to hold the two canvases. It has to be set for
        // explicit relative positioning, otherwise the child nodes "leak"
        // out.
        this._divNode = doc.createElement("div");
        style = this._divNode.style;
        style.position = "relative";
        style.width = "100%";
        style.height = "100%";
        node.appendChild(this._divNode);

        /** The node which is consulted for CSS style info. */
        this._styleNode = doc.createElement("span");
        this._styleNode.className = cssClass;
        this._styleNode.display = "hidden";
        this._divNode.appendChild(this._styleNode);

        /** The fixed background canvas. */
        this._background = doc.createElement("canvas");
        style = this._background.style;
        style.position = "absolute";
        style.top = "0";
        style.left = "0";
        style.width = "100%";
        style.height = "100%";
        style.zIndex = "1";

        /** The main display canvas. */
        this._foreground = doc.createElement("canvas");
        style = this._foreground.style;
        style.position = "absolute";
        style.top = "0";
        style.left = "0";
        style.width = "100%";
        style.height = "100%";
        style.zIndex = "2";

        this._adjustCanvasSizes();
        this._autoAdjustCanvasSizes();
        this._autoRefreshBackground();
        this._divNode.appendChild(this.background);
        this._divNode.appendChild(this.foreground);
    }

    /**
     * Sets up periodic auto-refresh of the background. This is mostly of use
     * as a hackish way to be able to react to style changes (including notably
     * font loading) without getting too fancy.
     */
    _autoRefreshBackground() {
        var outerThis = this;
        var view = this.defaultView;

        function refreshBackground() {
            // We add a little bit of randomness to the delay time to avoid
            // having a massive global heartbeat.
            outerThis.renderBackground();
            view.setTimeout(refreshBackground, 1000 + (Math.random() * 500));
        }
        refreshBackground();
    }

    /**
     * Sets up a listener to automatically adjust the canvas sizes if the
     * view gets resized. This attempts to only do a canvas resize after the
     * user is done adjusting the window.
     */
    _autoAdjustCanvasSizes() {
        var outerThis = this;
        var view = this.defaultView;
        var pending = 0;

        view.addEventListener("resize", function() {
            pending++;
            view.setTimeout(function() {
                pending--;
                if (pending === 0) {
                    outerThis._adjustCanvasSizes();
                }
            }, 500);
        });
    }

    /**
     * Sets up the dimensions of the canvases.
     */
    _adjustCanvasSizes() {
        // Copy the dimensions of the canvas from the `div`, which ensures the
        // aspect ratio remains the same. Thus, the canvases will have square
        // pixels.
        var node = this._divNode;
        var fg = this._foreground;
        var bg = this._background;
        var width = node.clientWidth;
        var height = node.clientHeight;

        if ((width != fg.width) || (height != fg.height)) {
            fg.width = width;
            fg.height = height;
            bg.width = width;
            bg.height = height;
            this.renderBackground();
            this.render();
        }
    }

    /**
     * Sets the opacity of the foreground. By default it is 100% opaque.
     */
    set foregroundOpacity(value) {
        this._foreground.style.opacity = value;
    }

    /**
     * Gets the "default view" (typically the window of the document).
     */
    get defaultView() {
        return this._divNode.ownerDocument.defaultView;
    }

    /**
     * Gets the foreground canvas.
     */
    get foreground() {
        return this._foreground;
    }

    /**
     * Gets the background canvas.
     */
    get background() {
        return this._background;
    }

    /**
     * Gets the line width to use for "thin" lines.
     */
    get thinLineWidth() {
        return Math.max(1, Math.floor(this._foreground.width * THIN_LINE_AMT));
    }

    /**
     * Gets the line width to use for "thick" lines.
     */
    get thickLineWidth() {
        return Math.max(1, Math.floor(this._foreground.width * THICK_LINE_AMT));
    }

    /**
     * Gets the computed style. The result will be read-only.
     */
    getComputedStyle() {
        return StyleUtil.getComputedStyle(this._styleNode);
    }

    /**
     * Gets a modifiable clone of the computed style.
     */
    cloneComputedStyle() {
        return StyleUtil.cloneComputedStyle(this._styleNode);
    }

    /**
     * Renders the background. Subclasses are expected to override this.
     */
    renderBackground() {
        var canvas = this.background;
        var style = StyleUtil.cloneComputedStyle(this._styleNode);
        var ctx = canvas.getContext("2d");

        ctx.fillStyle = Color.parse(style.backgroundColor);
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    /**
     * Renders the foreground. Subclasses are expected to override this.
     */
    render() {
        var canvas = this.foreground;
        var ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

return CanvasWidget;
});
