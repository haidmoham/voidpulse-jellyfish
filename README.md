# VoidPulse Jellyfish

VoidPulse Jellyfish is a real-time Three.js visual built with Vite and
TypeScript.

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

## Build

```sh
npm run build
```

The build runs the TypeScript project check and writes the Vite bundle to
`dist/`.

## Architecture

- `src/main.ts` mounts and starts the application.
- `src/app/VoidpulseApp.ts` owns the renderer, camera, frame loop, resize
  handling, comfort settings, and cleanup.
- `src/app/controls.ts` defines the `lil-gui` controls.
- `src/visual/CelestialJellyfish.ts` owns the scene graph, animation, and
  post-processing.
- `src/style.css` provides the full-viewport canvas and intentionally quiet
  overlay typography. With reduced motion enabled, the app renders a still
  frame instead of running the animation loop.
