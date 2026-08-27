import * as THREE from 'three';
import type { CelestialJellyfishParameters } from './types.js';

interface TentacleState {
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  anchor: THREE.Vector3;
  length: number;
  phase: number;
  delay: number;
  controlPoints: THREE.Vector3[];
  curve: THREE.CatmullRomCurve3;
  sample: THREE.Vector3;
}

type TentacleShape = Pick<TentacleState, 'anchor' | 'length' | 'phase' | 'delay'>;

const CONTROL_POINT_COUNT = 8;
const PATH_SAMPLE_COUNT = 30;

/** Individually delayed Catmull-Rom paths make the jellyfish feel buoyant, not noisy. */
export class Tentacles {
  readonly group = new THREE.Group();
  private readonly tentacles: TentacleState[] = [];

  constructor(count = 11) {
    const material = new THREE.LineBasicMaterial({
      color: '#89d9ff',
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + (index % 2) * 0.13;
      const radialDistance = 0.25 + (index % 3) * 0.12;
      const shape: TentacleShape = {
        anchor: new THREE.Vector3(
          Math.cos(angle) * radialDistance,
          -0.58 - (index % 2) * 0.05,
          Math.sin(angle) * radialDistance,
        ),
        length: 1.3 + ((index * 37) % 100) / 100 * 1.35,
        phase: angle + index * 0.71,
        delay: index * 0.19,
      };
      const controlPoints = Array.from(
        { length: CONTROL_POINT_COUNT },
        () => new THREE.Vector3(),
      );
      const curve = new THREE.CatmullRomCurve3(controlPoints, false, 'centripetal');
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(PATH_SAMPLE_COUNT * 3), 3)
          .setUsage(THREE.DynamicDrawUsage),
      );
      // The complete animation stays within this local volume, so no per-frame
      // bounds computation is necessary after the position buffer changes.
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -1, 0), 4);
      const state: TentacleState = {
        ...shape,
        controlPoints,
        curve,
        sample: new THREE.Vector3(),
        line: new THREE.Line(geometry, material.clone()),
      };
      this.updatePath(state, 0, 0.55, 0.55);
      state.line.renderOrder = 1;
      this.tentacles.push(state);
      this.group.add(state.line);
    }

    material.dispose();
  }

  update(time: number, parameters: CelestialJellyfishParameters): void {
    const speed = THREE.MathUtils.clamp(parameters.tentacleSpeed, 0, 2);
    const noise = THREE.MathUtils.clamp(parameters.tentacleNoise, 0, 2);
    const emission = THREE.MathUtils.clamp(parameters.emission, 0, 4);

    for (const tentacle of this.tentacles) {
      this.updatePath(tentacle, time * (0.4 + speed), noise, speed);
      tentacle.line.material.opacity = 0.24 + emission * 0.11;
      tentacle.line.material.color.setHSL(0.54 + noise * 0.035, 0.8, 0.62);
    }
  }

  /**
   * Keep a fixed GPU buffer per tentacle and only rewrite its sampled curve.
   * This retains the smooth Catmull-Rom silhouette without per-frame geometry
   * allocation or disposal.
   */
  private updatePath(
    tentacle: TentacleState,
    time: number,
    noise: number,
    speed: number,
  ): void {
    const localTime = time - tentacle.delay;

    for (let index = 0; index < CONTROL_POINT_COUNT; index += 1) {
      const progress = index / (CONTROL_POINT_COUNT - 1);
      const sway = Math.sin(localTime * 0.9 + tentacle.phase + progress * 4.0) * progress;
      const crossSway = Math.cos(localTime * 0.68 + tentacle.phase * 1.7 + progress * 5.0) * progress;
      const amplitude = (0.08 + speed * 0.035) * noise;
      tentacle.controlPoints[index].set(
        tentacle.anchor.x + sway * amplitude,
        tentacle.anchor.y - progress * tentacle.length,
        tentacle.anchor.z + crossSway * amplitude,
      );
    }

    const positions = tentacle.line.geometry.attributes.position as THREE.BufferAttribute;
    for (let index = 0; index < PATH_SAMPLE_COUNT; index += 1) {
      tentacle.curve.getPoint(index / (PATH_SAMPLE_COUNT - 1), tentacle.sample);
      positions.setXYZ(index, tentacle.sample.x, tentacle.sample.y, tentacle.sample.z);
    }
    positions.needsUpdate = true;
  }

  dispose(): void {
    for (const tentacle of this.tentacles) {
      tentacle.line.geometry.dispose();
      tentacle.line.material.dispose();
    }
    this.group.clear();
  }
}
