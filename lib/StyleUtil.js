/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";

// The `DOMImplementation` instance to use. Relies on there being a global
// `document` to poke at.
var domImpl = document.implementation;

// Utilities for interacting with styles.
class StyleUtil {
    // Gets the computed style of the given node. The result is read-only.
    static getComputedStyle(node) {
        return node.ownerDocument.defaultView.getComputedStyle(node);
    }

    // Clones the computed style of the given node. The result can be modified
    // freely without affecting the original.
    static cloneComputedStyle(orig) {
        // We make a fresh element in a fresh document, apply the original's
        // style to it by using the text representation (which seems to be the
        // simplest way to achieve that), and then return the style object.
        var doc = domImpl.createHTMLDocument();
        var node = doc.createElement("span");

        node.style.cssText = StyleUtil.getComputedStyle(orig).cssText;
        return node.style;
    }
}
