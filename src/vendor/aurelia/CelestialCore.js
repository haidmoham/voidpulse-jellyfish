// Local Voidpulse addition to the Aurelia-derived Medusa visual.
// A compact, spherical bell organ with a circular aperture and suspended
// vesicles inside the jellyfish's translucent tissue.

import * as THREE from "three/webgpu";

const CORE_CENTER = new THREE.Vector3(0, 0.52, 0.08);
const MOTE_COUNT = 24;
const MOBILE_MOTE_COUNT = 14;

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
    this.object.name = "Celestial bell organ";
    this.object.renderOrder = 21;

    this.coreMaterial = createMaterial(0x01020a, 0.98);
    this.coreGeometry = new THREE.SphereGeometry(1, 32, 20);
    this.core = new THREE.Mesh(this.coreGeometry, this.coreMaterial);
    this.core.name = "Spherical central bell organ";
    this.core.position.copy(CORE_CENTER);
    this.core.scale.setScalar(0.43);
    // The bell is intentionally translucent but writes late in Aurelia's
    // custom order; rendering this small organ afterward keeps it legible
    // as an embedded anatomy rather than a surface decal.
    this.core.renderOrder = 26;
    this.core.material.depthTest = false;
    this.core.material.depthWrite = false;
    this.object.add(this.core);

    this.haloMaterial = createMaterial(0x4d7ca1, 0.28, THREE.AdditiveBlending);
    this.haloGeometry = new THREE.TorusGeometry(0.48, 0.018, 8, 96);
    this.halo = new THREE.Mesh(this.haloGeometry, this.haloMaterial);
    this.halo.name = "Circular bell aperture";
    this.halo.position.copy(CORE_CENTER).add(new THREE.Vector3(0, 0, -0.06));
    this.halo.rotation.set(0.02, -0.04, 0);
    this.halo.renderOrder = 27;
    this.halo.material.depthWrite = false;
    this.halo.material.depthTest = false;
    this.object.add(this.halo);

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
    this.motes.name = "Suspended bioluminescent vesicles";
    this.motes.renderOrder = 28;
    this.object.add(this.motes);

    this.moteSeeds = Array.from({ length: MOTE_COUNT }, (_, index) => ({
      phase: seeded(index, 1) * Math.PI * 2,
      radius: 0.64 + seeded(index, 2) * 0.95,
      speed: 0.035 + seeded(index, 3) * 0.035,
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
    this.halo.rotation.z = Math.sin(slowTime * 0.7) * 0.015;
    this.halo.material.opacity = 0.24 + Math.sin(slowTime) * 0.03;
    const organPulse = 1 + Math.sin(slowTime * 2.1) * 0.025;
    this.core.scale.setScalar(0.43 * organPulse);

    for (let index = 0; index < this.activeMoteCount; index += 1) {
      const mote = this.moteSeeds[index];
      const angle = mote.phase + elapsed * mote.speed;
      const radius = mote.radius * (0.94 + Math.sin(elapsed * 0.28 + mote.drift) * 0.06);
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
    this.object.removeFromParent();
  }
}
