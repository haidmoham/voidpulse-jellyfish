// Adapted from holtsetio/aurelia under the MIT License.
// Source: https://github.com/holtsetio/aurelia
// Vendored for the single Voidpulse Medusa visual; local integration changes are intentional.

import * as THREE from "three/webgpu";
import {iridescenceIOR, uniform} from "three/tsl";

import {noise2D, noise3D} from "./common/noise";

import {MedusaTentacles} from "./medusaTentacles";
import {MedusaBell} from "./medusaBell";
import {conf} from "./conf";
import {MedusaOralArms} from "./medusaOralArms";
import {MedusaBellGeometry} from "./medusaBellGeometry";
import {MedusaBellPattern} from "./medusaBellPattern";
import {CelestialCore} from "./CelestialCore";

export class Medusa {
    renderer = null;
    physics = null;
    object = null;
    bridge = null;
    medusaId = -1;
    noiseSeed = 0;
    time = 0;
    phase = 0;
    needsPositionUpdate = true;
    charge = 0;
    static uniforms = {};

    constructor(renderer, physics, bridge){
        this.renderer = renderer;
        this.physics = physics;
        this.object = new THREE.Object3D();
        this.transformationObject = new THREE.Object3D();
        this.object.add(this.transformationObject);

        this.time = 0;
        this.noiseSeed = 7.25;
        this.bridge = bridge;
        this.medusaId = this.bridge.registerMedusa(this);

        this.transformationObject.position.set(0, 0.1, 0);

        this.createBellGeometry();

        this.updatePosition(0,0);
    }

    createBellGeometry() {
        this.subdivisions = 40; //has to be even

        this.bell = new MedusaBell(this);
        this.tentacles = new MedusaTentacles(this);
        this.arms = new MedusaOralArms(this);
        this.celestialCore = new CelestialCore();

        this.bell.createGeometry();
        this.tentacles.createGeometry();
        this.arms.createGeometry();
        //this.gut.createGeometry();

        this.object.add(this.bell.object);
        this.object.add(this.tentacles.object);
        this.object.add(this.arms.object);
        this.transformationObject.add(this.celestialCore.object);
    }

    async bake() { }

    updatePosition(delta, elapsed) {
        const time = this.time * 0.1;
        const rotX = noise3D(this.noiseSeed, 13.37, time) * Math.PI * 0.055;
        const rotY = noise3D(this.noiseSeed, 12.37, time*0.1) * Math.PI * 0.2;
        const rotZ = noise3D(this.noiseSeed, 11.37, time) * Math.PI * 0.055;
        this.transformationObject.rotation.set(rotX,rotY,rotZ, "XZY");

        // Voidpulse keeps one Medusa anchored around the origin. The bridge still
        // updates the fixed bell vertices, while the Verlet chains retain their delay.

        this.transformationObject.updateMatrix();
    }

    updatePointerInteraction(ray) {
        const dist = ray.distanceToPoint(this.transformationObject.position);
        this.charge += (1 - Math.min(Math.max(0, dist - 0.5), 1)) * 0.05;
        this.charge = Math.min(this.charge, 1.00);
        this.charge *= 0.95;
    }

    async update(delta, elapsed) {
        this.time += delta * (1.0 + noise2D(this.noiseSeed, elapsed*0.1) * 0.1 + this.charge * 0.5);
        this.phase = ((this.time * 0.2) % 1.0) * Math.PI * 2;
        this.updatePosition(delta, elapsed);
        this.celestialCore.update(elapsed, this.phase, this.charge);
        //return await this.bridge.update();
    }


    static async initStatic(physics) {
        Medusa.uniforms.matrix = uniform(new THREE.Matrix4());
        Medusa.uniforms.phase = uniform(0);
        Medusa.uniforms.charge = uniform(0);

        MedusaBellPattern.createColorNode();
        MedusaBellGeometry.createMaterial(physics);
        MedusaTentacles.createMaterial(physics);
        MedusaOralArms.createMaterial(physics);

    }

    static setMouseRay(ray) { }

    static updateStatic() {
        const { roughness } = conf;
        MedusaBellGeometry.materialInner.roughness = roughness;
        MedusaBellGeometry.materialOuter.roughness = roughness;

    }

    dispose() {
        this.celestialCore?.dispose();
    }

}
