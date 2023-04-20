// Copyright 2015-2023 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

import { CanvasWidget } from './CanvasWidget.js';
import { Color } from './Color.js';

/** Fraction of font size to use for the handle width. */
const HANDLE_WIDTH_AMT = 0.8;

/** Fraction of height to use for the handle. */
const HANDLE_HEIGHT_AMT = 0.95;


/**
 * Slider control widget, with settable range, increment, and display
 * precision. Use the `target` and `targetProperty` properties to give it an
 * object property to control.
 */
export class SliderWidget extends CanvasWidget {
  /** Minimum value. */
  #minValue = 0;

  /** Maximum value. */
  #maxValue = 10;

  /** Value increment. */
  #increment = 0.1;

  /** Value precision in decimal places. */
  #precision = 1;

  /** Current value. */
  #value = 0;

  /** Function to call when the value is updated. */
  #updater = null;

  /**
   * Takes a DOM node to insert the widget into. The node should be an empty
   * container. If given, `props` are taken to be the initial property
   * bindings.
   */
  constructor(node, props) {
    super(node, 'slider');

    if (props) {
      for (const [key, value] of Object.entries(props)) {
        switch (key) {
          case 'increment': { this.#increment = value; break; }
          case 'maxValue':  { this.#maxValue  = value; break; }
          case 'minValue':  { this.#minValue  = value; break; }
          case 'precision': { this.#precision = value; break; }
          case 'updater':   { this.#updater   = value; break; }
          case 'value':     { this.#value     = value; break; }
        }
      }
    }

    this.render();
    this.#inputSetup();
  }

  /**
   * Gets the current value.
   */
  get value() {
    return this.#value;
  }

  /**
   * Sets the current value.
   */
  set value(value) {
    value = this.#clampAndQuantize(value);

    // Only do anything more if the value has changed.
    if (value !== this.#value) {
      this.#value = value;
      this.render();

      if (this.#updater) {
        // `?? null` so that it's a regular function call, not a method call.
        (this.#updater ?? null)(value);
      }
    }
  }

  /**
   * Renders the background canvas.
   */
  renderBackground() {
    const canvas = this.background;
    const style = this.cloneComputedStyle();
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const halfHeight = height / 2;

    const foregroundColor = Color.parse(style.color).toCss();

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = foregroundColor;
    ctx.lineWidth = this.thickLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.#xMin, halfHeight);
    ctx.lineTo(this.#xMax, halfHeight);
    ctx.stroke();
  }

  /**
   * Renders the control position into the foreground canvas.
   */
  renderForeground() {
    const canvas = this.foreground;
    const style = this.cloneComputedStyle();
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const handleWidth = this.#handleWidth;
    const handleHeight = height * HANDLE_HEIGHT_AMT;
    const halfHeight = height / 2;

    const backgroundColor = Color.parse(style.backgroundColor).toCss();
    const foregroundColor = Color.parse(style.color).toCss();

    ctx.clearRect(0, 0, width, height);

    if (this.#value === undefined) {
      return;
    }

    const x = this.#sliderX;
    SliderWidget.#roundRectPath(ctx,
      x - (handleWidth / 2), halfHeight - (handleHeight / 2),
      handleWidth, handleHeight,
      handleWidth * 0.25);
    ctx.fillStyle = backgroundColor;
    ctx.fill();
    ctx.strokeStyle = foregroundColor;
    ctx.lineWidth = this.thinLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, halfHeight - (handleHeight / 2));
    ctx.lineTo(x, halfHeight + (handleHeight / 2));
    ctx.stroke();

    ctx.font = style.font;
    const fontSize = Math.round(handleHeight * 0.25);
    const boxHeight = fontSize * 3;
    style.fontSize = fontSize + 'px';
    const text = ` ${this.#valueText} `;
    const textWidth = ctx.measureText(text).width;
    const textX = (this.#sliderSide === 'left')
      ? (x + (handleWidth * 2))
      : (x - (handleWidth * 2) - textWidth);
    SliderWidget.#roundRectPath(ctx,
      textX, halfHeight - (boxHeight / 2),
      textWidth, boxHeight,
      handleWidth * 0.25);
    ctx.fillStyle = backgroundColor;
    ctx.fill();
    ctx.strokeStyle = foregroundColor;
    ctx.lineWidth = this.thinLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.fillStyle = foregroundColor;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, textX, halfHeight);
  }

  /** The width of the slider handle. */
  get #handleWidth() {
    return this.fontSize * HANDLE_WIDTH_AMT;
  }

  /**
   * Which side the slider is on. Either "left" or "right".
   */
  get #sliderSide() {
    return (this.#value < ((this.#minValue + this.#maxValue) / 2))
      ? 'left' : 'right';
  }

  /**
   * The current slider x position as an element-relative x coordinate,
   * based on the current value.
   */
  get #sliderX() {
    const totalRange = this.#maxValue - this.#minValue;
    const totalSlide = this.#xMax - this.#xMin;
    const valueRatio = (this.#value - this.#minValue) / totalRange;
    return this.#xMin + (valueRatio * totalSlide);
  }

  /** The current value as formatted text. */
  get #valueText() {
    return this.#value.toFixed(this.#precision);
  }

  /** The element-relative x value corresponding to `minValue`. */
  get #xMin() {
    // Note: The actual "throw" of slider is cut off by half a slider width
    // on either end, plus a little bit extra to account for the thickness
    // of the stroke around the handle.
    return (this.#handleWidth / 2) + this.thinLineWidth;
  }

  /** The element-relative x value corresponding to `maxValue`. */
  get #xMax() {
    // Note: The actual "throw" of slider is cut off by half a slider width
    // on either end.
    return this.foreground.width
      - (this.#handleWidth / 2) - this.thinLineWidth;
  }

  /**
   * Clamps and quantizes the given (would-be) value.
   */
  #clampAndQuantize(value) {
    if (((typeof value) !== 'number') || isNaN(value)) {
      value = 0;
    }

    value = Math.round(value / this.#increment) * this.#increment;
    value = Math.min(value, this.#maxValue);
    value = Math.max(value, this.#minValue);
    return value;
  }

  /**
   * Sets up input event handling.
   */
  #inputSetup() {
    const outerThis = this;
    const target = this.divNode;  // Wrapper element for this instance.
    const view = target.ownerDocument.defaultView;  // The window.
    let touchId = undefined;  // Id of touch currently being tracked.
    let pendingDelta = 0;  // Scroll delta not yet used.

    target.addEventListener('touchstart',  touch);
    target.addEventListener('touchend',    touch);
    target.addEventListener('touchmove',   touch);
    target.addEventListener('touchcancel', touch);
    target.addEventListener('mousedown',   mousedown);
    target.addEventListener('wheel',       wheel);

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

      const touches = event.targetTouches;
      if (touches.length === 0) {
        return;
      }

      event.stopPropagation();
      event.preventDefault();

      let t = touches[0];  // By default, pick the first touch.
      if (touchId !== undefined) {
        // Grab the previously-tracked touch, if available.
        for (let i = 0; i < touches.length; i++) {
          if (touches[i].identifier === touchId) {
            t = touches[i];
            break;
          }
        }
      }

      const targetCoords = target.getBoundingClientRect();

      outerThis.value = outerThis.#xToValue(
        t.clientX - targetCoords.left);
      touchId = t.identifier;
    }

    function mousedown(event) {
      outerThis.value = outerThis.#xToValue(event.offsetX);

      view.addEventListener('mousemove', mousemove, true);
      view.addEventListener('mouseup', mouseup, true);
    }

    function mouseup(event_unused) {
      view.removeEventListener('mousemove', mousemove, true);
      view.removeEventListener('mouseup', mouseup, true);
    }

    function mousemove(event) {
      event.stopPropagation();
      event.preventDefault();
      const targetCoords = target.getBoundingClientRect();
      const x = event.clientX - targetCoords.left;
      outerThis.value = outerThis.#xToValue(x);
    }

    function wheel(event) {
      event.stopPropagation();
      event.preventDefault();

      // We treat both down and left as decrement, and up and right as
      // increment. In addition, we scale the delta if given lines or
      // pages.
      let delta = -event.deltaX + event.deltaY;
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
        outerThis.value += (pendingDelta / 10) * outerThis.#increment;
        pendingDelta %= 10;
      }
    }
  }

  /**
   * Given an element-relative x coordinate, return the corresponding
   * scaled and quantized value.
   */
  #xToValue(x) {
    const totalRange = this.#maxValue - this.#minValue;
    const totalSlide = this.#xMax - this.#xMin;
    const valueRatio = (x - this.#xMin) / totalSlide;
    const value = this.#minValue + (valueRatio * totalRange);
    return this.#clampAndQuantize(value);
  }


  //
  // Static members
  //

  /**
   * Draws a roundrect with given radius. This code was adapted from
   * the Mozilla "Drawing Shapes" tutorial, at
   * <https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_shapes>.
   */
  static #roundRectPath(ctx, x, y, width, height, radius) {
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
