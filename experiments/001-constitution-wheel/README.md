# Experiment 001 — Constitution Wheel: simultaneous vs. staged

## Question

Can a stochastic music generator render the same constitutional material under two different temporal organizations while preserving a deterministic musical witness contract?

This experiment is about **rendering and perceptual organization**, not about using music to prove the underlying alignment geometry.

## Fixed identity

The source identity is `specs/constitution-wheel-v0.json`:

- Helpful → C
- Harmless → G
- Honest → D
- Autonomy → A

The four principle identities are held fixed across conditions.

## Conditions

### A — simultaneous

Expose all four constitutional identities in the same formal region. Arrangement may be dense, but the generation prompt should request preservation of all four identities concurrently.

### B — staged

Expose the same four identities in the order C → G → D → A. Later sections should preserve or recall earlier material rather than merely replacing it.

### C — order mutant

Use the same four identities but scramble their staged order. This controls for “any sequential four-part song sounds organized.”

### D — mapping mutant

Keep the formal structure but permute principle↔pitch-class assignments. This tests whether results depend on the declared mapping rather than generic tonal motion.

## Population rule

Do not select generations by ear before witness evaluation.

For an initial pilot:

- target 8 raw generations per condition;
- use the same provider/model tier;
- keep generation prompt length and requested duration comparable;
- record every generation ID and exact prompt;
- retain failed witness receipts in the experiment ledger;
- do not replace failed renders silently.

A generation rejected by the harness is data about renderer adherence. It is not erased from the denominator.

## Machine witness endpoints

Primary v0 endpoint:

1. percentage of generated artifacts passing the declared render contract.

Recorded per artifact:

- WAV SHA-256;
- duration;
- silence fraction;
- pitch-class energy by declared region;
- target pitch-class fraction;
- PASS/FAIL with individual check results.

These observables certify that an artifact is eligible for later comparison. They do **not** score musical quality.

## Human layer

Only CI-certified artifacts enter listener evaluation.

A later blinded study can compare matched A/B pairs on questions such as:

- Which version feels more coherent?
- Which better preserves multiple recognizable musical ideas?
- Which feels more resolved?
- Which would you rather hear again?

The human layer is deliberately separate from the mechanical witness layer.

## First compositional target

The first song can use the form already suggested by the Cacophony staging intuition:

1. establish C / Helpful;
2. introduce G / Harmless;
3. introduce D / Honest as a beautiful tension rather than “bad sound”;
4. introduce A / Autonomy;
5. first large section: simultaneous exposure;
6. bridge: staged re-entry, one identity at a time;
7. final large section: preserve the same information with temporal organization.

The interesting claim is not that simultaneity must sound ugly. The experiment asks whether **the organization of the same declared material through time produces stable, detectable structural differences**.

## Artifact layout

Each raw generation gets its own immutable directory:

```
generations/<generation-id>/
├── audio.wav
├── manifest.json
└── receipt.json        # optional checked-in receipt; CI recomputes independently
```

The manifest declares the condition and witness windows. CI recomputes the verdict from the audio.

## Mutation discipline

Once the baseline harness is stable, add explicit mutation tests:

- swap C and D targets;
- collapse staged windows into one simultaneous window;
- delete one principle target;
- reorder the four staged targets;
- loosen a threshold until an intentionally wrong fixture passes.

A useful harness should kill those mutants. If it cannot, the witness is not discriminating enough.
