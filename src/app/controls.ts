import GUI from "lil-gui";
import type { CelestialJellyfishParams } from "../visual/CelestialJellyfish";

type ControlKey = keyof CelestialJellyfishParams;
type ControlRange = readonly [min: number, max: number, step: number];

const CONTROL_RANGES: Record<ControlKey, ControlRange> = {
  bellPulse: [0, 1, 0.01],
  bellDeformation: [0, 1, 0.01],
  tentacleNoise: [0, 1, 0.01],
  tentacleSpeed: [0, 2, 0.01],
  emission: [0, 2, 0.01],
  bloomStrength: [0, 3, 0.01],
  particleDensity: [0, 1, 0.01],
  cameraDrift: [0, 1, 0.01],
};

export function createControls(params: CelestialJellyfishParams): GUI {
  const gui = new GUI({ title: "Jellyfish controls", closeFolders: true });
  gui.domElement.setAttribute("aria-label", "Jellyfish controls");

  for (const [key, range] of Object.entries(CONTROL_RANGES)) {
    gui.add(params, key as ControlKey, ...range);
  }

  return gui;
}
