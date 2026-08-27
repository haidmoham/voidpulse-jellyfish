import * as THREE from 'three';
import type { CelestialJellyfishParameters } from './types.js';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  lifetime: number;
}

/** Low-count drifting sparks, recycled in place to avoid a growing particle system. */
export class Particles {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private readonly particles: Particle[];
  private readonly positions: Float32Array;

  constructor(count = 96) {
    this.positions = new Float32Array(count * 3);
    this.particles = Array.from({ length: count }, () => this.spawn());
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    const material = new THREE.PointsMaterial({
      color: '#9ceaff',
      size: 0.035,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geometry, material);
    this.points.renderOrder = 3;
    this.writePositions(0);
  }

  update(dt: number, time: number, parameters: CelestialJellyfishParameters): void {
    const activeCount = Math.round(this.particles.length * THREE.MathUtils.clamp(parameters.particleDensity, 0, 1));
    const motion = 0.16 + THREE.MathUtils.clamp(parameters.tentacleSpeed, 0, 2) * 0.08;

    for (let index = 0; index < this.particles.length; index += 1) {
      const particle = this.particles[index];
      if (index < activeCount) {
        particle.age += dt;
        particle.position.addScaledVector(particle.velocity, dt * motion);
        particle.position.x += Math.sin(time * 0.35 + index) * dt * 0.012;
        if (particle.age > particle.lifetime || particle.position.lengthSq() > 13) {
          this.particles[index] = this.spawn();
        }
      }
      this.writePositions(index, index < activeCount);
    }

    this.points.material.opacity = 0.15 + THREE.MathUtils.clamp(parameters.emission, 0, 4) * 0.12;
    this.points.material.size = 0.022 + THREE.MathUtils.clamp(parameters.emission, 0, 4) * 0.008;
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private spawn(): Particle {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.3 + Math.random() * 1.6;
    return {
      position: new THREE.Vector3(
        Math.cos(angle) * radius,
        -1.2 + Math.random() * 2.5,
        Math.sin(angle) * radius,
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.45,
        0.35 + Math.random() * 0.4,
        (Math.random() - 0.5) * 0.45,
      ),
      age: Math.random() * 5,
      lifetime: 4 + Math.random() * 5,
    };
  }

  private writePositions(index: number, visible = true): void {
    const particle = this.particles[index];
    const offset = index * 3;
    this.positions[offset] = visible ? particle.position.x : 9999;
    this.positions[offset + 1] = visible ? particle.position.y : 9999;
    this.positions[offset + 2] = visible ? particle.position.z : 9999;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
