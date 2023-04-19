/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

/**
 * The `DOMImplementation` instance to use. Relies on there being a global
 * `document` to poke at.
 */
const domImpl = document.implementation;

/**
 * Utilities for interacting with styles.
 */
export class StyleUtil {
  /**
     * Gets the computed style of the given node. The result is read-only.
     */
  static getComputedStyle(node) {
    return node.ownerDocument.defaultView.getComputedStyle(node);
  }

  /**
     * Clones the computed style of the given node. The result can be modified
     * freely without affecting the original.
     */
  static cloneComputedStyle(orig) {
    // We make a fresh element in a fresh document, apply the original's
    // style to it by iterating over all the elements (which seems to be the
    // simplest way to achieve that), and then return the style object.
    const origStyle = StyleUtil.getComputedStyle(orig);
    const doc       = domImpl.createHTMLDocument();
    const node      = doc.createElement('span');
    const style     = node.style;

    for (const prop of origStyle) {
      style[prop] = origStyle[prop];
    }

    return style;
  }
}
