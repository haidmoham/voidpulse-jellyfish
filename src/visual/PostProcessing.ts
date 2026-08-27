import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/** Small post-processing wrapper so rendering remains a one-call operation. */
export class PostProcessing {
  private readonly composer: EffectComposer;
  private readonly bloomPass: UnrealBloomPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.72, 0.45, 0.82);
    this.composer.addPass(this.bloomPass);
  }

  render(deltaTime?: number): void {
    this.composer.render(deltaTime);
  }

  setBloomStrength(strength: number): void {
    this.bloomPass.strength = THREE.MathUtils.clamp(strength, 0, 3);
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
  }

  dispose(): void {
    this.bloomPass.dispose();
    this.composer.dispose();
  }
}
