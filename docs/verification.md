# Eldritch edition verification

Verified locally on 2026-09-04. Work is tracked in GitHub issue #3.

The subsequent shader and motion repair was deployed as version
`29c4cd7d-663f-4551-be91-acebb4465a07`. Both confirmed domains serve
`index-DP4ukKii.js` with HTTP 200. The live page was reloaded after verification.

The preceding release followed the user's confirmation of both domains. Version:
`90fa923c-8563-40fe-b9fb-f4fb52210aa9`.
Both `jellyfish.shin86.dev` and `jellyfish.mhaider.dev` return HTTP 200 for
the page, the verified `index-Bf6UgMzP.js` bundle, and the new demo MP3.
Both pages reference that bundle and show the new track title. The live MP3
SHA-256 matches the official source asset on both domains:
`e0e272f2e5c2bf606575e623de605f905363cfc7c1f39bd7a28fac868babb5ab`.

- `npm run build` passes TypeScript checking and production bundling.
- `npm run test:audio` passes. It covers band separation, signed waveform,
  spectrum, regular and irregular tempo, silence, seek, repeat, source races,
  playback recovery, and capture cleanup.
- Browser review covers 1280 × 720 desktop and 390 × 844 phone layouts.
  The default view preserves the bell, hanging tentacles, and central void.
- The production browser tab renders without console or shader errors.
- Bundled playback and local MP3 selection both start and expose a duration.
  Seek, volume, repeat, camera selection, palette, bloom, and quality controls
  respond to input. Meters and spectrum respond to music.
- Immersive mode removes other controls from the accessibility tree.
  Escape restores the station while the return button has focus.
- PNG capture produced a valid image in Downloads. The image was inspected.

The later sideshow pass was also reviewed on desktop and phone. Its new font
and copy fit the controls and artwork. The production page has no shader
errors during playback. Motion checks now cover eased onset, bounded frame
changes, delayed reach, and consistent spring timing at 30 and 120 Hz.

The later flicker revision passes the production build and audio/motion checks.
Source inspection confirms steady bloom, fixed organism illumination, and
removal of particle twinkles and animated grain. Broad vein patterns use
derivative antialiasing. A fixed edge filter runs after lens distortion.
The new demo, Kevin MacLeod's “Come Play with Me”, passes full audio decoding.
The official MP3 duration is 131.605 seconds. Source and license are recorded
in the music credits. Browser access recovered. The rebuilt preview plays the
2:11 demo and responds to seeking, 300% intensity, provoke, and detail changes.
The inspected desktop frames preserve the dome, void, and extended ribbons.
The browser reports no shader or console errors during these checks.

A later source review found that adaptive detail cleared the canvas after
rendering. Resize now queues until the start of the next frame. The
`test:visual` regression exercises actual frame methods and confirms that the
old immediate-resize behavior fails the visible-pixels invariant.
Pause now preserves the current pose instead of resetting its contraction.
These checks do not constitute a frame-by-frame photosensitivity assessment.

The user later reported whole-scene blanks. A second review found undefined
GLSL powers on signed Gaussian distances and potentially negative Fresnel
bases. Signed squares now use multiplication. Normal lengths and power inputs
are bounded. A finite-color pass prevents invalid pixels from entering bloom.
The opaque renderer retains its drawing buffer between presentations.
This is a plausible mechanism for the reported failure, not a reproduced
failure on the user's specific graphics hardware.

The actual GPU harness passed 40 camera/input poses and 160 floating-point
readbacks, including repeated inputs, raw scene pixels, and bloom/output
pixels. It reported zero non-finite values, blank frames, unstable repeats,
or shader/GL errors. The app lens pass is outside that harness. The complete
page was also reviewed during playback. Twelve uncropped presentation
captures retained the visible artwork. Cropped browser captures were
inconsistent and were not used as evidence of application stability.

The organism now uses one membrane and 64 soft mesh filaments. Its sweep,
reach, contraction, and treble articulation have larger displacement.
It uses 33,785 vertices across 14 meshes, with no native line or point batches.

Live browser-tab sharing permissions were not exercised. Capture lifecycle
and recovery paths use browser API doubles in the audio checks. A real share
still depends on the browser picker and its audio-sharing option.

Vite reports a large-chunk advisory for the Three.js bundle. The production
JavaScript is approximately 146 kB after gzip. This advisory does not fail the
build. Quality controls change render resolution; they do not remove geometry.
