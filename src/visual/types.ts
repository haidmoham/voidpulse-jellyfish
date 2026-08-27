/**
 * Mutable controls shared by the scene and its UI. Values are intentionally
 * not copied: callers can adjust this object while the animation is running.
 */
export interface CelestialJellyfishParameters {
  /** 0-1, strength of the bell's slow inhale/exhale. */
  bellPulse: number;
  /** 0-1, amount of low-frequency vertex deformation in the bell. */
  bellDeformation: number;
  /** 0-1, lateral sway added to the tentacles. */
  tentacleNoise: number;
  /** 0-2, multiplier for tentacle motion. */
  tentacleSpeed: number;
  /** 0-2, brightness shared by the jellyfish and its particles. */
  emission: number;
  /** 0-3, bloom intensity used by the composer. */
  bloomStrength: number;
  /** 0-1, fraction of the particle pool currently visible. */
  particleDensity: number;
  /** 0-1, a deliberately subtle camera drift amount. */
  cameraDrift: number;
}

export type CelestialJellyfishParameterInput = Partial<CelestialJellyfishParameters>;

export const defaultCelestialJellyfishParameters: CelestialJellyfishParameters = {
  bellPulse: 0.65,
  bellDeformation: 0.45,
  tentacleNoise: 0.55,
  tentacleSpeed: 0.55,
  emission: 1,
  bloomStrength: 0.72,
  particleDensity: 0.5,
  cameraDrift: 0.18,
};

/** Applies defaults directly to the caller-owned mutable parameter object. */
export function createMutableParameters(
  input: CelestialJellyfishParameterInput = {},
): CelestialJellyfishParameters {
  const target = input as CelestialJellyfishParameters;

  for (const [key, value] of Object.entries(defaultCelestialJellyfishParameters)) {
    if (target[key as keyof CelestialJellyfishParameters] === undefined) {
      target[key as keyof CelestialJellyfishParameters] = value;
    }
  }

  return target;
}
