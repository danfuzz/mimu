// Copyright 2015-2023 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

import { CanvasWidget } from './CanvasWidget.js';
import { Color } from './Color.js';

/** Fraction of width which is to be used for labels. */
const LABEL_WIDTH_AMT = 0.06;

/**
 * Harmonics renderer, with settable dynamic range. Expects floating point
 * values in its input buffer.
 */
export class Harmonics extends CanvasWidget {
  /** Sample rate. Used for generating labels. */
  #sampleRate = 0;

  /** Harmonic data (frequency bins) buffer. */
  #buffer = undefined;

  /** Minimum expected value in decibels. */
  #minValue = -100;

  /** Maximum expected value in decibels. */
  #maxValue = -30;

  /**
   * Takes a DOM node to insert a harmonics graph into. The node should
   * be an empty container.
   *
   * @param {Element} node Node to insert into.
   */
  constructor(node) {
    super(node, 'soundDisplay');

    this.foregroundOpacity = 0.9;  // Show a bit of the background through.
    this.render();                 // Draw an empty display.
  }

  /** @returns {Float32Array} The harmonic data buffer. */
  get buffer() {
    return this.#buffer;
  }

  /**
   * Sets the harmonic data buffer. These are the "frequency bins" from
   * the Web Audio API.
   *
   * @param {Float32Array} buffer The harmonic data buffer.
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
   * Sets the maximum level expected in the data buffer. Values above this
   * get clipped in the graph.
   *
   * @param {number} value The maximum expected level.
   */
  set maxValue(value) {
    this.#maxValue = value;
    this.renderBackground();
  }

  /**
   * Sets the minimum level expected in the data buffer. Values below this
   * get clipped in the graph.
   *
   * @param {number} value The minimum expected level.
   */
  set minValue(value) {
    this.#minValue = value;
    this.renderBackground();
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
    const labelHeight = this.fontSize * 2;
    const graphWidth = width - labelWidth;
    const graphHeight = height - labelHeight;
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
    ctx.fillRect(labelWidth, graphHeight, graphWidth, thin);

    const freqBins = this.#buffer && this.#buffer.length;
    const sampleRate = this.#sampleRate;

    if (!(   freqBins && (freqBins > 0)
              && sampleRate && (sampleRate > 0))) {
      return;
    }

    style.fontSize = this.fontSizePx;
    ctx.font = style.font;

    // Aim for up to twenty labels. The `labelHz` calculation rounds the
    // total buffer width in Hz down to a power of ten; from there, we
    // double the label count until we hit more than twenty.

    const renderHz = sampleRate / 2;
    let labelHz = Math.pow(10, Math.floor(Math.log10(renderHz)));

    for (;;) {
      const labelCount = Math.floor(renderHz / labelHz);
      if (labelCount > 20) {
        labelHz *= 2;  // Because we went one too far in the loop.
        break;
      }
      labelHz /= 2;
    }

    ctx.textBaseline = 'top';

    for (let hz = 0; hz < renderHz; hz += labelHz) {
      const x = (hz / renderHz * graphWidth) + labelWidth;
      let text = '' + (Math.round(hz * 10) / 10);

      if (hz === 0) {
        text += '\u200AHz';
      } else {
        ctx.fillStyle = darkColor;
        ctx.fillRect(x, 0, thin, graphHeight - (thin*2));
      }

      ctx.fillStyle = mainColor;
      ctx.fillRect(x, graphHeight, thin, tickLength);

      const textWidth = ctx.measureText(text).width;
      if ((x + (textWidth / 2)) < width) {
        ctx.fillText(text,
          x - (textWidth / 2), graphHeight + tickLength);
      }
    }

    // Aim for up to seven decibel labels. This is harder to calculate than
    // the horizontal axis in that the axes don't cross at 0 but rather at
    // an arbitrary value. Note that decibel values are typically
    // *negative*.

    const renderDb = this.#maxValue - this.#minValue;
    let labelDb = Math.pow(10, Math.floor(Math.log10(renderDb)));

    for (;;) {
      const labelCount = Math.floor(renderDb / labelDb) +
        Math.floor(this.#maxValue / labelDb);
      if (labelCount >= 7) {
        break;
      }
      labelDb /= 10;
    }

    for (;;) {
      const labelCount = Math.floor(renderDb / labelDb) +
        Math.floor(this.#maxValue / labelDb);
      if (labelCount <= 7) {
        break;
      }
      labelDb *= 2;
    }

    ctx.textBaseline = 'middle';

    for (let db = 0; db <= -this.#minValue; db += labelDb) {
      let axis = false;
      if (db >= -(this.#minValue + (labelDb * 0.9))) {
        db = -this.#minValue;
        axis = true;
      }

      const y = (db + this.#maxValue) / renderDb * graphHeight;

      if (y < (labelHeight / 2)) {
        continue;
      }

      let text = '' + (-Math.round(db * 10) / 10);

      if (axis) {
        text += '\u200AdB ';
      } else {
        text += ' ';
        ctx.fillStyle = darkColor;
        ctx.fillRect(labelWidth + (thin*2), y,
          graphWidth - (thin*2), thin);
      }

      ctx.fillStyle = mainColor;
      ctx.fillRect(labelWidth - tickLength, y, tickLength, thin);

      const textWidth = ctx.measureText(text).width;
      ctx.fillText(text, labelWidth - tickLength - textWidth, y);
    }
  }

  /**
   * Renders the harmonic buffer into the foreground canvas.
   */
  renderForeground() {
    const buf = this.#buffer;
    const canvas = this.foreground;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const labelWidth = width * LABEL_WIDTH_AMT;
    const labelHeight = this.fontSize * 2;
    const graphWidth = width - labelWidth;
    const graphHeight = height - labelHeight;
    const minValue = this.#minValue;
    const maxValue = this.#maxValue;
    const range = maxValue - minValue;

    ctx.clearRect(0, 0, width, height);

    if (!buf) {
      return;
    }

    ctx.strokeStyle = this.getComputedStyle().color;
    ctx.lineWidth = this.thickLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    for (let i = 0; i < buf.length; i++) {
      let v = buf[i];
      if (v < minValue) { v = minValue; }
      else if (v > maxValue) { v = maxValue; }

      const x = (i / buf.length * graphWidth) + labelWidth;
      const y = graphHeight * (1 - ((v - minValue) / range));

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
}
