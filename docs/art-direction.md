# Art direction

## Intent

The subject is one jellyfish whose body contains a black hole.
The black nucleus gives the organism a stable identity.
The luminous mantle, folded accretion disk, and trailing filaments share that center.
Dark space preserves scale and makes the bright structures legible.
Warm ivory and copper define accretion. Violet and blue define the outer organism.
Slow motion establishes life. Local flares provide stronger contrast.

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
| `2026-08-26-locality-buys-amplitude.md` | Concentrate brightness at the disk and filament events. | Leave most space quiet. |
| `2026-08-26-ordered-pigment-drift.md` | Keep color transitions within deliberate material palettes. | Avoid continuous rainbow cycling. |
| `2026-08-26-pigment-carrier-localized-deposit.md` | Tie stronger responses to bounded events. | Effects must decay. |
| `2026-08-28-ripple-backed-lyric-reader.md` | Separate readable DOM text from expressive WebGL. | Keep overlays compact. |

These are project adaptations. They do not establish new library rules.
The palette, filament density, and glow can change during visual review.
The single-organism silhouette and readable negative space must remain.

## Future audio boundary

[`Signal.ts`](../src/core/Signal.ts) separates future signal input from rendering.
`SignalSource` supplies energy, bass, treble, and onset values through `SignalFrame`.
The interfaces and `Readonly` exist only during TypeScript checking.
The silent source and normalization function become runtime JavaScript.
Normalization constrains inputs to finite values between zero and one.

A later Web Audio adapter can implement the source without owning scene geometry.
The renderer can map those values to membrane motion, filaments, and local flares.
The silent source preserves a complete visual composition without music.
This boundary does not request microphone access or provide music playback.
