# voidpulse jellyfish

An interactive jellyfish that contains a black hole. An original Three.js
WebGL 2 renderer combines a luminous mantle, trailing filaments, a folded
accretion disk, and an artistic gravitational-lensing effect.

The eldritch edition turns the organism into a listening instrument. A dark
event horizon remains inside a recognizable jellyfish bell. Music drives its
vessels, tentacles, accretion, and surrounding dust. The listening station shows
a live 64-band spectrum, waveform, three band meters, and an estimated tempo.

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

- Use `← shin86.dev` in the masthead to return to the cluster. Keep this route visible in the normal interface. Immersive mode retains its existing return control. Use steady jade and bone borders and fills for hover, focus, pressed, and selected states.

- Press **play music** to start the included track, “Come Play with Me” by Kevin MacLeod.
- Press **pause music** to pause it. Press play to resume from the same position.
- Use the song-position slider to seek. Use **volume** to change loudness.
- Use **intensity** from 0% to 300% to control audio-driven deformation.
  High settings increase tentacle contraction, reaching, and disk folding. Glow stays steady.
- Open **audio source** to select a local song or connect another browser tab.
  Local files are played through a blob URL. They are not uploaded.
- Select **encounter** for the full organism view.
- Select **event horizon** to approach the nucleus.
- Drag to orbit. Scroll or pinch to zoom.
- Use the pause button to stop automatic motion. Press it again to resume.
- Select **provoke**, or double-click the canvas, to send a temporary pulse.
- Use the fullscreen button to enter or leave fullscreen where supported.
- Select **oracle** for an elevated view of the bell and accretion disk.
- Open the visual settings to choose **abyss**, **ritual**, or **venom**.
  These palettes change the organism, cosmic atmosphere, and spectrum together.
- Adjust **bloom** to control glow. Choose **auto**, **high**, or **low** detail
  to control render resolution. Auto reduces resolution after sustained slow frames.
- Use **hide interface**, or press **h**, to enter immersive mode. Use the
  return button, **h**, or **escape** to restore the listening station.
- Use **capture** to download a PNG of the rendered artwork.
- Use **repeat** to switch looping on or off. Press **space** to play or pause.
  Press the left or right arrow to seek five seconds. Keyboard shortcuts leave
  focused controls to handle their own keys.

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
npm run test:visual
```

The build checks TypeScript and writes the production bundle to `dist/`.
The preview command serves that bundle locally.
The visual check verifies that canvas resizes occur before drawing and pause
preserves the current pose. It rejects the earlier adaptive-quality blank frame.
With the development server running, open `/render-check.html` and select
**run render check** for actual GPU validation. It reads floating-point scene
and bloom output for 40 repeated poses. The harness is not a production entry.
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
- `src/audio/AudioTelemetry.ts` draws the measured spectrum and waveform and
  updates band and tempo readouts.
- `src/audio/MusicControls.ts` connects the accessible controls to playback.
- `src/style.css` places the DOM interface over the canvas.

`MusicPlayer` implements `SignalSource` and connects through `setSignalSource()`.
The analyser measures actual samples before the output gain. Volume changes
therefore do not change visual intensity. Bass and energy deform the bell and
disk. Smoothed onset envelopes drive contractions and delayed reaches.
The intensity slider scales motion. Material brightness and bloom stay steady.
The animation clock integrates changing speed. It does not multiply total
elapsed time by a changing audio value, which would cause phase jumps.
Silence and pause remove the audio signal. No microphone access is requested.

Mids supply a separate response channel for the mantle. The spectrum uses
logarithmic frequency spacing. Tempo is an estimate from consistent detected
onsets. Its readout stays empty until there is enough evidence. Sparse music,
syncopation, and changing tempo can prevent a stable estimate.

`SignalSource`, `SignalFrame`, and `Readonly` exist only during TypeScript
checking. They are erased from the JavaScript build. The source object's
`sample()` method and the normalization function run in the browser.
Normalization clamps finite inputs to zero through one and replaces invalid
values with zero. The frame loop sends the resulting intensity to scene
updates. Three.js passes runtime uniform values to the GPU, where GLSL shaders
produce the visual response.

The scene caps pixel density and can reduce resolution after sustained slow
frames. It pauses rendering while the document is hidden.

The horror motion uses `ThreatResponse` to turn measured attacks into eased
contractions. Its spring preserves position and velocity when a new beat
arrives. A delayed response drives the reaching tentacles. Bass does not
repeatedly trigger an attack while it remains constant. The motion checks
cover silence, bounded displacement, delayed reach, and frame-rate consistency.
The bell closes more deeply on attacks. The arms recoil, then reach forward
and sweep sideways with a broad traveling bend. The existing intensity control
increases this displacement through the bounded force uniform. Attack timing
and material brightness stay unchanged. These deformation formulas are GLSL
strings in TypeScript. Three.js compiles them for the GPU at runtime; the
TypeScript build cannot check the shader formulas.
Adaptive detail rechecks slow frames throughout the session. High detail
keeps the higher pixel-density cap.

The renderer removes deliberate twinkles and beat-driven light changes.
Broad veins and soft mesh ribbons smooth small details. A fixed five-sample
filter smooths edges after lens distortion. Dark ribbon folds, disk shadows,
and asymmetric reaching provide the horror detail. The lens response trails
the body, so fast musical attacks do not pump the whole scene.

The renderer retains its drawing buffer between presentations. Shader powers
use nonnegative inputs. Squared signed distances use multiplication because
GLSL [`pow` is undefined for negative inputs](https://registry.khronos.org/OpenGL/specs/gl/GLSLangSpec.4.20.pdf).
A finite-color filter runs before
bloom to prevent invalid pixel values from spreading through its blur chain.
The GPU harness checks the actual shaders; TypeScript cannot validate GLSL
strings. The numerical guards execute on the GPU at runtime.

`VisualPreset` and `VisualQuality` are TypeScript unions. They restrict control
values during checking and disappear from the JavaScript output. Browser
events still run at runtime. Those handlers update Three.js shader uniforms.
The GPU uses those numbers and colors to draw each palette and audio response.
`AudioTelemetry` reads the same `SignalFrame` as the scene. Its Canvas 2D calls
draw real measurements without a second audio analyser.

## Included recording

The demo is “Come Play with Me” by Kevin MacLeod. Its eerie voice, woodwind,
low strings, and glockenspiel support the sideshow theme. The artist's
recording uses CC BY 4.0. The official MP3 remains unchanged.
See [music credits](public/music-credits.html) and
[third-party notices](THIRD_PARTY_NOTICES.md) for artist, source, license, and checksum.
No generated music is included. Playback requires an explicit click.

## Prior art and licenses

The earlier Aurelia adaptation remains in `src/vendor/aurelia/` as unused prior
art. The active renderer does not import it. Its copyright headers and MIT
license remain in [third-party notices](THIRD_PARTY_NOTICES.md).
See [art direction](docs/art-direction.md) for the original Aurelia and VoXelo
references, the *Interstellar* rendering paper, and design-vocabulary provenance.
