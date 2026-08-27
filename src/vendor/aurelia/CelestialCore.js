// Local Voidpulse addition to the Aurelia-derived Medusa visual.
// A compact, spherical bell organ with a bruised aperture and suspended
// vesicles inside the jellyfish's translucent tissue.

import * as THREE from "three/webgpu";

const CORE_CENTER = new THREE.Vector3(0, 0.52, 0.08);
const MOTE_COUNT = 14;
const MOBILE_MOTE_COUNT = 8;

const seeded = (index, salt) => {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
};

const warpRadialGeometry = (geometry, amount, salt) => {
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const direction = new THREE.Vector3(x, y, z).normalize();
    const noise =
      Math.sin(direction.x * 5.7 + direction.y * 3.1 + salt) * 0.55 +
      Math.sin(direction.z * 7.3 - direction.x * 2.4 + salt * 1.9) * 0.45;
    const scale = 1 + noise * amount;
    positions.setXYZ(index, x * scale, y * scale, z * scale);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
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

    this.coreMaterial = createMaterial(0x100811, 0.96);
    this.coreGeometry = warpRadialGeometry(
      new THREE.SphereGeometry(1, 28, 18),
      0.055,
      1.4,
    );
    this.core = new THREE.Mesh(this.coreGeometry, this.coreMaterial);
    this.core.name = "Spherical central bell organ";
    this.core.position.copy(CORE_CENTER);
    this.core.scale.setScalar(0.43);
    // The bell is intentionally translucent but writes late in Aurelia's
    // custom order; rendering this small organ afterward keeps it legible
    // as an embedded anatomy rather than a surface decal.
    this.core.renderOrder = 26;
    // Aurelia's translucent bell writes depth, so this controlled late pass is
    // required to keep the embedded organ legible through its tissue.
    this.core.material.depthTest = false;
    this.core.material.depthWrite = false;
    this.object.add(this.core);

    this.outerLipMaterial = createMaterial(0x3a142c, 0.48, THREE.NormalBlending);
    this.outerLipGeometry = warpRadialGeometry(
      new THREE.RingGeometry(0.45, 0.59, 36, 1),
      0.075,
      2.2,
    );
    this.outerLip = new THREE.Mesh(this.outerLipGeometry, this.outerLipMaterial);
    this.outerLip.name = "Bruised outer bell aperture";
    this.outerLip.position.copy(CORE_CENTER).add(new THREE.Vector3(0, 0, -0.055));
    this.outerLip.renderOrder = 25;
    this.outerLip.material.depthWrite = false;
    this.outerLip.material.depthTest = false;
    this.object.add(this.outerLip);

    this.innerLipMaterial = createMaterial(0x09030a, 0.72, THREE.NormalBlending);
    this.innerLipGeometry = warpRadialGeometry(
      new THREE.RingGeometry(0.4, 0.47, 32, 1),
      0.065,
      4.6,
    );
    this.innerLip = new THREE.Mesh(this.innerLipGeometry, this.innerLipMaterial);
    this.innerLip.name = "Recessed inner bell aperture";
    this.innerLip.position.copy(CORE_CENTER).add(new THREE.Vector3(0, 0, 0.025));
    this.innerLip.renderOrder = 27;
    this.innerLip.material.depthWrite = false;
    this.innerLip.material.depthTest = false;
    this.object.add(this.innerLip);

    this.moteGeometry = new THREE.BufferGeometry();
    this.motePositions = new Float32Array(MOTE_COUNT * 3);
    this.moteGeometry.setAttribute("position", new THREE.BufferAttribute(this.motePositions, 3));
    this.moteMaterial = new THREE.PointsMaterial({
      color: 0x6d5268,
      size: 0.024,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.motes = new THREE.Points(this.moteGeometry, this.moteMaterial);
    this.motes.name = "Suspended bioluminescent vesicles";
    this.motes.renderOrder = 28;
    this.object.add(this.motes);

    this.moteSeeds = Array.from({ length: MOTE_COUNT }, (_, index) => ({
      phase: seeded(index, 1) * Math.PI * 2,
      radius: 0.48 + seeded(index, 2) * 0.42,
      speed: 0.02 + seeded(index, 3) * 0.025,
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

  update(elapsed, phase = 0, charge = 0) {
    const nextMoteCount = this.getActiveMoteCount();
    if (nextMoteCount !== this.activeMoteCount) {
      this.activeMoteCount = nextMoteCount;
      this.moteGeometry.setDrawRange(0, this.activeMoteCount);
    }

    const slowTime = elapsed * 0.18;
    const contraction = Math.max(0, Math.sin(phase - 0.55));
    const organPulse = 1 + contraction * 0.05 + Math.min(charge, 1) * 0.018;
    this.core.scale.setScalar(0.43 * organPulse);
    this.outerLip.scale.setScalar(1 + contraction * 0.025);
    this.innerLip.scale.setScalar(1 - contraction * 0.04);
    this.outerLip.material.opacity = 0.42 + contraction * 0.1;
    this.innerLip.material.opacity = 0.68 + contraction * 0.08;

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
    this.outerLipGeometry.dispose();
    this.outerLipMaterial.dispose();
    this.innerLipGeometry.dispose();
    this.innerLipMaterial.dispose();
    this.moteGeometry.dispose();
    this.moteMaterial.dispose();
    this.object.removeFromParent();
  }
}
