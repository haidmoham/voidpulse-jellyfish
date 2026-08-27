# VoidPulse Jellyfish

VoidPulse Jellyfish is a Vite + TypeScript real-time Three.js visual study. The
visual layer is isolated in `src/visual/CelestialJellyfish`; the application
shell owns the renderer, camera, animation lifecycle, responsive sizing, and
small set of exposed controls.

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

- `src/main.ts` creates the scene, perspective camera, WebGL renderer, and
  `CelestialJellyfish` instance. It also owns resize handling, bounded frame
  deltas, visibility pause/resume, reduced-motion behavior, lil-gui controls,
  and teardown.
- `src/visual/CelestialJellyfish.ts` owns the jellyfish scene graph, post-
  processing, simulation details, and rendering implementation.
- `src/style.css` provides the full-viewport canvas and intentionally quiet
  overlay typography. The animation honors `prefers-reduced-motion` by holding
  simulation time at zero while continuing to render a still frame.
