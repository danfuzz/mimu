/*
 * Copyright 2015 the Mimu Authors (Dan Bornstein et alia).
 * Licensed AS IS and WITHOUT WARRANTY under the Apache License,
 * Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
 */

"use strict";

// The following repos were used as reference while implementing this class:
// * https://github.com/dfcreative/color-name
// * https://github.com/MoOx/color-string
// * https://github.com/MoOx/color

// Map of by-name colors.
var NAMED_COLORS = {
    aliceblue:            "#f0f8ff",
    antiquewhite:         "#faebd7",
    aqua:                 "#00ffff",
    aquamarine:           "#7fffd4",
    azure:                "#f0ffff",
    beige:                "#f5f5dc",
    bisque:               "#ffe4c4",
    black:                "#000000",
    blanchedalmond:       "#ffebcd",
    blue:                 "#0000ff",
    blueviolet:           "#8a2be2",
    brown:                "#a52a2a",
    burlywood:            "#deb887",
    cadetblue:            "#5f9ea0",
    chartreuse:           "#7fff00",
    chocolate:            "#d2691e",
    coral:                "#ff7f50",
    cornflowerblue:       "#6495ed",
    cornsilk:             "#fff8dc",
    crimson:              "#dc143c",
    cyan:                 "#00ffff",
    darkblue:             "#00008b",
    darkcyan:             "#008b8b",
    darkgoldenrod:        "#b8860b",
    darkgray:             "#a9a9a9",
    darkgreen:            "#006400",
    darkgrey:             "#a9a9a9",
    darkkhaki:            "#bdb76b",
    darkmagenta:          "#8b008b",
    darkolivegreen:       "#556b2f",
    darkorange:           "#ff8c00",
    darkorchid:           "#9932cc",
    darkred:              "#8b0000",
    darksalmon:           "#e9967a",
    darkseagreen:         "#8fbc8f",
    darkslateblue:        "#483d8b",
    darkslategray:        "#2f4f4f",
    darkslategrey:        "#2f4f4f",
    darkturquoise:        "#00ced1",
    darkviolet:           "#9400d3",
    deeppink:             "#ff1493",
    deepskyblue:          "#00bfff",
    dimgray:              "#696969",
    dimgrey:              "#696969",
    dodgerblue:           "#1e90ff",
    firebrick:            "#b22222",
    floralwhite:          "#fffaf0",
    forestgreen:          "#228b22",
    fuchsia:              "#ff00ff",
    gainsboro:            "#dcdcdc",
    ghostwhite:           "#f8f8ff",
    gold:                 "#ffd700",
    goldenrod:            "#daa520",
    gray:                 "#808080",
    green:                "#008000",
    greenyellow:          "#adff2f",
    grey:                 "#808080",
    honeydew:             "#f0fff0",
    hotpink:              "#ff69b4",
    indianred:            "#cd5c5c",
    indigo:               "#4b0082",
    ivory:                "#fffff0",
    khaki:                "#f0e68c",
    lavender:             "#e6e6fa",
    lavenderblush:        "#fff0f5",
    lawngreen:            "#7cfc00",
    lemonchiffon:         "#fffacd",
    lightblue:            "#add8e6",
    lightcoral:           "#f08080",
    lightcyan:            "#e0ffff",
    lightgoldenrodyellow: "#fafad2",
    lightgray:            "#d3d3d3",
    lightgreen:           "#90ee90",
    lightgrey:            "#d3d3d3",
    lightpink:            "#ffb6c1",
    lightsalmon:          "#ffa07a",
    lightseagreen:        "#20b2aa",
    lightskyblue:         "#87cefa",
    lightslategray:       "#778899",
    lightslategrey:       "#778899",
    lightsteelblue:       "#b0c4de",
    lightyellow:          "#ffffe0",
    lime:                 "#00ff00",
    limegreen:            "#32cd32",
    linen:                "#faf0e6",
    magenta:              "#ff00ff",
    maroon:               "#800000",
    mediumaquamarine:     "#66cdaa",
    mediumblue:           "#0000cd",
    mediumorchid:         "#ba55d3",
    mediumpurple:         "#9370db",
    mediumseagreen:       "#3cb371",
    mediumslateblue:      "#7b68ee",
    mediumspringgreen:    "#00fa9a",
    mediumturquoise:      "#48d1cc",
    mediumvioletred:      "#c71585",
    midnightblue:         "#191970",
    mintcream:            "#f5fffa",
    mistyrose:            "#ffe4e1",
    moccasin:             "#ffe4b5",
    navajowhite:          "#ffdead",
    navy:                 "#000080",
    oldlace:              "#fdf5e6",
    olive:                "#808000",
    olivedrab:            "#6b8e23",
    orange:               "#ffa500",
    orangered:            "#ff4500",
    orchid:               "#da70d6",
    palegoldenrod:        "#eee8aa",
    palegreen:            "#98fb98",
    paleturquoise:        "#afeeee",
    palevioletred:        "#db7093",
    papayawhip:           "#ffefd5",
    peachpuff:            "#ffdab9",
    peru:                 "#cd853f",
    pink:                 "#ffc0cb",
    plum:                 "#dda0dd",
    powderblue:           "#b0e0e6",
    purple:               "#800080",
    rebeccapurple:        "#663399",
    red:                  "#ff0000",
    rosybrown:            "#bc8f8f",
    royalblue:            "#4169e1",
    saddlebrown:          "#8b4513",
    salmon:               "#fa8072",
    sandybrown:           "#f4a460",
    seagreen:             "#2e8b57",
    seashell:             "#fff5ee",
    sienna:               "#a0522d",
    silver:               "#c0c0c0",
    skyblue:              "#87ceeb",
    slateblue:            "#6a5acd",
    slategray:            "#708090",
    slategrey:            "#708090",
    snow:                 "#fffafa",
    springgreen:          "#00ff7f",
    steelblue:            "#4682b4",
    tan:                  "#d2b48c",
    teal:                 "#008080",
    thistle:              "#d8bfd8",
    tomato:               "#ff6347",
    transparent:          "#00000000",
    turquoise:            "#40e0d0",
    violet:               "#ee82ee",
    wheat:                "#f5deb3",
    white:                "#ffffff",
    whitesmoke:           "#f5f5f5",
    yellow:               "#ffff00",
    yellowgreen:          "#9acd32"
}

// Simple color container and manipulator.
class Color {
    constructor() {
        this._red = 0;
        this._green = 0;
        this._blue = 0;
        this._alpha = 0;
    }

    // Clone an instance.
    clone() {
        var c = new Color();

        c._red   = this._red;
        c._green = this._green;
        c._blue  = this._blue;
        c._alpha = this._alpha;
        return c;
    }

    // Gets the color as a CSS string.
    toCss() {
        var rgb = this._red + ", " + this._green + ", " + this._blue;

        if (this._alpha == 1) {
            return "rgb(" + rgb + ")";
        } else {
            return "rgba(" + rgb + ", " + this._alpha + ")";
        }
    }

    // Mixes in the given color at the given weight (defaults to 0.5). Returns
    // a new color representing the combination.
    mix(other, weight) {
        // Adapted from MoOx's color module, which in turn is an adaptation
        // from Sass.
        if (weight === undefined) { weight = 0.5; }

        var p = weight;
        var w = (2 * p) - 1;
        var a = this._alpha - other._alpha;
        var w1 = (((w*a == -1) ? w : (w+a)/(1 + w*a)) + 1) / 2.0;
        var w2 = 1 - w1;

        var result = new Color();
        result._setNums(
            (w1 * this._red)   + (w2 * other._red),
            (w1 * this._green) + (w2 * other._green),
            (w1 * this._blue)  + (w2 * other._blue),
            (p  * this._alpha) + ((1-p) * other._alpha));
        return result;
    }

    // Sets the four values (with alpha optional) given one- or two-character
    // hex strings.
    _setHex(r, g, b, a) {
        if (!a) {
            a = "ff";
        }

        if (r.length === 1) { r = r + r; }
        if (g.length === 1) { g = g + g; }
        if (b.length === 1) { b = b + b; }
        if (a.length === 1) { a = a + a; }

        this._setNums(
            parseInt(r, 16),
            parseInt(g, 16),
            parseInt(b, 16),
            (parseInt(a, 16) / 255));
    }

    // Sets the four values (with alpha optional) given in-range numeric
    // values.
    _setNums(r, g, b, a) {
        if (!a) {
            a = 1;
        }

        this._red   = Math.trunc(r);
        this._green = Math.trunc(g);
        this._blue  = Math.trunc(b);
        this._alpha = a;
    }

    // Parse an instance out of a string in some of the standard CSS formats.
    // Currently supported are 3, 4, 6, and 8 digit hex forms; and `rgb` and
    // `rgba` function forms.
    static parse(cssString) {
        var result = NAMED_COLORS[cssString];
        if (result) {
            if (typeof result === "string") {
                result = Color.parse(result);
                NAMED_COLORS[cssString] = result;
            }
            return result.clone();
        }

        result = new Color();
        var match;

        if (match = cssString.match(/^#([a-fA-F0-9]{3,8})$/)) {
            match = match[1]; // The parenthesized part.
            switch (match.length) {
                case 3: {
                    result._setHex(match[0], match[1], match[2]);
                    break;
                }
                case 4: {
                    result._setHex(match[0], match[1], match[2], match[3]);
                    break;
                }
                case 6: {
                    result._setHex(match[0] + match[1], match[2] + match[3],
                        match[4] + match[5]);
                    break;
                }
                case 8: {
                    result._setHex(match[0] + match[1], match[2] + match[3],
                        match[4] + match[5], match[6] + match[7]);
                    break;
                }
                default: {
                    return undefined;
                }
            }
        } else if (match = Color._parseFunc(cssString)) {
            switch(match[0]) {
                case "rgb": {
                    if (match.length !== 4) {
                        return undefined;
                    }
                    var r = Color._parseNum(match[1], 255, true);
                    var g = Color._parseNum(match[2], 255, true);
                    var b = Color._parseNum(match[3], 255, true);
                    if (isNaN(r + g + b)) {
                        return undefined;
                    }
                    result._setNums(r, g, b);
                    break;
                }
                case "rgba": {
                    if (match.length !== 5) {
                        return undefined;
                    }
                    var r = Color._parseNum(match[1], 255, true);
                    var g = Color._parseNum(match[2], 255, true);
                    var b = Color._parseNum(match[3], 255, true);
                    var a = Color._parseNum(match[4], 1);
                    if (isNaN(r + g + b + a)) {
                        return undefined;
                    }
                    result._setNums(r, g, b, a);
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

    // Parses a function form with up to four arguments. Returns the array
    // of name followed by arguments if matched or `undefined` if there was
    // no match.
    static _parseFunc(cssString) {
        // Match the name and outer parens.
        var match = cssString.match(/^([a-z]+)\s*\(\s*(.*)\s*\)$/);
        if (!match) {
            return undefined;
        }

        var result = [match[1]];
        var argString = "," + match[2];

        if (argString === ",") {
            return result;
        }

        while (argString !== "") {
            match = argString.match(/^,\s*([^, ]+)\s*(.*)$/);
            if (!match) {
                return undefined;
            }
            result.push(match[1]);
            argString = match[2];
        }

        return result;
    }

    // Parses a numeric value, with percent-scaling, clamping, and optional
    // truncation. If parsing fails, returns NaN.
    static _parseNum(s, max, trunc) {
        var match = s.match(/^([-+]?[0-9]*\.?[0-9]*)(%?)$/);
        if (!match) {
            return NaN;
        }

        var isPercent = (match[2] == "%");
        var result = parseFloat(match[1]);

        if (isNaN(result)) {
            return result;
        }

        if (isPercent) {
            result = Color._clamp(result, 100);
            result = (result / 100) * max;
        } else {
            result = Color._clamp(result, max);
        }

        if (trunc) {
            result = Math.trunc(result);
        }

        return result;
    }

    // Clamps a value to be between 0 and a given maximum.
    static _clamp(n, max) {
        if (n < 0) {
            return 0;
        } else if (n > max) {
            return max;
        }

        return n;
    }
}
