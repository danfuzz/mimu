// Copyright 2015-2023 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

import { Color } from './Color.js';
import { StyleUtil } from './StyleUtil.js';

/**
 * Canvas-drawn widget shell. This class provides the basic mechanism for
 * a complex widget to be built out within a specified container node
 * (typically an empty `div` or `td`). Drawing is assumed to be done by
 * layering a foreground and background canvas, where the former is more
 * actively modified than the latter. Subclasses are expected to fill in
 * rendering functions and event handling as desired.
 *
 * This class takes care of creating the foreground and background canvases,
 * sizing them such that when rendered they have square pixels, and adding them
 * to the DOM. It also has a few utilities (e.g. accessing the style) to help
 * simplify subclasses.
 *
 * This class has facilities to allow for dynamic font and line thickness
 * adjustment (with line widths following font size). By default, font size
 * is simply inherited from the style; to enable automatic adjustment based on
 * other factors (such as widget dimensions), override the `get fontSize()`
 * method.
 */
export class CanvasWidget {
  #divNode;
  #styleNode;
  #background;
  #foreground;

  /**
   * Takes a DOM `node` to insert into. The node should be an empty container.
   * `cssClass` is the class that will be assigned to a `span` which will be
   * used as the source for style information.
   *
   * @param {Element} node DOM node to apply to.
   * @param {string} cssClass Class name for the style `span`.
   */
  constructor(node, cssClass) {
    const doc = node.ownerDocument;
    let style;

    // Make a `div` to hold the two canvases. It has to be set for
    // explicit relative positioning, otherwise the child nodes "leak"
    // out.
    this.#divNode = doc.createElement('div');
    style = this.#divNode.style;
    style.position = 'relative';
    style.width = '100%';
    style.height = '100%';
    node.appendChild(this.#divNode);

    /** The node which is consulted for CSS style info. */
    this.#styleNode = doc.createElement('span');
    this.#styleNode.className = cssClass;
    this.#styleNode.display = 'hidden';
    this.#divNode.appendChild(this.#styleNode);

    /** The fixed background canvas. */
    this.#background = doc.createElement('canvas');
    style = this.#background.style;
    style.position = 'absolute';
    style.top = '0';
    style.left = '0';
    style.width = '100%';
    style.height = '100%';
    style.zIndex = '1';

    /** The main display canvas. */
    this.#foreground = doc.createElement('canvas');
    style = this.#foreground.style;
    style.position = 'absolute';
    style.top = '0';
    style.left = '0';
    style.width = '100%';
    style.height = '100%';
    style.zIndex = '2';

    this.#divNode.appendChild(this.background);
    this.#divNode.appendChild(this.foreground);

    (async () => {
      await null; // So that all this is done after the constructor returns.
      this.#adjustCanvasSizes();
      this.#autoAdjustCanvasSizes();
      this.#autoRefresh();
    })();
  }

  /** @returns {Element} The background canvas. */
  get background() {
    return this.#background;
  }

  /**
   * @returns {Window} The "default view" (typically the window of the
   * document).
   */
  get defaultView() {
    return this.#divNode.ownerDocument.defaultView;
  }

  /**
   * @returns {number} The device pixel ratio.
   */
  get devicePixelRatio() {
    return window.devicePixelRatio ?? 1;
  }

  /**
   * @returns {Element} The `div` node that holds everything else for this
   * instance.
   */
  get divNode() {
    return this.#divNode;
  }

  /**
   * @returns {number} The size of the font to use for "normal size" text, in
   * pixels. The value is a number, not a string. To use this size for a style
   * or canvas setting, instead refer to the property `fontSizePx`.
   *
   * This implementation derives the value from the CSS style. Subclasses may
   * override this to implement other behavior.
   */
  get fontSize() {
    // The size will always be a string of the form `NNNpx`. We strip off
    // the suffix and convert to a simple number.
    const sizeStr = StyleUtil.getComputedStyle(this.#styleNode).fontSize;
    const match = sizeStr.match(/^([0-9.]+)px$/);

    if (!match) {
      throw Error('Weird font size: ' + sizeStr);
    }

    const size = parseFloat(match[1]);
    if (isNaN(size)) {
      throw Error('Weird font size: ' + sizeStr);
    }

    return size * this.devicePixelRatio;
  }

  /**
   * @returns {string} {@link #fontSize} as a string suitable for use as a CSS
   * or canvas property value.
   */
  get fontSizePx() {
    return this.fontSize.toFixed(1) + 'px';
  }

  /** @returns {Element} The foreground canvas. */
  get foreground() {
    return this.#foreground;
  }

  /**
   * Sets the opacity of the foreground. By default it is 100% opaque.
   */
  set foregroundOpacity(value) {
    this.#foreground.style.opacity = value;
  }

  /**
   * @returns {number} The line width to use for "thick" lines. This is defined
   * as 3/20 of the font size, but clamped at the low end at 1.
   */
  get thickLineWidth() {
    return Math.max(1, this.fontSize * 0.15);
  }

  /**
   * @returns {number} The line width to use for "thin" lines. This is defined
   * as 1/20 of the font size, but clamped at the low end at 0.75.
   */
  get thinLineWidth() {
    return Math.max(0.75, this.fontSize * 0.05);
  }

  /**
   * Gets a modifiable clone of the computed style.
   *
   * @returns {CSSStyleDeclaration} The cloned style.
   */
  cloneComputedStyle() {
    return StyleUtil.cloneComputedStyle(this.#styleNode);
  }

  /**
   * Gets the computed style. The result will be read-only.
   *
   * @returns {CSSStyleDeclaration} The computed style.
   */
  getComputedStyle() {
    return StyleUtil.getComputedStyle(this.#styleNode);
  }

  /**
   * Renders both background and foreground. Subclasses should not override
   * this.
   */
  render() {
    this.renderBackground();
    this.renderForeground();
  }

  /**
   * Renders the background. Subclasses are expected to override this.
   */
  renderBackground() {
    const canvas = this.background;
    const style = StyleUtil.cloneComputedStyle(this.#styleNode);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = Color.parse(style.backgroundColor);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  /**
   * Renders the foreground. Subclasses are expected to override this.
   */
  renderForeground() {
    const canvas = this.foreground;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /**
   * Sets up the dimensions of the canvases.
   */
  #adjustCanvasSizes() {
    // Copy the dimensions of the canvas from the `div`, which ensures the
    // aspect ratio remains the same. Thus, the canvases will have square
    // pixels.
    const node   = this.#divNode;
    const ratio  = window.devicePixelRatio ?? 1;
    const width  = ratio * node.clientWidth;
    const height = ratio * node.clientHeight;

    const fg = this.#foreground;
    const bg = this.#background;

    if ((width !== fg.width) || (height !== fg.height)) {
      fg.width  = width;
      fg.height = height;
      bg.width  = width;
      bg.height = height;
      this.render();
    }
  }

  /**
   * Sets up periodic auto-refresh of the canvases. This is mostly of use
   * as a hackish way to be able to react to style changes (including notably
   * font loading) without getting too fancy.
   */
  #autoRefresh() {
    const view = this.defaultView;

    const refresh = () => {
      // We add a little bit of randomness to the delay time to avoid
      // having a massive global heartbeat.
      this.render();
      view.setTimeout(refresh, 1000 + (Math.random() * 500));
    };

    refresh();
  }

  /**
   * Sets up a listener to automatically adjust the canvas sizes if the
   * view gets resized. This attempts to only do a canvas resize after the
   * user is done adjusting the window.
   */
  #autoAdjustCanvasSizes() {
    const outerThis = this;
    const view = this.defaultView;
    let pending = 0;

    view.addEventListener('resize', () => {
      pending++;
      view.setTimeout(() => {
        pending--;
        if (pending === 0) {
          outerThis.#adjustCanvasSizes();
        }
      }, 500);
    });
  }
}
