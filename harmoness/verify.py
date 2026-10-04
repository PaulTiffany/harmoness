from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from .analyze import (
    dominant_pitch_classes,
    named_pitch_class_energy,
    pitch_class_energy,
    read_pcm_wav,
    silence_fraction,
    target_fraction,
)

REQUIRED_PROVENANCE = ("provider", "generation_id", "prompt")


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def _check(ok: bool, name: str, observed: Any, expected: Any) -> dict[str, Any]:
    return {
        "name": name,
        "pass": bool(ok),
        "observed": observed,
        "expected": expected,
    }


def verify_manifest(path: str | Path) -> dict[str, Any]:
    manifest_path = Path(path).resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    checks: list[dict[str, Any]] = []
    provenance = manifest.get("provenance", {})
    for field in REQUIRED_PROVENANCE:
        value = provenance.get(field)
        checks.append(_check(bool(value), f"provenance.{field}", bool(value), "non-empty"))

    audio_rel = manifest.get("audio", {}).get("path")
    if not audio_rel:
        checks.append(_check(False, "audio.path", None, "relative WAV path"))
        return _receipt(manifest_path, None, checks, {})

    audio_path = (manifest_path.parent / audio_rel).resolve()
    checks.append(_check(audio_path.exists(), "audio.exists", audio_path.name, True))
    if not audio_path.exists():
        return _receipt(manifest_path, audio_path, checks, {})

    try:
        audio = read_pcm_wav(audio_path)
    except Exception as exc:
        checks.append(_check(False, "audio.readable_pcm_wav", str(exc), True))
        return _receipt(manifest_path, audio_path, checks, {})

    checks.append(_check(True, "audio.readable_pcm_wav", True, True))

    duration = audio.duration_sec
    silence = silence_fraction(audio)
    observed: dict[str, Any] = {
        "duration_sec": round(duration, 6),
        "silence_fraction": round(silence, 6),
        "sample_rate": audio.sample_rate,
        "sha256": _sha256(audio_path),
        "sections": [],
    }

    duration_rule = manifest.get("checks", {}).get("duration_sec")
    if duration_rule:
        minimum = float(duration_rule.get("min", 0.0))
        maximum = float(duration_rule.get("max", float("inf")))
        checks.append(
            _check(
                minimum <= duration <= maximum,
                "duration_sec",
                round(duration, 6),
                {"min": minimum, "max": maximum},
            )
        )

    silence_rule = manifest.get("checks", {}).get("silence_fraction")
    if silence_rule:
        maximum = float(silence_rule["max"])
        checks.append(
            _check(
                silence <= maximum,
                "silence_fraction",
                round(silence, 6),
                {"max": maximum},
            )
        )

    for section in manifest.get("checks", {}).get("sections", []):
        label = str(section["label"])
        start_frac = float(section["start_frac"])
        end_frac = float(section["end_frac"])
        expected_pcs = list(section["expected_pitch_classes"])
        minimum = float(section.get("min_target_fraction", 0.10))

        energy = pitch_class_energy(audio, start_frac, end_frac)
        fraction = target_fraction(energy, expected_pcs)
        section_observed = {
            "label": label,
            "start_frac": start_frac,
            "end_frac": end_frac,
            "target_fraction": round(fraction, 6),
            "dominant_pitch_classes": dominant_pitch_classes(energy),
            "pitch_class_energy": {
                k: round(v, 6) for k, v in named_pitch_class_energy(energy).items()
            },
        }
        observed["sections"].append(section_observed)
        checks.append(
            _check(
                fraction >= minimum,
                f"section.{label}.pitch_class_presence",
                round(fraction, 6),
                {"pitch_classes": expected_pcs, "min_target_fraction": minimum},
            )
        )

    return _receipt(manifest_path, audio_path, checks, observed)


def _receipt(
    manifest_path: Path,
    audio_path: Path | None,
    checks: list[dict[str, Any]],
    observed: dict[str, Any],
) -> dict[str, Any]:
    passed = all(item["pass"] for item in checks)
    return {
        "schema_version": "harmoness-receipt/v0",
        "verdict": "PASS" if passed else "FAIL",
        "manifest": str(manifest_path),
        "audio": str(audio_path) if audio_path else None,
        "checks": checks,
        "observed": observed,
    }
