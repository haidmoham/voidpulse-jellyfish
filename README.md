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

- Press **play music** to start the included track, “Night Owl” by Broke For Free.
- Press **pause music** to pause it. Press play to resume from the same position.
- Use the song-position slider to seek. Use **volume** to change loudness.
- Use **intensity** from 0% to 300% to control audio-driven deformation.
  High settings increase tentacle whipping and disk expansion. Brightness remains bounded.
- Open **choose your music** to select a local song or connect another browser tab.
  Local files are played through a blob URL. They are not uploaded.
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

### YouTube and other browser audio

Play YouTube or another music service in a separate Chrome or Edge tab on a
computer. In this artwork, open **choose your music**, then select
**YouTube / other tab**. Choose the music tab in the browser picker.
Enable **share tab audio**. Use **disconnect audio** to stop analysis.

The source tab owns playback and volume. The artwork does not replay captured
audio, so it does not produce an echo. The browser requires a video track for
the sharing picker. The artwork only analyzes audio and does not display,
record, or transmit the video. All tracks stop when sharing ends or the source changes.

Tab audio support varies by browser and device. A share without an audio track
shows recovery instructions and releases every track. Demo and local-file
playback remain available. An embedded YouTube player cannot supply the audio
samples needed for this visualizer through its public player API.

References: [Chrome sharing controls](https://developer.chrome.com/docs/web-platform/screen-sharing-controls)
and [YouTube player API](https://developers.google.com/youtube/iframe_api_reference).

## Build and preview

```sh
npm run build
npm run preview
npm run test:audio
```

The build checks TypeScript and writes the production bundle to `dist/`.
The preview command serves that bundle locally.
The audio checks cover frequency-band separation, silence, source switching,
failure recovery, late capture results, and captured-track cleanup.
Capture lifecycle checks use browser API doubles. Browser sharing permissions
and source-picker behavior must also be checked in a supported browser.

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

## Architecture and audio input

- `src/main.ts` connects browser controls to the application.
- `src/app/VoidpulseApp.ts` owns the Three.js renderer, camera, frame loop,
  post-processing, resize handling, motion preferences, and cleanup.
- `src/visual/Organism.ts`, `Singularity.ts`, and `Cosmos.ts` build the organism,
  black-hole treatment, and surrounding space.
- `src/core/Signal.ts` defines the renderer-independent music-input boundary.
- `src/audio/MusicPlayer.ts` owns the media element, Web Audio graph, file URLs,
  tab capture, and source lifecycle.
- `src/audio/AudioFeatures.ts` measures waveform energy, bass, treble, and onsets.
- `src/audio/MusicControls.ts` connects the accessible controls to playback.
- `src/style.css` places the DOM interface over the canvas.

`MusicPlayer` implements `SignalSource` and connects through `setSignalSource()`.
The analyser measures actual samples before the output gain. Volume changes
therefore do not change visual intensity. Bass and energy deform the bell and
disk. Treble brightens fine filaments. Smoothed onset envelopes add a bounded
surge. The intensity slider scales motion separately from light.
The animation clock integrates changing speed. It does not multiply total
elapsed time by a changing audio value, which would cause phase jumps.
Silence and pause remove the audio signal. No microphone access is requested.

`SignalSource`, `SignalFrame`, and `Readonly` exist only during TypeScript
checking. They are erased from the JavaScript build. The source object's
`sample()` method and the normalization function run in the browser.
Normalization clamps finite inputs to zero through one and replaces invalid
values with zero. The frame loop sends the resulting intensity to scene
updates. Three.js passes runtime uniform values to the GPU, where GLSL shaders
produce the visual response.

The scene caps pixel density and can reduce resolution after sustained slow
frames. It pauses rendering while the document is hidden.

## Included recording

The demo is “Night Owl” by Broke For Free, a released indie-electronic track.
The verified archive recording uses CC BY 3.0. It was converted to MP3 without
editing the music. See [music credits](public/music-credits.html) and
[third-party notices](THIRD_PARTY_NOTICES.md) for artist, source, license, and checksum.
No generated music is included. Playback requires an explicit click.

## Prior art and licenses

The earlier Aurelia adaptation remains in `src/vendor/aurelia/` as unused prior
art. The active renderer does not import it. Its copyright headers and MIT
license remain in [third-party notices](THIRD_PARTY_NOTICES.md).
See [art direction](docs/art-direction.md) for the original Aurelia and VoXelo
references, the *Interstellar* rendering paper, and design-vocabulary provenance.
