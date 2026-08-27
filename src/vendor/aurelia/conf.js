// Adapted from holtsetio/aurelia under the MIT License.
// Source: https://github.com/holtsetio/aurelia
// Vendored for the single Voidpulse Medusa visual; local integration changes are intentional.

// Adapted from holtsetio/aurelia under the MIT License.
// Source: https://github.com/holtsetio/aurelia
// This local integration deliberately omits Aurelia's Tweakpane debug UI.

class Conf {
  roughness = 0.4;
  metalness = 0.2;
  transmission = 0.7;
  color = 0xffffff;
  iridescence = 0.0;
  iridescenceIOR = 2.33;

  runSimulation = true;
  showVerletSprings = false;

  init() {}
  update() {}
  begin() {}
  end() {}
}

export const conf = new Conf();
