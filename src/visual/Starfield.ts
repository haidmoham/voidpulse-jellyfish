import * as THREE from 'three';

/** A fixed, intentionally sparse field that shifts almost imperceptibly with time. */
export class Starfield {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;

  constructor(count = 360) {
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const radius = 12 + Math.random() * 35;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const offset = index * 3;
      positions[offset] = radius * Math.sin(phi) * Math.cos(theta);
      positions[offset + 1] = radius * Math.cos(phi);
      positions[offset + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.points = new THREE.Points(geometry, new THREE.PointsMaterial({
      color: '#bdd8ff',
      size: 0.045,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      sizeAttenuation: true,
    }));
  }

  update(time: number): void {
    this.points.rotation.y = time * 0.003;
    this.points.rotation.x = Math.sin(time * 0.015) * 0.025;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
