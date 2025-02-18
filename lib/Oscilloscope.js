// Copyright 2015-2025 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

import { CanvasWidget } from './CanvasWidget.js';
import { Color } from './Color.js';

/** Fraction of width which is to be used for labels. */
const LABEL_WIDTH_AMT = 0.06;

/**
 * Oscilloscope renderer. Expects values in the range `-1` to `1`. If timing
 * labels are to be drawn, then the `sampleRate` needs to be set.
 *
 * Note that, only half of a buffer will ever be rendered: The renderer
 * attempts to find an upward zero-crossing somewhere in the first half of
 * the buffer and renders from there. This helps make for a more stable
 * display.
 */
export class Oscilloscope extends CanvasWidget {
  /** Sample rate. Used for generating labels. */
  #sampleRate = 0;

  /** Buffer of samples to render.*/
  #buffer = undefined;

  /**
   * Takes a DOM node to insert an oscilloscope into. The node should
   * be an empty container.
   *
   * @param {Element} node The node to insert into.
   */
  constructor(node) {
    super(node, 'soundDisplay');

    this.foregroundOpacity = 0.9;  // Show a bit of the background through.
    this.render();                 // Draw an empty display.
  }

  /** @returns {Float32Array} The sample data buffer. */
  get buffer() {
    return this.#buffer;
  }

  /**
   * Sets the sample data buffer.
   *
   * @param {Float32Array} buffer The sample data buffer.
   */
  set buffer(buffer) {
    this.#buffer = buffer;
    this.renderBackground();
  }

  /**
   * @returns {number} The font size. Override of parent method. In this case,
   * the font size follows the width of the canvas.
   */
  get fontSize() {
    return this.foreground.width / 70;
  }

  /**
   * Sets the sample rate, in samples per second.
   *
   * @param {number} value The sample rate.
   */
  set sampleRate(value) {
    this.#sampleRate = value;
    this.renderBackground();
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
    const labelWidth = width * LABEL_WIDTH_AMT;
    const graphWidth = width - labelWidth;
    const graphHeight = height;
    const middleY = graphHeight / 2;
    const thin = this.thinLineWidth;
    const tickLength = this.fontSize / 2;

    let backgroundColor = Color.parse(style.backgroundColor);
    const foregroundColor = Color.parse(style.color);
    const mainColor = foregroundColor.mix(backgroundColor, 0.5).toCss();
    const darkColor = foregroundColor.mix(backgroundColor, 0.1).toCss();
    backgroundColor = backgroundColor.toCss();

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = mainColor;
    ctx.fillRect(labelWidth, 0, thin, graphHeight);

    const bufferSize = this.#buffer && this.#buffer.length;
    const sampleRate = this.#sampleRate;
    if (!(bufferSize && (bufferSize > 0)
          && sampleRate && (sampleRate > 0))) {
      return;
    }

    style.fontSize = this.fontSizePx;
    ctx.font = style.font;

    // Label the y axis (instantaneous amplitude).

    ctx.textBaseline = 'middle';

    for (let v = -0.75; v < 1; v += 0.25) {
      const y = (-v + 1) / 2 * graphHeight;
      const text = v + ' ';
      if ((v * 2) === Math.round(v * 2)) {
        const extraX = (v === 0) ? 0 : (thin * 2);
        ctx.fillStyle = (v === 0) ? mainColor : darkColor;
        ctx.fillRect(labelWidth + extraX, y, graphWidth - extraX, thin);
      }
      ctx.fillStyle = mainColor;
      ctx.fillRect(labelWidth - tickLength, y, tickLength, thin);

      const textWidth = ctx.measureText(text).width;
      ctx.fillText(text, labelWidth - tickLength - textWidth, y);
    }

    // Aim for up to ten time labels (with zero unlabeled). The `labelSecs`
    // calculation rounds the total buffer width in seconds down to a
    // power of ten; from there, we double the label count until we hit
    // more than ten.
    const renderSize = bufferSize / 2;
    const renderSecs = renderSize / sampleRate;
    let labelSecs = Math.pow(10, Math.floor(Math.log10(renderSecs)));

    for (;;) {
      const labelCount = Math.floor(renderSecs / labelSecs);
      if (labelCount > 10) {
        labelSecs *= 2;  // Because we went one too far in the loop.
        break;
      }
      labelSecs /= 2;
    }

    ctx.textBaseline = 'top';

    for (let s = labelSecs; s < renderSecs; s += labelSecs) {
      const x = (graphWidth * ((s * sampleRate) / renderSize)) + labelWidth;
      const text = (Math.round(s * 100000) / 100) + '\u200Ams';

      ctx.fillStyle = darkColor;
      ctx.fillRect(x, 0, thin, height);

      ctx.fillStyle = mainColor;
      ctx.fillRect(x, middleY - (tickLength / 2), thin, tickLength);

      const textWidth = ctx.measureText(text).width;
      if ((x + (textWidth / 2)) < width) {
        ctx.fillText(text,
          x - (textWidth / 2), middleY + (tickLength / 2));
      }
    }
  }

  /**
   * Renders the oscilloscope's sample buffer into the foreground canvas.
   */
  renderForeground() {
    const buf = this.#buffer;
    const canvas = this.foreground;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const labelWidth = width * LABEL_WIDTH_AMT;
    const graphWidth = width - labelWidth;
    const graphHeight = height;

    ctx.clearRect(0, 0, width, height);

    if (!buf) {
      return;
    }

    ctx.strokeStyle = this.getComputedStyle().color;
    ctx.lineWidth = this.thickLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    // Find an upward zero-crossing, or fall back if it doesn't seem
    // fruitful.
    const idxMax = buf.length / 2;
    let base = 0;
    while ((base < idxMax) && (buf[base] >= 0)) { base++; }
    while ((base < idxMax) && (buf[base] < 0)) { base++; }
    if (base >= idxMax) {
      base = 0; // No suitable zero-crossing.
    }

    for (let idx = 0; idx < idxMax; idx++) {
      const samp = buf[base + idx];
      const x = labelWidth + (idx / idxMax * graphWidth);
      const y = (-samp + 1) / 2 * graphHeight;
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
}
