// Adapted from holtsetio/aurelia under the MIT License.
// Source: https://github.com/holtsetio/aurelia
// Vendored for the single Voidpulse Medusa visual; local integration changes are intentional.

import {createNoise2D,createNoise3D} from "simplex-noise";

export const noise3D = createNoise3D();
export const noise2D = createNoise2D();
