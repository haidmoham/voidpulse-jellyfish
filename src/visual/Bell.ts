import * as THREE from "three";
import type { CelestialJellyfishParameters } from "./types.js";

/** A layered celestial shell with a bright rim and slow shader deformation. */
export class Bell {
  readonly group = new THREE.Group();

  private readonly shell: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private readonly aura: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private readonly rim: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  private readonly uniforms: Record<string, THREE.IUniform>;

  constructor() {
    const shellGeometry = new THREE.SphereGeometry(1, 64, 48);
    shellGeometry.scale(1.42, 0.82, 1.42);

    this.uniforms = {
      uTime: { value: 0 },
      uPulse: { value: 0.65 },
      uDeformation: { value: 0.45 },
      uEmission: { value: 1 },
      uColorA: { value: new THREE.Color("#c7f5ff") },
      uColorB: { value: new THREE.Color("#6555ff") },
      uCoreColor: { value: new THREE.Color("#4cc9ff") },
    };

    const shellMaterial = new THREE.ShaderMaterial({
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
        varying vec3 vObjectPosition;

        void main() {
          vec3 p = position;
          float waveA = sin(p.y * 4.0 + uTime * 0.52);
          float waveB = sin((p.x - p.z) * 3.0 - uTime * 0.31);
          float deformation = (waveA + waveB * 0.55) * 0.035 * uDeformation;
          float breath = sin(uTime * 0.55) * 0.045 * uPulse;
          p += normal * (deformation + breath);
          p.xz *= 1.0 + sin(uTime * 0.55) * 0.055 * uPulse;
          vNormal = normalize(normalMatrix * normal);
          vObjectPosition = p;
          vPosition = (modelViewMatrix * vec4(p, 1.0)).xyz;
          gl_Position = projectionMatrix * vec4(vPosition, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uEmission;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uCoreColor;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vObjectPosition;

        void main() {
          vec3 viewDirection = normalize(-vPosition);
          float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDirection), 0.0), 2.15);
          float vertical = smoothstep(-0.8, 0.78, vObjectPosition.y);
          float angle = atan(vObjectPosition.z, vObjectPosition.x);
          float ribs = pow(0.5 + 0.5 * cos(angle * 14.0), 8.0);
          float equator = pow(1.0 - abs(vObjectPosition.y / 0.82), 8.0);
          float core = 1.0 - smoothstep(0.0, 1.45, length(vObjectPosition.xz));
          float underside = 1.0 - smoothstep(-0.72, 0.08, vObjectPosition.y);

          vec3 color = mix(uColorB, uColorA, vertical);
          color += uCoreColor * (core * 0.42 + ribs * equator * 0.24 + underside * 0.5);
          color *= (0.44 + fresnel * 1.85) * uEmission;
          float alpha = (0.15 + fresnel * 0.48 + core * 0.08 + underside * 0.18) * (0.7 + uEmission * 0.18);
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });

    this.shell = new THREE.Mesh(shellGeometry, shellMaterial);
    this.shell.renderOrder = 2;

    const auraGeometry = shellGeometry.clone();
    auraGeometry.scale(1.055, 1.07, 1.055);
    this.aura = new THREE.Mesh(
      auraGeometry,
      new THREE.MeshBasicMaterial({
        color: "#435dff",
        transparent: true,
        opacity: 0.055,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.aura.renderOrder = 1;

    this.rim = new THREE.Mesh(
      new THREE.TorusGeometry(1.08, 0.028, 10, 96),
      new THREE.MeshBasicMaterial({
        color: "#83e8ff",
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.rim.position.y = -0.53;
    this.rim.rotation.x = Math.PI / 2;
    this.rim.scale.z = 1.08;
    this.rim.renderOrder = 3;

    this.group.add(this.aura, this.shell, this.rim);
  }

  update(time: number, parameters: CelestialJellyfishParameters): void {
    const pulse = THREE.MathUtils.clamp(parameters.bellPulse, 0, 2);
    const emission = THREE.MathUtils.clamp(parameters.emission, 0, 4);
    const breath = 1 + Math.sin(time * 0.55) * 0.018 * pulse;

    this.uniforms.uTime.value = time;
    this.uniforms.uPulse.value = pulse;
    this.uniforms.uDeformation.value = THREE.MathUtils.clamp(
      parameters.bellDeformation,
      0,
      2,
    );
    this.uniforms.uEmission.value = emission;
    this.aura.scale.setScalar(breath);
    this.aura.material.opacity = 0.035 + emission * 0.025;
    this.rim.material.opacity = 0.22 + emission * 0.18;
  }

  dispose(): void {
    this.shell.geometry.dispose();
    this.shell.material.dispose();
    this.aura.geometry.dispose();
    this.aura.material.dispose();
    this.rim.geometry.dispose();
    this.rim.material.dispose();
    this.group.clear();
  }
}
