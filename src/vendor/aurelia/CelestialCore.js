// Local Voidpulse addition to the Aurelia-derived Medusa visual.
// A deliberately modest geometry treatment: an internal event-horizon organ,
// biological accretion membranes, and sparse orbital particulate matter.

import * as THREE from "three/webgpu";

const CORE_CENTER = new THREE.Vector3(0, 0.52, 0.08);
const MOTE_COUNT = 32;
const MOBILE_MOTE_COUNT = 20;

const seeded = (index, salt) => {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
};

const createMaterial = (color, opacity, blending = THREE.NormalBlending) =>
  new THREE.MeshBasicNodeMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
    blending,
    toneMapped: false,
  });

export class CelestialCore {
  constructor() {
    this.object = new THREE.Group();
    this.object.name = "Celestial black-hole organ";
    this.object.renderOrder = 21;

    this.coreMaterial = createMaterial(0x01020a, 0.98);
    this.coreGeometry = new THREE.SphereGeometry(1, 32, 20);
    this.core = new THREE.Mesh(this.coreGeometry, this.coreMaterial);
    this.core.name = "Near-black event horizon";
    this.core.position.copy(CORE_CENTER);
    this.core.scale.set(0.62, 0.34, 0.18);
    // The bell is intentionally translucent but writes late in Aurelia's
    // custom order; rendering this small organ afterward keeps it legible
    // without covering the bell's entire surface.
    this.core.renderOrder = 26;
    this.core.material.depthTest = false;
    this.core.material.depthWrite = false;
    this.object.add(this.core);

    this.haloMaterial = createMaterial(0x47376f, 0.34, THREE.AdditiveBlending);
    this.haloGeometry = new THREE.TorusGeometry(0.63, 0.014, 6, 96);
    this.halo = new THREE.Mesh(this.haloGeometry, this.haloMaterial);
    this.halo.name = "Dim gravitational rim";
    this.halo.position.copy(CORE_CENTER).add(new THREE.Vector3(0, 0, 0.035));
    this.halo.scale.set(1, 0.58, 1);
    this.halo.rotation.set(0.04, -0.11, 0.06);
    this.halo.renderOrder = 27;
    this.halo.material.depthWrite = false;
    this.halo.material.depthTest = false;
    this.object.add(this.halo);

    this.streamers = [];
    this.streamerMaterials = [];
    const streamers = [
      { radius: 0.78, tube: 0.026, arc: 1.66, offset: 0.18, color: 0x293e70, opacity: 0.23, tilt: -0.08 },
      { radius: 0.95, tube: 0.018, arc: 1.32, offset: 3.3, color: 0x523a76, opacity: 0.18, tilt: 0.1 },
      { radius: 1.12, tube: 0.012, arc: 1.04, offset: 1.96, color: 0x1f4d72, opacity: 0.16, tilt: -0.15 },
    ];

    for (const [index, spec] of streamers.entries()) {
      const geometry = new THREE.TorusGeometry(
        spec.radius,
        spec.tube,
        6,
        80,
        Math.PI * spec.arc,
      );
      const material = createMaterial(spec.color, spec.opacity, THREE.AdditiveBlending);
      const streamer = new THREE.Mesh(geometry, material);
      streamer.name = `Accretion membrane ${index + 1}`;
      streamer.position.copy(CORE_CENTER).add(new THREE.Vector3(0, 0, -0.01 - index * 0.025));
      streamer.scale.set(1, 0.34 + index * 0.035, 0.82);
      streamer.rotation.set(spec.tilt, 0.05 * (index - 1), spec.offset);
      streamer.renderOrder = 27;
      streamer.material.depthWrite = false;
      streamer.material.depthTest = false;
      streamer.userData.baseRotation = streamer.rotation.clone();
      this.streamers.push(streamer);
      this.streamerMaterials.push(material);
      this.object.add(streamer);
    }

    this.moteGeometry = new THREE.BufferGeometry();
    this.motePositions = new Float32Array(MOTE_COUNT * 3);
    this.moteGeometry.setAttribute("position", new THREE.BufferAttribute(this.motePositions, 3));
    this.moteMaterial = new THREE.PointsMaterial({
      color: 0x5a73a2,
      size: 0.034,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.motes = new THREE.Points(this.moteGeometry, this.moteMaterial);
    this.motes.name = "Slow infalling particulate matter";
    this.motes.renderOrder = 28;
    this.object.add(this.motes);

    this.moteSeeds = Array.from({ length: MOTE_COUNT }, (_, index) => ({
      phase: seeded(index, 1) * Math.PI * 2,
      radius: 0.64 + seeded(index, 2) * 0.95,
      speed: 0.045 + seeded(index, 3) * 0.045,
      tilt: (seeded(index, 4) - 0.5) * 0.55,
      drift: seeded(index, 5) * Math.PI * 2,
    }));
    this.activeMoteCount = this.getActiveMoteCount();
    this.moteGeometry.setDrawRange(0, this.activeMoteCount);
    this.update(0);
  }

  getActiveMoteCount() {
    const isCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches;
    const isCompactViewport = window.innerWidth < 720;
    return isCoarsePointer || isCompactViewport ? MOBILE_MOTE_COUNT : MOTE_COUNT;
  }

  update(elapsed) {
    const nextMoteCount = this.getActiveMoteCount();
    if (nextMoteCount !== this.activeMoteCount) {
      this.activeMoteCount = nextMoteCount;
      this.moteGeometry.setDrawRange(0, this.activeMoteCount);
    }

    const slowTime = elapsed * 0.18;
    this.halo.rotation.z = 0.06 + Math.sin(slowTime * 0.7) * 0.025;
    this.halo.material.opacity = 0.28 + Math.sin(slowTime) * 0.035;

    this.streamers.forEach((streamer, index) => {
      const base = streamer.userData.baseRotation;
      streamer.rotation.x = base.x + Math.sin(slowTime * (0.7 + index * 0.1) + index) * 0.035;
      streamer.rotation.y = base.y + Math.cos(slowTime * 0.6 + index) * 0.045;
      streamer.rotation.z = base.z + slowTime * (0.12 + index * 0.035);
    });

    for (let index = 0; index < this.activeMoteCount; index += 1) {
      const mote = this.moteSeeds[index];
      const angle = mote.phase + elapsed * mote.speed;
      const radius = mote.radius * (0.92 + Math.sin(elapsed * 0.22 + mote.drift) * 0.08);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.32;
      const z = Math.sin(angle * 1.7 + mote.drift) * radius * 0.24;
      const cosTilt = Math.cos(mote.tilt);
      const sinTilt = Math.sin(mote.tilt);
      const offset = index * 3;
      this.motePositions[offset] = x + z * sinTilt;
      this.motePositions[offset + 1] = CORE_CENTER.y + y;
      this.motePositions[offset + 2] = z * cosTilt - x * sinTilt * 0.18;
    }

    this.moteGeometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.coreGeometry.dispose();
    this.coreMaterial.dispose();
    this.haloGeometry.dispose();
    this.haloMaterial.dispose();
    this.moteGeometry.dispose();
    this.moteMaterial.dispose();
    this.streamers.forEach((streamer) => streamer.geometry.dispose());
    this.streamerMaterials.forEach((material) => material.dispose());
    this.object.removeFromParent();
  }
}
