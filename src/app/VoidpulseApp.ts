import * as THREE from "three";
import {
  CelestialJellyfish,
  DEFAULT_JELLYFISH_PARAMS,
  type CelestialJellyfishParams,
} from "../visual/CelestialJellyfish";
import { createControls } from "./controls";
import { OrbitCameraController } from "./OrbitCameraController";

const MAX_DELTA_SECONDS = 1 / 20;
const MAX_PIXEL_RATIO = 2;

export class VoidpulseApp {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  private readonly grid = new THREE.GridHelper(12, 24, 0x456f9b, 0x18304f);
  private readonly renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  private readonly params: CelestialJellyfishParams = {
    ...DEFAULT_JELLYFISH_PARAMS,
  };
  private readonly jellyfish: CelestialJellyfish;
  private readonly cameraController: OrbitCameraController;
  private readonly controls;
  private readonly clock = new THREE.Clock();
  private readonly reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  private reducedMotion = this.reducedMotionQuery.matches;
  private loopRunning = false;
  private disposed = false;

  constructor(private readonly root: HTMLElement) {
    this.scene.background = new THREE.Color(0x020714);
    this.camera.position.set(0, 0, 5.5);

    this.grid.rotation.x = Math.PI / 2;
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0.22;
    this.grid.material.depthWrite = false;
    this.scene.add(this.grid);

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.renderer.domElement.className = "experience-canvas";
    this.root.prepend(this.renderer.domElement);

    this.jellyfish = new CelestialJellyfish(
      this.scene,
      this.camera,
      this.renderer,
      this.params,
    );
    this.cameraController = new OrbitCameraController(
      this.camera,
      this.renderer.domElement,
    );
    this.controls = createControls(this.params);
  }

  start(): void {
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
    this.controls.destroy();
    this.cameraController.dispose();
    this.jellyfish.dispose();
    this.scene.remove(this.grid);
    this.grid.geometry.dispose();
    this.grid.material.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private readonly resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);

    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.jellyfish.resize(width, height, pixelRatio);
  };

  private readonly frame = (): void => {
    if (this.disposed || document.hidden) return;

    const dt = Math.min(this.clock.getDelta(), MAX_DELTA_SECONDS);
    this.jellyfish.update(dt);
    this.cameraController.update(
      dt,
      this.reducedMotion ? 0 : this.params.cameraDrift,
    );
    this.jellyfish.render();
  };

  private startLoop(): void {
    if (
      this.disposed ||
      this.loopRunning ||
      document.hidden
    ) {
      return;
    }

    this.loopRunning = true;
    this.clock.start();
    this.renderer.setAnimationLoop(this.frame);
  }

  private stopLoop(): void {
    if (!this.loopRunning) return;

    this.loopRunning = false;
    this.clock.stop();
    this.renderer.setAnimationLoop(null);
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
