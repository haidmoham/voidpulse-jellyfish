// Adapted from holtsetio/aurelia under the MIT License.
// Source: https://github.com/holtsetio/aurelia
// This is the deliberately small Voidpulse integration: one Medusa, its
// simulation bridge, lights, and the blue procedural environment.

import * as THREE from "three/webgpu";
import { pass, mrt, output, float, vec4, Fn, clamp, vec3 } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";

import { Background } from "./background";
import { conf } from "./conf";
import { Lights } from "./lights";
import { Medusa } from "./medusa";
import { MedusaVerletBridge } from "./medusaVerletBridge";
import { VerletPhysics } from "./physics/verletPhysics";

export class AureliaScene {
  constructor() {
    if (!navigator.gpu) {
      throw new Error(
        "WebGPU is required for the Aurelia visual. Use a current browser with WebGPU enabled.",
      );
    }

    this.renderer = new THREE.WebGPURenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.renderer.domElement.className = "experience-canvas";

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.01, 40);
    this.camera.position.set(0, 0.2, 7.5);
    this.camera.lookAt(0, 0, 0);
  }

  async init() {
    await this.renderer.init();

    if (!this.renderer.backend.isWebGPUBackend) {
      throw new Error(
        "WebGPU could not initialize in this browser. Voidpulse does not fall back silently.",
      );
    }

    conf.init();

    this.physics = new VerletPhysics(this.renderer);
    this.lights = new Lights();
    this.scene.add(this.lights.object);

    this.background = new Background(this.renderer);
    this.scene.environmentNode = Background.envFunction;
    this.scene.environmentIntensity = 0.3;
    this.scene.backgroundNode = Background.fogFunction;

    await Medusa.initStatic(this.physics);

    this.bridge = new MedusaVerletBridge(this.physics);
    this.medusa = new Medusa(this.renderer, this.physics, this.bridge);
    this.scene.add(this.medusa.object);
    this.physics.addObject(this.medusa);
    this.physics.addObject(this.bridge);

    await this.physics.bake();
    this.createPostProcessing();
  }

  createPostProcessing() {
    const scenePass = pass(this.scene, this.camera);
    scenePass.setMRT(
      mrt({
        output,
        bloomIntensity: float(0),
      }),
    );

    const outputPass = scenePass.getTextureNode();
    const bloomIntensityPass = scenePass.getTextureNode("bloomIntensity");
    const bloomPass = bloom(
      Fn(() => {
        const bloomIntensity = bloomIntensityPass.r;
        const charge = bloomIntensityPass.g;
        const colorMask = vec3(1.0 - charge * 0.5, 1.0 - charge, 1.0);
        return vec4(outputPass.rgb * bloomIntensity * colorMask, 1);
      })(),
    );

    this.postProcessing = new THREE.PostProcessing(this.renderer);
    this.postProcessing.outputColorTransform = false;
    this.postProcessing.outputNode = Fn(() => {
      const bloomIntensity = bloomIntensityPass.r;
      const charge = bloomIntensityPass.g;
      const bloomMask = 1.0 - clamp(bloomIntensity, 0, 1) + charge;
      const finalBloom = bloomPass.rgb * clamp(bloomMask, 0, 1);
      return vec4(outputPass.rgb + finalBloom.rgb, 1.0).renderOutput();
    })();

    bloomPass.threshold.value = 0.001;
    bloomPass.strength.value = 0.35;
    bloomPass.radius.value = 0.8;
  }

  resize(width, height, pixelRatio) {
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  async update(delta, elapsed) {
    conf.begin();
    conf.update();
    Medusa.updateStatic();
    this.background.update(elapsed);
    this.lights.update(elapsed);

    if (conf.runSimulation) {
      await this.physics.update(delta, elapsed);
    }

    await this.postProcessing.renderAsync();
    conf.end();
  }

  dispose() {
    this.postProcessing?.dispose?.();
    this.renderer.dispose();
  }
}
