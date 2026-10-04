from __future__ import annotations

import math
import wave
from dataclasses import dataclass
from pathlib import Path

import numpy as np

PITCH_CLASS_NAMES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")
PITCH_CLASS_INDEX = {name: i for i, name in enumerate(PITCH_CLASS_NAMES)}


@dataclass(frozen=True)
class AudioData:
    sample_rate: int
    samples: np.ndarray

    @property
    def duration_sec(self) -> float:
        return float(len(self.samples) / self.sample_rate)


def _decode_24bit(raw: bytes) -> np.ndarray:
    b = np.frombuffer(raw, dtype=np.uint8)
    if len(b) % 3:
        raise ValueError("invalid 24-bit PCM byte count")
    b = b.reshape(-1, 3).astype(np.int32)
    values = b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16)
    values = np.where(values & 0x800000, values - 0x1000000, values)
    return values.astype(np.float64) / 8388608.0


def read_pcm_wav(path: str | Path) -> AudioData:
    path = Path(path)
    with wave.open(str(path), "rb") as wf:
        channels = wf.getnchannels()
        sample_rate = wf.getframerate()
        sample_width = wf.getsampwidth()
        frames = wf.readframes(wf.getnframes())

    if sample_width == 1:
        arr = (np.frombuffer(frames, dtype=np.uint8).astype(np.float64) - 128.0) / 128.0
    elif sample_width == 2:
        arr = np.frombuffer(frames, dtype="<i2").astype(np.float64) / 32768.0
    elif sample_width == 3:
        arr = _decode_24bit(frames)
    elif sample_width == 4:
        arr = np.frombuffer(frames, dtype="<i4").astype(np.float64) / 2147483648.0
    else:
        raise ValueError(f"unsupported PCM sample width: {sample_width} bytes")

    if channels < 1:
        raise ValueError("WAV has no channels")
    if len(arr) % channels:
        raise ValueError("sample count is not divisible by channel count")

    arr = arr.reshape(-1, channels).mean(axis=1)
    return AudioData(sample_rate=sample_rate, samples=arr)


def silence_fraction(audio: AudioData, frame_sec: float = 0.050, rms_threshold: float = 0.002) -> float:
    frame = max(1, int(audio.sample_rate * frame_sec))
    if len(audio.samples) == 0:
        return 1.0
    values = []
    for start in range(0, len(audio.samples), frame):
        chunk = audio.samples[start : start + frame]
        if len(chunk):
            values.append(float(np.sqrt(np.mean(chunk * chunk))))
    return float(np.mean(np.asarray(values) < rms_threshold)) if values else 1.0


def pitch_class_energy(
    audio: AudioData,
    start_frac: float,
    end_frac: float,
    fft_size: int = 4096,
    hop: int = 2048,
    min_hz: float = 55.0,
    max_hz: float = 4186.0,
) -> np.ndarray:
    if not (0.0 <= start_frac < end_frac <= 1.0):
        raise ValueError("section fractions must satisfy 0 <= start < end <= 1")

    start = int(len(audio.samples) * start_frac)
    end = int(len(audio.samples) * end_frac)
    segment = audio.samples[start:end]
    if len(segment) == 0:
        return np.zeros(12, dtype=np.float64)

    if len(segment) < fft_size:
        segment = np.pad(segment, (0, fft_size - len(segment)))

    window = np.hanning(fft_size)
    freqs = np.fft.rfftfreq(fft_size, d=1.0 / audio.sample_rate)
    use = (freqs >= min_hz) & (freqs <= max_hz)
    usable_freqs = freqs[use]

    midi = np.rint(69.0 + 12.0 * np.log2(usable_freqs / 440.0)).astype(int)
    pcs = np.mod(midi, 12)

    energy = np.zeros(12, dtype=np.float64)
    last_start = max(0, len(segment) - fft_size)
    starts = range(0, last_start + 1, hop)
    any_frame = False
    for frame_start in starts:
        frame = segment[frame_start : frame_start + fft_size]
        if len(frame) < fft_size:
            frame = np.pad(frame, (0, fft_size - len(frame)))
        spectrum = np.fft.rfft(frame * window)
        power = (np.abs(spectrum) ** 2)[use]
        for pc in range(12):
            energy[pc] += float(power[pcs == pc].sum())
        any_frame = True

    if not any_frame:
        return energy
    total = float(energy.sum())
    return energy / total if total > 0.0 else energy


def named_pitch_class_energy(energy: np.ndarray) -> dict[str, float]:
    return {name: float(energy[i]) for i, name in enumerate(PITCH_CLASS_NAMES)}


def target_fraction(energy: np.ndarray, pitch_classes: list[str]) -> float:
    indices = []
    for name in pitch_classes:
        if name not in PITCH_CLASS_INDEX:
            raise ValueError(f"unknown pitch class: {name}")
        indices.append(PITCH_CLASS_INDEX[name])
    return float(energy[indices].sum())


def dominant_pitch_classes(energy: np.ndarray, n: int = 4) -> list[str]:
    order = np.argsort(energy)[::-1][:n]
    return [PITCH_CLASS_NAMES[int(i)] for i in order]
