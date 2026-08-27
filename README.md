# VoidPulse Jellyfish

VoidPulse Jellyfish is a real-time Three.js visual built with Vite and
TypeScript.

The primary jellyfish and blue procedural seascape are adapted from
[Aurelia](https://github.com/holtsetio/aurelia) by Holtsetio under the MIT
License. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for attribution
and the complete license notice.

The biological black-hole treatment takes visual inspiration from VoXelo's
[Three.js Black Hole with Shaders](https://codepen.io/VoXelo/full/wBKvJxd),
especially its central void, lensing rim, and flowing accretion structure. The
effect is reinterpreted here with original, subdued WebGPU geometry and motion.

## Setup

```sh
npm install
```

## Run locally

```sh
npm run dev
```

Then open the local URL printed by Vite. The production preview can be run with
`npm run preview` after building.

Drag the scene to orbit the jellyfish. Use the mouse wheel or a two-finger
pinch to zoom. The spherical orbit model is adapted from
[`haidmoham/fourier-drawing`](https://github.com/haidmoham/fourier-drawing).

## Build

```sh
npm run build
```

The build runs the TypeScript project check and writes the Vite bundle to
`dist/`.

## Architecture

- `src/main.ts` mounts and starts the application.
- `src/app/VoidpulseApp.ts` owns the asynchronous WebGPU visual lifecycle,
  frame loop, resize handling, comfort settings, and cleanup.
- `src/app/OrbitCameraController.ts` handles pointer orbit and wheel or pinch
  zoom around the jellyfish.
- `src/vendor/aurelia/AureliaScene.js` assembles the single vendored Medusa,
  blue procedural environment, GPU Verlet simulation, and TSL bloom pipeline.
- `src/vendor/aurelia/` contains the adapted Aurelia source boundary. Its
  licensing and provenance are recorded in `THIRD_PARTY_NOTICES.md`.
- `src/style.css` provides the full-viewport canvas and intentionally quiet
  overlay typography. With reduced motion enabled, the scene continues its
  slow animation while automatic camera drift is disabled.

Compact and coarse-pointer devices use a reduced pixel-density ceiling, fewer
Verlet substeps, and a smaller celestial particle field. The animation pauses
while the page is suspended and resumes without accumulating a large frame
delta.
