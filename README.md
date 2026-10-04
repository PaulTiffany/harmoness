# Harmoness

**Deterministic musical witnesses for stochastic generative audio.**

> Generative models can improvise. The ledger decides what survived.

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


## Pages workbench

The public Pages app is the user-facing instrument:

- start from the Cacophony v0 mapping, the published Claude Constitution 2026 priority order, or a blank principle set;
- edit principle names, pitch classes, ordering, and musical roles;
- share a mapping as a URL or export it as JSON;
- compile the map into matched Suno directions;
- generate a witness manifest for the current condition;
- analyze returned audio locally in the browser;
- install the site as a lightweight offline-capable web app.

The browser witness is intentionally a preview. Repository CI remains the canonical v0 witness for committed PCM WAV artifacts.
