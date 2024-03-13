// Copyright 2015-2024 the Mimu Authors (Dan Bornstein et alia).
// SPDX-License-Identifier: Apache-2.0

// The following repos were used as reference while implementing this class:
// * https://github.com/dfcreative/color-name
// * https://github.com/MoOx/color-string
// * https://github.com/MoOx/color

/** Map of by-name colors. */
const NAMED_COLORS = {
  aliceblue:            '#f0f8ff',
  antiquewhite:         '#faebd7',
  aqua:                 '#00ffff',
  aquamarine:           '#7fffd4',
  azure:                '#f0ffff',
  beige:                '#f5f5dc',
  bisque:               '#ffe4c4',
  black:                '#000000',
  blanchedalmond:       '#ffebcd',
  blue:                 '#0000ff',
  blueviolet:           '#8a2be2',
  brown:                '#a52a2a',
  burlywood:            '#deb887',
  cadetblue:            '#5f9ea0',
  chartreuse:           '#7fff00',
  chocolate:            '#d2691e',
  coral:                '#ff7f50',
  cornflowerblue:       '#6495ed',
  cornsilk:             '#fff8dc',
  crimson:              '#dc143c',
  cyan:                 '#00ffff',
  darkblue:             '#00008b',
  darkcyan:             '#008b8b',
  darkgoldenrod:        '#b8860b',
  darkgray:             '#a9a9a9',
  darkgreen:            '#006400',
  darkgrey:             '#a9a9a9',
  darkkhaki:            '#bdb76b',
  darkmagenta:          '#8b008b',
  darkolivegreen:       '#556b2f',
  darkorange:           '#ff8c00',
  darkorchid:           '#9932cc',
  darkred:              '#8b0000',
  darksalmon:           '#e9967a',
  darkseagreen:         '#8fbc8f',
  darkslateblue:        '#483d8b',
  darkslategray:        '#2f4f4f',
  darkslategrey:        '#2f4f4f',
  darkturquoise:        '#00ced1',
  darkviolet:           '#9400d3',
  deeppink:             '#ff1493',
  deepskyblue:          '#00bfff',
  dimgray:              '#696969',
  dimgrey:              '#696969',
  dodgerblue:           '#1e90ff',
  firebrick:            '#b22222',
  floralwhite:          '#fffaf0',
  forestgreen:          '#228b22',
  fuchsia:              '#ff00ff',
  gainsboro:            '#dcdcdc',
  ghostwhite:           '#f8f8ff',
  gold:                 '#ffd700',
  goldenrod:            '#daa520',
  gray:                 '#808080',
  green:                '#008000',
  greenyellow:          '#adff2f',
  grey:                 '#808080',
  honeydew:             '#f0fff0',
  hotpink:              '#ff69b4',
  indianred:            '#cd5c5c',
  indigo:               '#4b0082',
  ivory:                '#fffff0',
  khaki:                '#f0e68c',
  lavender:             '#e6e6fa',
  lavenderblush:        '#fff0f5',
  lawngreen:            '#7cfc00',
  lemonchiffon:         '#fffacd',
  lightblue:            '#add8e6',
  lightcoral:           '#f08080',
  lightcyan:            '#e0ffff',
  lightgoldenrodyellow: '#fafad2',
  lightgray:            '#d3d3d3',
  lightgreen:           '#90ee90',
  lightgrey:            '#d3d3d3',
  lightpink:            '#ffb6c1',
  lightsalmon:          '#ffa07a',
  lightseagreen:        '#20b2aa',
  lightskyblue:         '#87cefa',
  lightslategray:       '#778899',
  lightslategrey:       '#778899',
  lightsteelblue:       '#b0c4de',
  lightyellow:          '#ffffe0',
  lime:                 '#00ff00',
  limegreen:            '#32cd32',
  linen:                '#faf0e6',
  magenta:              '#ff00ff',
  maroon:               '#800000',
  mediumaquamarine:     '#66cdaa',
  mediumblue:           '#0000cd',
  mediumorchid:         '#ba55d3',
  mediumpurple:         '#9370db',
  mediumseagreen:       '#3cb371',
  mediumslateblue:      '#7b68ee',
  mediumspringgreen:    '#00fa9a',
  mediumturquoise:      '#48d1cc',
  mediumvioletred:      '#c71585',
  midnightblue:         '#191970',
  mintcream:            '#f5fffa',
  mistyrose:            '#ffe4e1',
  moccasin:             '#ffe4b5',
  navajowhite:          '#ffdead',
  navy:                 '#000080',
  oldlace:              '#fdf5e6',
  olive:                '#808000',
  olivedrab:            '#6b8e23',
  orange:               '#ffa500',
  orangered:            '#ff4500',
  orchid:               '#da70d6',
  palegoldenrod:        '#eee8aa',
  palegreen:            '#98fb98',
  paleturquoise:        '#afeeee',
  palevioletred:        '#db7093',
  papayawhip:           '#ffefd5',
  peachpuff:            '#ffdab9',
  peru:                 '#cd853f',
  pink:                 '#ffc0cb',
  plum:                 '#dda0dd',
  powderblue:           '#b0e0e6',
  purple:               '#800080',
  rebeccapurple:        '#663399',
  red:                  '#ff0000',
  rosybrown:            '#bc8f8f',
  royalblue:            '#4169e1',
  saddlebrown:          '#8b4513',
  salmon:               '#fa8072',
  sandybrown:           '#f4a460',
  seagreen:             '#2e8b57',
  seashell:             '#fff5ee',
  sienna:               '#a0522d',
  silver:               '#c0c0c0',
  skyblue:              '#87ceeb',
  slateblue:            '#6a5acd',
  slategray:            '#708090',
  slategrey:            '#708090',
  snow:                 '#fffafa',
  springgreen:          '#00ff7f',
  steelblue:            '#4682b4',
  tan:                  '#d2b48c',
  teal:                 '#008080',
  thistle:              '#d8bfd8',
  tomato:               '#ff6347',
  transparent:          '#00000000',
  turquoise:            '#40e0d0',
  violet:               '#ee82ee',
  wheat:                '#f5deb3',
  white:                '#ffffff',
  whitesmoke:           '#f5f5f5',
  yellow:               '#ffff00',
  yellowgreen:          '#9acd32'
};

/**
 * Simple color container and manipulator.
 */
export class Color {
  #red = 0;
  #green = 0;
  #blue = 0;
  #alpha = 0;

  /**
   * Constructs an instance. It is initially transparent black.
   */
  constructor() {
    // This space intentionally left blank.
  }

  /**
   * Clones this instance.
   *
   * @returns {Color} The clone.
   */
  clone() {
    const c = new Color();

    c.#red   = this.#red;
    c.#green = this.#green;
    c.#blue  = this.#blue;
    c.#alpha = this.#alpha;

    return c;
  }

  /**
   * Mixes in the given color at the given weight. Returns a new instance
   * representing the combination.
   *
   * @param {Color} other Color to mix with.
   * @param {number} [weight = 0.5] Weight for `other`.
   * @returns {Color} The mixed result.
   */
  mix(other, weight = 0.5) {
    // Adapted from MoOx's color module, which in turn is an adaptation
    // from Sass.

    const p = weight;
    const w = (2 * p) - 1;
    const a = this.#alpha - other.#alpha;
    const w1 = (((w*a === -1) ? w : (w+a)/(1 + w*a)) + 1) / 2;
    const w2 = 1 - w1;

    const result = new Color();
    result.#setNums(
      (w1 * this.#red)   + (w2 * other.#red),
      (w1 * this.#green) + (w2 * other.#green),
      (w1 * this.#blue)  + (w2 * other.#blue),
      (p  * this.#alpha) + ((1-p) * other.#alpha));

    return result;
  }

  /**
   * Gets the color as a CSS string.
   *
   * @returns {string} The CSS string form.
   */
  toCss() {
    const rgb = this.#red + ', ' + this.#green + ', ' + this.#blue;

    if (this.#alpha === 1) {
      return 'rgb(' + rgb + ')';
    } else {
      return 'rgba(' + rgb + ', ' + this.#alpha + ')';
    }
  }

  /**
   * Sets the four values (with alpha optional) given one- or two-character
   * hex strings.
   *
   * @param {string} r Hex string value for red.
   * @param {string} g Hex string value for green.
   * @param {string} b Hex string value for blue.
   * @param {string} [a = 'ff'] Hex string value for alpha.
   */
  #setHex(r, g, b, a = 'ff') {
    if (r.length === 1) { r = r + r; }
    if (g.length === 1) { g = g + g; }
    if (b.length === 1) { b = b + b; }
    if (a.length === 1) { a = a + a; }

    this.#setNums(
      parseInt(r, 16),
      parseInt(g, 16),
      parseInt(b, 16),
      (parseInt(a, 16) / 255));
  }

  /**
   * Sets the four values (with alpha optional) given in-range numeric
   * values.
   *
   * @param {number} r Value for red.
   * @param {number} g Value for green.
   * @param {number} b Value for blue.
   * @param {number} [a = 1] Value for alpha.
   */
  #setNums(r, g, b, a = 1) {
    if (!a) {
      a = 1;
    }

    this.#red   = Math.trunc(r);
    this.#green = Math.trunc(g);
    this.#blue  = Math.trunc(b);
    this.#alpha = a;
  }


  //
  // Static members
  //

  /**
   * Parses an instance out of a string in some of the standard CSS formats.
   * Currently supported are 3, 4, 6, and 8 digit hex forms; and `rgb` and
   * `rgba` function forms.
   *
   * @param {string} cssString Color value in CSS syntax.
   * @returns {Color} The parsed instance.
   */
  static parse(cssString) {
    let result = NAMED_COLORS[cssString];
    if (result) {
      if (typeof result === 'string') {
        result = Color.parse(result);
        NAMED_COLORS[cssString] = result;
      }
      return result.clone();
    }

    result = new Color();
    let match;

    if ((match = cssString.match(/^#([a-fA-F0-9]{3,8})$/))) {
      match = match[1]; // The parenthesized part.
      switch (match.length) {
        case 3: {
          result.#setHex(match[0], match[1], match[2]);
          break;
        }
        case 4: {
          result.#setHex(match[0], match[1], match[2], match[3]);
          break;
        }
        case 6: {
          result.#setHex(match[0] + match[1], match[2] + match[3],
            match[4] + match[5]);
          break;
        }
        case 8: {
          result.#setHex(match[0] + match[1], match[2] + match[3],
            match[4] + match[5], match[6] + match[7]);
          break;
        }
        default: {
          return undefined;
        }
      }
    } else if ((match = Color.#parseFunc(cssString))) {
      switch (match[0]) {
        case 'rgb': {
          if (match.length !== 4) {
            return undefined;
          }
          const r = Color.#parseNum(match[1], 255, true);
          const g = Color.#parseNum(match[2], 255, true);
          const b = Color.#parseNum(match[3], 255, true);
          if (isNaN(r + g + b)) {
            return undefined;
          }
          result.#setNums(r, g, b);
          break;
        }
        case 'rgba': {
          if (match.length !== 5) {
            return undefined;
          }
          const r = Color.#parseNum(match[1], 255, true);
          const g = Color.#parseNum(match[2], 255, true);
          const b = Color.#parseNum(match[3], 255, true);
          const a = Color.#parseNum(match[4], 1);
          if (isNaN(r + g + b + a)) {
            return undefined;
          }
          result.#setNums(r, g, b, a);
          break;
        }
        default: {
          return undefined;
        }
      }
    } else {
      return undefined;
    }

    return result;
  }

  /**
   * Clamps a value to be between 0 and a given maximum.
   *
   * @param {number} n Value in question.
   * @param {number} max Maximum allowed value.
   * @returns {number} The clamped value.
   */
  static #clamp(n, max) {
    if (n < 0) {
      return 0;
    } else if (n > max) {
      return max;
    }

    return n;
  }

  /**
   * Parses a function form with up to four arguments. Returns the array
   * of name followed by arguments if matched or `undefined` if there was
   * no match.
   *
   * @param {string} cssString CSS string in "function" form.
   * @returns {*[]} Parsed result.
   */
  static #parseFunc(cssString) {
    // Match the name and outer parens.
    let match = cssString.match(/^([a-z]+)\s*\(\s*(.*)\s*\)$/);
    if (!match) {
      return undefined;
    }

    const result = [match[1]];
    let argString = ',' + match[2];

    if (argString === ',') {
      return result;
    }

    while (argString !== '') {
      match = argString.match(/^,\s*([^, ]+)\s*(.*)$/);
      if (!match) {
        return undefined;
      }
      result.push(match[1]);
      argString = match[2];
    }

    return result;
  }

  /**
   * Parses a numeric value, with percent-scaling, clamping, and optional
   * truncation. If parsing fails, returns `NaN`.
   *
   * @param {string} s String to parse.
   * @param {number} max Maximum allowed value.
   * @param {boolean} trunc Perform truncation to integer?
   * @returns {number} The parsed result.
   */
  static #parseNum(s, max, trunc) {
    const match = s.match(/^([-+]?[0-9]*\.?[0-9]*)(%?)$/);
    if (!match) {
      return NaN;
    }

    const isPercent = (match[2] === '%');
    let result = parseFloat(match[1]);

    if (isNaN(result)) {
      return result;
    }

    if (isPercent) {
      result = Color.#clamp(result, 100);
      result = (result / 100) * max;
    } else {
      result = Color.#clamp(result, max);
    }

    if (trunc) {
      result = Math.trunc(result);
    }

    return result;
  }
}
