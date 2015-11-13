/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";

// Canvas-drawn widget shell. This class provides the basic mechanism for
// a complex widget to be built out within a specified container node
// (typically a `div`). Drawing is assumed to be done by layering a foreground
// and background canvas, where the former is more actively modified than the
// latter. Subclasses are expected to fill in rendering functions and event
// handling as desired.
//
// This class takes care of creating the foreground and background canvases,
// sizing them such that when rendered they have square pixels, and adding them
// to the DOM. It also has a few utilities (e.g. accessing the style) to help
// simplify subclasses.
class CanvasWidget {
    // Takes a DOM `node` to insert into. The node should be an empty container.
    // `cssClass` is the class that will be assigned to a `div` which will be
    // used as the source for style information.
    constructor(node, cssClass) {
        var doc = node.ownerDocument;
        var style;

        // Make a `div` to hold the two canvases. It has to be set for
        // explicit relative positioning, otherwise the child nodes "leak"
        // out.
        var div = doc.createElement("div");
        div.className = cssClass;
        style = div.style;
        style.position = "relative";
        style.width = "100%";
        style.height = "100%";
        this._styleNode = div;
        node.appendChild(div);

        // Figure out the dimensions of the canvas based on those of the `div`,
        // ensuring the aspect ratio remains the same so as to end up with
        // square pixels.
        var width = div.clientWidth * 1.5;
        var height = (width / div.clientWidth) * div.clientHeight;

        // The fixed background canvas.
        this._background = doc.createElement("canvas");
        this._background.width = width;
        this._background.height = height;
        style = this._background.style;
        style.position = "absolute";
        style.top = "0";
        style.left = "0";
        style.width = "100%";
        style.height = "100%";
        style.zIndex = "1";

        // The main display canvas.
        this._foreground = doc.createElement("canvas");
        this._foreground.width = width;
        this._foreground.height = height;
        style = this._foreground.style;
        style.position = "absolute";
        style.top = "0";
        style.left = "0";
        style.width = "100%";
        style.height = "100%";
        style.zIndex = "2";
        style.opacity = "0.9";

        div.appendChild(this.background);
        div.appendChild(this.foreground);
    }

    // The foreground canvas.
    get foreground() {
        return this._foreground;
    }

    // The background canvas.
    get background() {
        return this._background;
    }

    // Get the computed style. The result will be read-only.
    getComputedStyle() {
        return StyleUtil.getComputedStyle(this._styleNode);
    }

    // Get a modifiable clone of the computed style.
    cloneComputedStyle() {
        return StyleUtil.cloneComputedStyle(this._styleNode);
    }

    // Set up periodic auto-refresh of the background. This is mostly of use
    // as a hackish way to be able to react to style changes (including notably
    // font loading) without getting too fancy.
    autoRefreshBackground() {
        var outerThis = this;
        var view = this._styleNode.ownerDocument.defaultView;

        function refreshBackground() {
            // We add a little bit of randomness to the delay time to avoid
            // having a massive global heartbeat.
            outerThis.renderBackground();
            view.setTimeout(refreshBackground, 1000 + (Math.random() * 500));
        }
        refreshBackground();
    }

    // Render the background. Subclasses are expected to override this.
    renderBackground() {
        var canvas = this.background;
        var style = StyleUtil.cloneComputedStyle(this._styleNode);
        var ctx = canvas.getContext("2d");

        ctx.fillStyle = Color.parse(style.backgroundColor);
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Render the foreground. Subclasses are expected to override this.
    render() {
        var canvas = this.foreground;
        var ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, width, height);
    }
}
