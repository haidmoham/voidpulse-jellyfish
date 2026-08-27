import * as THREE from 'three';
import type { CelestialJellyfishParameters } from './types.js';

/** A softly translucent, self-lit bell with a restrained shader pulse. */
export class Bell {
  readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private readonly uniforms: Record<string, THREE.IUniform>;

  constructor() {
    const geometry = new THREE.SphereGeometry(1, 56, 40);
    geometry.scale(1.15, 0.74, 1.15);

    this.uniforms = {
      uTime: { value: 0 },
      uPulse: { value: 0.65 },
      uDeformation: { value: 0.45 },
      uEmission: { value: 1 },
      uColorA: { value: new THREE.Color('#9ae8ff') },
      uColorB: { value: new THREE.Color('#6b57f5') },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uPulse;
        uniform float uDeformation;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vec3 p = position;
          float waveA = sin(p.y * 4.0 + uTime * 0.52);
          float waveB = sin((p.x - p.z) * 3.0 - uTime * 0.31);
          float lowFrequencyNoise = (waveA + waveB * 0.55) * 0.035 * uDeformation;
          float breathing = sin(uTime * 0.55) * 0.045 * uPulse;
          p += normal * (lowFrequencyNoise + breathing);
          p.xz *= 1.0 + sin(uTime * 0.55) * 0.055 * uPulse;
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(p, 1.0)).xyz;
          gl_Position = projectionMatrix * vec4(vPosition, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uEmission;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vec3 viewDirection = normalize(-vPosition);
          float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDirection), 0.0), 2.2);
          float verticalGradient = smoothstep(-0.9, 0.75, vPosition.y);
          vec3 color = mix(uColorB, uColorA, verticalGradient);
          color *= (0.5 + fresnel * 1.7) * uEmission;
          float alpha = (0.18 + fresnel * 0.42) * (0.65 + uEmission * 0.2);
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.renderOrder = 2;
  }

  update(time: number, parameters: CelestialJellyfishParameters): void {
    this.uniforms.uTime.value = time;
    this.uniforms.uPulse.value = THREE.MathUtils.clamp(parameters.bellPulse, 0, 2);
    this.uniforms.uDeformation.value = THREE.MathUtils.clamp(parameters.bellDeformation, 0, 2);
    this.uniforms.uEmission.value = THREE.MathUtils.clamp(parameters.emission, 0, 4);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
