// Copyright 2015-2024 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

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
   * Clones the computed style of the given node. The result can be modified
   * freely without affecting the original.
   *
   * @param {Element} orig Node to clone from.
   * @returns {CSSStyleDeclaration} The cloned style.
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

    // For some reason the computed compound `font` property doesn't make it
    // across (Chrome, 2023). So, do it manually. TODO: Investigate!
    style.font = origStyle.font;

    return style;
  }

  /**
   * Gets the computed style of the given node. The result is read-only.
   *
   * @param {Element} node Node whose style is to be computed.
   * @returns {CSSStyleDeclaration} The computed style.
   */
  static getComputedStyle(node) {
    return node.ownerDocument.defaultView.getComputedStyle(node);
  }
}
