/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";

// Utilities for interacting with styles. Instances are constructed with
// a node from which to get the "original" CSS style. From there, you can
// modify properties of the
// instance and then extract the modified properties, included computed
// properties.
class StyleUtil {
    // Clones the computed style of the given node. The result can be modified
    // freely without affecting the original.
    static cloneComputedStyle(orig) {
        // We make a fresh element, apply the original's style to it by
        // using the text representation (which seems to be the simplest way
        // to achieve that), and then return the style object.
        var doc = orig.ownerDocument;
        var node = doc.createElement("span");

        node.style.cssText = doc.defaultView.getComputedStyle(orig).cssText;
        return node.style;
    }
}
