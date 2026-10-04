from __future__ import annotations

import json
import tempfile
import unittest
import wave
from pathlib import Path

import numpy as np

from harmoness.verify import verify_manifest


NOTE_HZ = {"C": 261.625565, "G": 391.995436, "D": 293.664768, "A": 440.0}


def write_wav(path: Path, notes: list[str], sample_rate: int = 16000, seconds_each: float = 1.0) -> None:
    chunks = []
    n = int(sample_rate * seconds_each)
    t = np.arange(n, dtype=np.float64) / sample_rate
    for note in notes:
        x = 0.5 * np.sin(2.0 * np.pi * NOTE_HZ[note] * t)
        chunks.append(x)
    samples = np.concatenate(chunks)
    pcm = np.clip(samples * 32767.0, -32768, 32767).astype("<i2")
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm.tobytes())


def make_manifest(audio_name: str, expected: list[str]) -> dict:
    sections = []
    size = len(expected)
    for i, note in enumerate(expected):
        sections.append(
            {
                "label": f"section-{i}",
                "start_frac": i / size,
                "end_frac": (i + 1) / size,
                "expected_pitch_classes": [note],
                "min_target_fraction": 0.45,
            }
        )
    return {
        "schema_version": "harmoness-generation/v0",
        "provenance": {
            "provider": "synthetic-test",
            "generation_id": "fixture-001",
            "prompt": "known four-tone fixture",
        },
        "audio": {"path": audio_name},
        "checks": {
            "duration_sec": {"min": 3.9, "max": 4.1},
            "silence_fraction": {"max": 0.05},
            "sections": sections,
        },
    }


class HarnessTests(unittest.TestCase):
    def test_known_constitution_sequence_passes(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            wav = root / "audio.wav"
            write_wav(wav, ["C", "G", "D", "A"])
            manifest = root / "manifest.json"
            manifest.write_text(
                json.dumps(make_manifest("audio.wav", ["C", "G", "D", "A"])),
                encoding="utf-8",
            )
            receipt = verify_manifest(manifest)
            self.assertEqual(receipt["verdict"], "PASS")

    def test_mutated_expectation_fails(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            wav = root / "audio.wav"
            write_wav(wav, ["C", "G", "D", "A"])
            manifest = root / "manifest.json"
            manifest.write_text(
                json.dumps(make_manifest("audio.wav", ["C", "G", "D", "C"])),
                encoding="utf-8",
            )
            receipt = verify_manifest(manifest)
            self.assertEqual(receipt["verdict"], "FAIL")
            failed = [c for c in receipt["checks"] if not c["pass"]]
            self.assertTrue(any("section-3" in c["name"] for c in failed))


if __name__ == "__main__":
    unittest.main()
