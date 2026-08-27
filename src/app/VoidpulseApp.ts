import * as THREE from "three";
import {
  CelestialJellyfish,
  DEFAULT_JELLYFISH_PARAMS,
  type CelestialJellyfishParams,
} from "../visual/CelestialJellyfish";
import { createControls } from "./controls";

const MAX_DELTA_SECONDS = 1 / 20;
const MAX_PIXEL_RATIO = 2;

export class VoidpulseApp {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  private readonly renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  private readonly params: CelestialJellyfishParams = {
    ...DEFAULT_JELLYFISH_PARAMS,
  };
  private readonly jellyfish: CelestialJellyfish;
  private readonly controls;
  private readonly clock = new THREE.Clock();
  private readonly reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  private reducedMotion = this.reducedMotionQuery.matches;
  private loopRunning = false;
  private disposed = false;

  constructor(private readonly root: HTMLElement) {
    this.scene.background = new THREE.Color(0x05060a);
    this.camera.position.set(0, 0, 7);

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
    this.controls = createControls(this.params);
  }

  start(): void {
    this.resize();
    window.addEventListener("resize", this.resize, { passive: true });
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.reducedMotionQuery.addEventListener(
      "change",
      this.handleReducedMotionChange,
    );
    window.addEventListener("pagehide", this.handlePageHide);
    window.addEventListener("pageshow", this.handlePageShow);

    if (this.reducedMotion) {
      this.renderStillFrame();
    } else {
      this.startLoop();
    }
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
    this.jellyfish.dispose();
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
    if (this.disposed || this.reducedMotion || document.hidden) return;

    const dt = Math.min(this.clock.getDelta(), MAX_DELTA_SECONDS);
    this.jellyfish.update(dt);
    this.jellyfish.render();
  };

  private startLoop(): void {
    if (
      this.disposed ||
      this.loopRunning ||
      this.reducedMotion ||
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

  private renderStillFrame(): void {
    if (this.disposed) return;

    this.jellyfish.update(0);
    this.jellyfish.render();
  }

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.stopLoop();
    } else if (this.reducedMotion) {
      this.renderStillFrame();
    } else {
      this.startLoop();
    }
  };

  private readonly handleReducedMotionChange = (
    event: MediaQueryListEvent,
  ): void => {
    this.reducedMotion = event.matches;

    if (this.reducedMotion) {
      this.stopLoop();
      this.renderStillFrame();
    } else {
      this.startLoop();
    }
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

    if (this.reducedMotion) {
      this.renderStillFrame();
    } else {
      this.startLoop();
    }
  };
}
