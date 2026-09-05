# voidpulse jellyfish

An interactive jellyfish that contains a black hole. An original Three.js
WebGL 2 renderer combines a luminous mantle, trailing filaments, a folded
accretion disk, and an artistic gravitational-lensing effect.

The scene takes direction from the earlier VoidPulse Jellyfish artwork,
*Interstellar*, and reusable design units from `design-vocabulary`.
See [art direction](docs/art-direction.md) for references and design decisions.
The lensing effect is an artistic approximation, not a physics simulation.

## Local development

Use Node.js 20.19+ on the 20.x line, or Node.js 22.12+.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Use a browser with WebGL 2 and hardware
acceleration enabled.

## Controls

- Select **encounter** for the full organism view.
- Select **event horizon** to approach the nucleus.
- Drag to orbit. Scroll or pinch to zoom.
- Use the pause button to stop automatic motion. Press it again to resume.
- Select **excite**, or double-click the canvas, to send a temporary pulse.
- Use the fullscreen button to enter or leave fullscreen where supported.

Manual orbit stops automatic camera rotation. Selecting a view restores it.
The operating system's reduced-motion preference starts the artwork static and
hides excitation. Manual camera controls remain available. The play button can
explicitly enable animation. A later system preference change restores that preference.

## Build and preview

```sh
npm run build
npm run preview
```

The build checks TypeScript and writes the production bundle to `dist/`.
The preview command serves that bundle locally.

## Deploy

Cloudflare Workers serves `dist/` as static assets. The repository's
`wrangler.jsonc` assigns both requested custom domains:

- [jellyfish.shin86.dev](https://jellyfish.shin86.dev)
- [jellyfish.mhaider.dev](https://jellyfish.mhaider.dev)

Use an authenticated Cloudflare account with access to both zones. Build the
site, check the deployment configuration, then deploy:

```sh
npm run build
npx wrangler@4.127.1 deploy --config wrangler.jsonc --dry-run
npx wrangler@4.127.1 deploy --config wrangler.jsonc
```

Cloudflare manages DNS and certificates through Worker custom domains.
These commands document deployment setup. They do not certify a live release.

## Architecture and future music input

- `src/main.ts` connects browser controls to the application.
- `src/app/VoidpulseApp.ts` owns the Three.js renderer, camera, frame loop,
  post-processing, resize handling, motion preferences, and cleanup.
- `src/visual/Organism.ts`, `Singularity.ts`, and `Cosmos.ts` build the organism,
  black-hole treatment, and surrounding space.
- `src/core/Signal.ts` defines the future music-input boundary.
- `src/style.css` places the DOM interface over the canvas.

`SignalSource` supplies normalized energy, bass, treble, and onset values.
A later Web Audio adapter can connect through `setSignalSource()`.
The default source supplies silence. The current renderer uses energy and bass
for visual intensity. Treble and onset remain available for later mappings.
No music playback or microphone access is included.

`SignalSource`, `SignalFrame`, and `Readonly` exist only during TypeScript
checking. They are erased from the JavaScript build. The source object's
`sample()` method and the normalization function run in the browser.
Normalization clamps finite inputs to zero through one and replaces invalid
values with zero. The frame loop sends the resulting intensity to scene
updates. Three.js passes runtime uniform values to the GPU, where GLSL shaders
produce the visual response.

The scene caps pixel density and can reduce resolution after sustained slow
frames. It pauses rendering while the document is hidden.

## Prior art and licenses

The earlier Aurelia adaptation remains in `src/vendor/aurelia/` as unused prior
art. The active renderer does not import it. Its copyright headers and MIT
license remain in [third-party notices](THIRD_PARTY_NOTICES.md).
See [art direction](docs/art-direction.md) for the original Aurelia and VoXelo
references, the *Interstellar* rendering paper, and design-vocabulary provenance.
