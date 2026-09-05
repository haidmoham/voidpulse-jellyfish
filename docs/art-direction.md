# Art direction

## Intent

The subject is one jellyfish whose body contains a black hole.
The black nucleus gives the organism a stable identity.
The luminous mantle, folded accretion disk, and trailing filaments share that center.
Dark space preserves scale and makes the bright structures legible.
Spectral jade and arterial crimson define the default organism. Bone light
defines the hot accretion edge. The ritual and venom palettes change material
colors without changing the subject. Slow motion establishes life. Dark
folds and steady luminous edges provide stronger contrast.

The eldritch edition keeps the dome, hanging tentacles, and central void as
three required visual forms. Veins, hooked filaments, orbital marks, and
cosmic clouds increase unease around those forms. They must not obscure them.
The interface uses readable DOM text around the scene. A bottom listening
console gives playback a stable place. Visual settings remain collapsible.

The copy now uses the voice of a sinister sideshow. Short fragments invite
the viewer to stare, then imply that the creature is watching back. IM Fell
English gives the main words the texture of old printed type. Functional
audio labels and permission instructions stay explicit. This adapts the
library's readable-text boundary; it does not copy a library writing style.

Motion can violate physics to create dread. Measured attacks draw the mantle
inward and fold the accretion disk. A delayed response lets selected tentacles
reach toward the camera. A critically damped spring preserves velocity across
beats. Smooth spatial curves replace abrupt recoil stages. No independent
beat timer drives these reactions. The dome and dark nucleus remain legible.

The later comfort pass removes deliberate flashing and twinkling. Music
drives displacement. It does not change bloom or material brightness.
Broad veins replace fine moving patterns. Antialiasing smooths their edges.
Dark oral ribbons, asymmetric reaches, slow accretion shadows, and an
iris-like rim increase menace. The lens distortion follows a slower envelope.
All shading patterns remain fixed to their surfaces. Adaptive detail must
resize and render in the same frame. Pause must preserve the current pose.
These choices address the reported flicker. They do not certify photosensitivity safety.

## Provenance and adaptation

- The existing VoidPulse Jellyfish scene supplies the biological prior art.
  Its Aurelia adaptation remains in `src/vendor/aurelia/`.
  Keep its copyright headers and [complete MIT notice](../THIRD_PARTY_NOTICES.md).
- The earlier treatment cites [VoXelo's black-hole study](https://codepen.io/VoXelo/full/wBKvJxd).
  It supplies directional inspiration for the central void and flowing disk.
- *Interstellar* supplies the folded disk and gravitational-lensing reference.
  [DNEG's paper](https://authors.library.caltech.edu/records/njdcq-95891)
  explains the rendering and its cinematic choices.
  This artwork uses an artistic lensing approximation.
  It is not a scientific simulation of relativistic light paths.

The private design-vocabulary library was consulted at revision `c7fd1c6`.
Its `LEGO.md` defines a Lego as a reusable design unit, not a visual style.
No earned component matched this scene. These candidate ideas guided local work:

| Source note | Job in this scene | Boundary |
| --- | --- | --- |
| `2026-08-26-stable-core-living-aura.md` | Keep the nucleus definite while its atmosphere moves. | Glow must preserve the dark silhouette. |
| `2026-08-26-locality-buys-amplitude.md` | Concentrate movement in the disk and reaching filaments. | Keep illumination steady. |
| `2026-08-26-ordered-pigment-drift.md` | Keep color transitions within deliberate material palettes. | Avoid continuous rainbow cycling. |
| `2026-08-26-pigment-carrier-localized-deposit.md` | Tie stronger responses to bounded events. | Effects must decay. |
| `2026-08-28-ripple-backed-lyric-reader.md` | Separate readable DOM text from expressive WebGL. | Keep overlays compact. |

These are project adaptations. They do not establish new library rules.
The palette, filament density, and glow can change during visual review.
The single-organism silhouette and readable negative space must remain.

The September eldritch pass rechecked the library at `c7fd1c6`. It adapts
the stable-core idea to the event horizon and the local-response idea to
measured audio events. The renderer and interface remain original project
code. No external source code or private library content is copied into them.
The allowed adaptation points are palette, filament detail, atmosphere,
camera placement, and glow. The dark nucleus and biological silhouette are
invariants. Browser review checks those forms with and without playback.

## Audio boundary

[`Signal.ts`](../src/core/Signal.ts) separates measured audio from rendering.
`SignalSource` supplies energy, bass, treble, and onset values through `SignalFrame`.
The interfaces and `Readonly` exist only during TypeScript checking.
The silent source and normalization function become runtime JavaScript.
Normalization constrains inputs to finite values between zero and one.

`MusicPlayer` now implements the source through a Web Audio analyser.
The renderer maps energy and bass to deformation, treble to filaments, and
onsets to smooth surges. Intensity can reach 300% for stronger mechanical motion.
Light stays bounded. Angular phase remains continuous as musical energy changes.
The silent source preserves a complete visual composition without music.
The demo uses Kevin MacLeod's “Come Play with Me” with visible CC BY 4.0 attribution.
Local songs and optional browser-tab audio share the same analysis path.
The app does not request microphone access or upload captured media.
