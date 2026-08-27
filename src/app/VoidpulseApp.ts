import * as THREE from "three";
import type { AureliaScene } from "../vendor/aurelia/AureliaScene.js";
import { OrbitCameraController } from "./OrbitCameraController";

const MAX_DELTA_SECONDS = 1 / 20;
const MAX_PIXEL_RATIO = 2;
const CAMERA_DRIFT = 0.35;

export class VoidpulseApp {
  private visual!: AureliaScene;
  private readonly grid = new THREE.GridHelper(12, 24, 0x456f9b, 0x18304f);
  private readonly clock = new THREE.Clock();
  private readonly reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  private cameraController: OrbitCameraController | null = null;
  private reducedMotion = this.reducedMotionQuery.matches;
  private animationFrame: number | null = null;
  private loopRunning = false;
  private disposed = false;

  private constructor(private readonly root: HTMLElement) {}

  static async create(root: HTMLElement): Promise<VoidpulseApp> {
    const app = new VoidpulseApp(root);
    await app.initialize();
    return app;
  }

  async initialize(): Promise<void> {
    const { AureliaScene } = await import("../vendor/aurelia/AureliaScene.js");
    this.visual = new AureliaScene();
    await this.visual.init();

    this.grid.rotation.x = Math.PI / 2;
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0.16;
    this.grid.material.depthWrite = false;
    this.visual.scene.add(this.grid);

    this.root.prepend(this.visual.renderer.domElement);
    this.cameraController = new OrbitCameraController(
      this.visual.camera,
      this.visual.renderer.domElement,
    );
  }

  start(): void {
    if (!this.cameraController) {
      throw new Error("Voidpulse must finish initializing before it starts.");
    }

    this.resize();
    this.cameraController.connect();
    window.addEventListener("resize", this.resize, { passive: true });
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.reducedMotionQuery.addEventListener(
      "change",
      this.handleReducedMotionChange,
    );
    window.addEventListener("pagehide", this.handlePageHide);
    window.addEventListener("pageshow", this.handlePageShow);
    this.startLoop();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.stopLoop();
    window.removeEventListener("resize", this.resize);
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
    this.reducedMotionQuery.removeEventListener(
      "change",
      this.handleReducedMotionChange,
    );
    window.removeEventListener("pagehide", this.handlePageHide);
    window.removeEventListener("pageshow", this.handlePageShow);
    this.cameraController?.dispose();
    this.cameraController = null;
    this.visual.scene.remove(this.grid);
    this.grid.geometry.dispose();
    this.grid.material.dispose();
    this.visual.dispose();
    this.visual.renderer.domElement.remove();
  }

  private readonly resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    this.visual.resize(width, height, pixelRatio);
  };

  private readonly frame = async (): Promise<void> => {
    if (this.disposed || document.hidden || !this.loopRunning) return;

    const dt = Math.min(this.clock.getDelta(), MAX_DELTA_SECONDS);
    this.cameraController?.update(
      dt,
      this.reducedMotion ? 0 : CAMERA_DRIFT,
    );
    await this.visual.update(dt, this.clock.getElapsedTime());

    if (this.loopRunning && !this.disposed && !document.hidden) {
      this.animationFrame = requestAnimationFrame(this.frame);
    }
  };

  private startLoop(): void {
    if (this.disposed || this.loopRunning || document.hidden) return;

    this.loopRunning = true;
    this.clock.start();
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  private stopLoop(): void {
    if (!this.loopRunning) return;

    this.loopRunning = false;
    this.clock.stop();
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.stopLoop();
    } else {
      this.startLoop();
    }
  };

  private readonly handleReducedMotionChange = (
    event: MediaQueryListEvent,
  ): void => {
    this.reducedMotion = event.matches;
  };

  private readonly handlePageHide = (event: PageTransitionEvent): void => {
    if (event.persisted) {
      this.stopLoop();
    } else {
      this.dispose();
    }
  };

  private readonly handlePageShow = (event: PageTransitionEvent): void => {
    if (!event.persisted || this.disposed) return;
    this.startLoop();
  };
}
