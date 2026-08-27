import * as THREE from "three";
import GUI from "lil-gui";
import {
  CelestialJellyfish,
  DEFAULT_JELLYFISH_PARAMS,
  type CelestialJellyfishParams,
} from "./visual/CelestialJellyfish";
import "./style.css";

const MAX_DELTA_SECONDS = 1 / 20;
const MAX_PIXEL_RATIO = 2;

type ControlKey =
  | "bellPulse"
  | "bellDeformation"
  | "tentacleNoise"
  | "tentacleSpeed"
  | "emission"
  | "bloomStrength"
  | "particleDensity"
  | "cameraDrift";

const CONTROL_KEYS: readonly ControlKey[] = [
  "bellPulse",
  "bellDeformation",
  "tentacleNoise",
  "tentacleSpeed",
  "emission",
  "bloomStrength",
  "particleDensity",
  "cameraDrift",
];

const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("VoidPulse Jellyfish requires an #app mount element.");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0, 7);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.domElement.setAttribute("aria-hidden", "true");
renderer.domElement.className = "experience-canvas";
app.prepend(renderer.domElement);

const params: CelestialJellyfishParams = {
  ...DEFAULT_JELLYFISH_PARAMS,
};
const jellyfish = new CelestialJellyfish(scene, camera, renderer, params);
const gui = new GUI({ title: "Jellyfish controls", closeFolders: true });
gui.domElement.setAttribute("aria-label", "Jellyfish controls");

const controlRanges: Record<ControlKey, [number, number, number]> = {
  bellPulse: [0, 1, 0.01],
  bellDeformation: [0, 1, 0.01],
  tentacleNoise: [0, 1, 0.01],
  tentacleSpeed: [0, 2, 0.01],
  emission: [0, 2, 0.01],
  bloomStrength: [0, 3, 0.01],
  particleDensity: [0, 1, 0.01],
  cameraDrift: [0, 1, 0.01],
};

for (const key of CONTROL_KEYS) {
  const [min, max, step] = controlRanges[key];
  gui.add(params, key, min, max, step);
}

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = reducedMotionQuery.matches;
let disposed = false;
let loopRunning = false;
const clock = new THREE.Clock();

function pixelRatio(): number {
  return Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
}

function resize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const ratio = pixelRatio();

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(ratio);
  renderer.setSize(width, height, false);
  jellyfish.resize(width, height, ratio);
}

function renderStillFrame(): void {
  if (disposed) return;

  jellyfish.update(0);
  jellyfish.render();
}

function startLoop(): void {
  if (disposed || loopRunning || reducedMotion || document.hidden) return;

  loopRunning = true;
  clock.start();
  renderer.setAnimationLoop(frame);
}

function stopLoop(): void {
  if (!loopRunning) return;

  loopRunning = false;
  renderer.setAnimationLoop(null);
}

function frame(): void {
  if (disposed || reducedMotion || document.hidden) return;

  const dt = Math.min(clock.getDelta(), MAX_DELTA_SECONDS);
  jellyfish.update(dt);
  jellyfish.render();
}

function handleVisibilityChange(): void {
  if (document.hidden) {
    clock.stop();
    stopLoop();
    return;
  }

  if (reducedMotion) {
    clock.stop();
    renderStillFrame();
    return;
  }

  startLoop();
}

function handleReducedMotionChange(event: MediaQueryListEvent): void {
  reducedMotion = event.matches;

  if (reducedMotion) {
    clock.stop();
    stopLoop();
    renderStillFrame();
  } else if (!document.hidden) {
    startLoop();
  }
}

function handlePageHide(event: PageTransitionEvent): void {
  if (event.persisted) {
    clock.stop();
    stopLoop();
  } else {
    dispose();
  }
}

function handlePageShow(event: PageTransitionEvent): void {
  if (!event.persisted || disposed) return;

  if (reducedMotion) {
    clock.stop();
    renderStillFrame();
  } else if (!document.hidden) {
    startLoop();
  }
}

function dispose(): void {
  if (disposed) return;
  disposed = true;

  renderer.setAnimationLoop(null);
  window.removeEventListener("resize", resize);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  reducedMotionQuery.removeEventListener("change", handleReducedMotionChange);
  window.removeEventListener("pagehide", handlePageHide);
  window.removeEventListener("pageshow", handlePageShow);
  gui.destroy();
  jellyfish.dispose();
  renderer.dispose();
  renderer.domElement.remove();
}

resize();
window.addEventListener("resize", resize, { passive: true });
document.addEventListener("visibilitychange", handleVisibilityChange);
reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
window.addEventListener("pagehide", handlePageHide);
window.addEventListener("pageshow", handlePageShow);

if (reducedMotion) {
  clock.stop();
  renderStillFrame();
} else {
  startLoop();
}
