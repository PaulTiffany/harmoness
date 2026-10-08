# Harmoness — Your harmony harness

**Wrangle your takes. Find your sound.**

[Open Harmoness](https://paultiffany.github.io/harmoness/) · [Composition studio](https://paultiffany.github.io/harmoness/experiment.html)

Harmoness is a free, local-first listening room for generated music and any other audio takes. Harmony + harness, with a little portamento in the portmanteau. An original illustrated cowgirl gives the product its attitude; your ears make the decisions.

## Start listening

1. Try the original synthetic demo, or bring up to six audio takes.
2. Compare with optional RMS level matching, same-time switching, passage loops, and anonymous shuffled labels.
3. Jump to listening flags, mark keepers, and write notes or record generation prompts.
4. Name and save a session on this device. Export JSON or CSV evidence for your records.
5. Open Compose to build a note/principle map and generation direction. Send the frozen brief back to the listening room and inspect pitch-class energy in declared regions.

Opening Compose saves the current listening session and restores it on return. Draft maps and edited prompts are kept locally. Composition links share the map only. The compact prompt button produces at most 900 characters; this is a product option, not a claim about a provider’s current limits.

## What ships

- Responsive listening room, waveform player, keyboard controls, bounded passage loops, and filtering by flag type.
- Average-level matching with attenuation only and sample-peak headroom; this is approximate RMS matching, not LUFS.
- Checks for quiet passages, near-full-scale samples, large level changes, and possible abrupt endings. Every finding links to audio; none is an aesthetic verdict.
- On-device IndexedDB sessions containing audio, notes, prompts, favorites, and the composition brief; separate JSON/CSV exports omit audio.
- Three locally synthesized demo takes: original, louder twin, and deliberately rough edit.
- Composition studio with editable identities, roles, presets, fifths path playback, map sharing, compact directions, witness manifests, and a listening-room handoff.
- Pitch-class preview using independently measured channels and immutable brief snapshots. The older composition-page preview remains available and invalidates stale receipts when the map changes.
- Background workers for listening-room measurements; offline app assets; no account, tracking, generation-service dependency, or audio upload.

## Limits and privacy

Up to six files, 40 MB and six minutes each, mono/stereo, supported by the browser decoder. Decoded session audio is capped at 256 MiB. Saved sessions belong to this browser; clearing site data deletes them. They do not sync and are not a backup. Keep original files. JSON/CSV reports include your notes and prompts; hidden-name mode omits filenames but cannot redact identifying text you write yourself.

Browser decoding and RMS matching are approximations. Pitch-class energy does not establish key, motif preservation, artistic success, or moral alignment. Equal time regions approximate the musical form; the resolution brief’s richer instructions are not fully verified. Canonical v0 witnesses still come from the Python verifier against committed PCM WAV artifacts.

## Development and validation

Serve `site/` using any static HTTP server. No build step or remote API is needed.

```bash
python -m http.server 8000 --directory site
python -m unittest discover -s tests -v
node --test tests/audio-checks.test.cjs tests/pitch-checks.test.cjs
```

`tests/browser.cjs` uses Playwright and serves its own fixtures. Set `CHROMIUM_PATH` for an existing Chromium binary, or install Playwright’s browser. Set `QA_SCREENSHOTS` to save product screenshots. CI exercises playback, import/export, save/restore, the Compose round trip, pitch checks, loops, shuffling, the demo, and mobile overflow. See `BRAND.md` for mascot provenance and visual guidance.

---

## Research foundation

Harmoness turns the sonification thread from [The Cost of Cacophony](https://github.com/PaulTiffany/cost) into an executable music experiment. The initial constitution mapping is the paper's Circle-of-Fifths construction:

| Principle | Note | Fifth position |
| --- | --- | ---: |
| Helpful | C | 0 |
| Harmless | G | 1 |
| Honest | D | 2 |
| Autonomy | A | 3 |

The research move is deliberately simple:

```
constraint / composition spec
          ↓
stochastic music generation (e.g. Suno)
          ↓
deterministic audio measurements
          ↓
PASS / FAIL witness receipt
```

Suno is a renderer, not the judge.

## v0 witness boundary

The first harness does **not** claim to measure whether a song is good, beautiful, aligned, or whether a theorem is true. It checks rendering invariants that can be made explicit before listening:

- provenance fields are present;
- the artifact is a readable PCM WAV;
- duration falls inside declared bounds;
- excessive silence is rejected;
- declared song regions contain the expected pitch-class energy;
- every check emits a machine-readable receipt;
- the same artifact + manifest produces the same verdict.

That gives us a clean substrate for later experiments on simultaneous vs. staged composition, motif preservation, mutation testing, blinded listener preference, and richer MIR measurements.

## Quick start

Requires Python 3.10+.

```bash
python -m pip install -e .
python -m harmoness verify path/to/manifest.json
```

A generation bundle looks like:

```
generations/<generation-id>/
├── audio.wav
└── manifest.json
```

See `examples/manifest.example.json` for the manifest contract.

The verifier prints JSON and exits non-zero on failure, so the exact same command works locally and in CI.

## Repository CI

GitHub Actions runs three layers on every push and pull request:

1. unit tests against synthetic, known-frequency audio;
2. JSON/spec validation;
3. verification of every committed `generations/**/manifest.json`.

A future Suno render becomes a witness simply by adding its WAV and manifest. If the render mutates away from the declared invariants, CI goes red.

## Constitution Wheel v0

The canonical machine-readable mapping lives at `specs/constitution-wheel-v0.json`. Note names are the scientific identities; instrumentation, timbre, arrangement, lyrics, and performance remain free unless an experiment explicitly constrains them.

That separation is intentional: **deterministic composition constraints, stochastic phenotype, deterministic acceptance.**

## Near-term experiments

The first real population experiment should generate matched conditions from one composition specification:

- **simultaneous**: constitutional material exposed together;
- **staged**: the same material distributed through time with preservation;
- **mutants**: order scrambled, preservation removed, principle-note mapping swapped, or staging collapsed.

CI should certify rendering adherence before any human-preference data are admitted. Listener judgments then answer a different question: whether the certified structures are perceptually or musically distinguishable.

## Status

This is the first executable scaffold. No Suno API or private service dependency is required: generated audio can be produced anywhere and admitted only through the public witness contract.
