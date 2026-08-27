import * as THREE from 'three';
import { Bell } from './Bell.js';
import { Particles } from './Particles.js';
import { PostProcessing } from './PostProcessing.js';
import { Starfield } from './Starfield.js';
import { Tentacles } from './Tentacles.js';
import {
  createMutableParameters,
  defaultCelestialJellyfishParameters,
  type CelestialJellyfishParameterInput,
  type CelestialJellyfishParameters,
} from './types.js';

/** Compatibility-friendly names for the app-level parameter object. */
export type CelestialJellyfishParams = CelestialJellyfishParameters;
export const DEFAULT_JELLYFISH_PARAMS = defaultCelestialJellyfishParameters;

/**
 * A self-contained Three.js visual. Construct it once, mutate `params` from a
 * UI if desired, then call update(dt) followed by render() every frame.
 */
export class CelestialJellyfish {
  readonly params: CelestialJellyfishParameters;
  readonly group = new THREE.Group();
  private readonly bell = new Bell();
  private readonly tentacles = new Tentacles();
  private readonly particles = new Particles();
  private readonly starfield = new Starfield();
  private readonly postProcessing: PostProcessing;
  private readonly cameraAnchor: THREE.Vector3;
  private elapsed = 0;
  private lastDelta = 1 / 60;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
    private readonly renderer: THREE.WebGLRenderer,
    parameters: CelestialJellyfishParameterInput = {},
  ) {
    this.params = createMutableParameters(parameters);
    this.cameraAnchor = camera.position.clone();
    this.group.add(this.bell.mesh, this.tentacles.group, this.particles.points);
    this.scene.add(this.group, this.starfield.points);
    this.postProcessing = new PostProcessing(renderer, scene, camera);
    this.resize();
  }

  update(deltaTime: number): void {
    const dt = THREE.MathUtils.clamp(Number.isFinite(deltaTime) ? deltaTime : 0, 0, 0.1);
    this.lastDelta = dt;
    this.elapsed += dt;
    this.bell.update(this.elapsed, this.params);
    this.tentacles.update(this.elapsed, this.params);
    this.particles.update(dt, this.elapsed, this.params);
    this.starfield.update(this.elapsed);
    this.postProcessing.setBloomStrength(this.params.bloomStrength);
    this.applyCameraDrift();
  }

  render(): void {
    this.postProcessing.render(this.lastDelta);
  }

  resize(
    width = this.getWidth(),
    height = this.getHeight(),
    pixelRatio = this.renderer.getPixelRatio(),
  ): void {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = safeWidth / safeHeight;
      this.camera.updateProjectionMatrix();
    }
    this.postProcessing.setSize(safeWidth, safeHeight, Math.min(pixelRatio, 2));
  }

  dispose(): void {
    this.scene.remove(this.group, this.starfield.points);
    this.camera.position.copy(this.cameraAnchor);
    this.bell.dispose();
    this.tentacles.dispose();
    this.particles.dispose();
    this.starfield.dispose();
    this.postProcessing.dispose();
    this.group.clear();
  }

  private applyCameraDrift(): void {
    const drift = THREE.MathUtils.clamp(this.params.cameraDrift, 0, 2) * 0.12;
    this.camera.position.set(
      this.cameraAnchor.x + Math.sin(this.elapsed * 0.11) * drift,
      this.cameraAnchor.y + Math.sin(this.elapsed * 0.17) * drift * 0.45,
      this.cameraAnchor.z,
    );
  }

  private getWidth(): number {
    return this.renderer.domElement.clientWidth || this.renderer.domElement.width || 1;
  }

  private getHeight(): number {
    return this.renderer.domElement.clientHeight || this.renderer.domElement.height || 1;
  }
}
