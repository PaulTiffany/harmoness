const mapping = [
  { principle: "Helpful", note: "C", frequency: 261.6256 },
  { principle: "Harmless", note: "G", frequency: 391.9954 },
  { principle: "Honest", note: "D", frequency: 293.6648 },
  { principle: "Autonomy", note: "A", frequency: 440.0 }
];

let audioContext;
let lastReceipt = null;

function ctx() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

function tone(frequency, duration = 0.42, startDelay = 0) {
  const c = ctx();
  const start = c.currentTime + startDelay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.18, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

document.querySelectorAll(".principle").forEach((button) => {
  button.addEventListener("click", () => tone(Number(button.dataset.frequency), 0.55));
});

document.getElementById("play-sequence").addEventListener("click", () => {
  mapping.forEach((item, i) => tone(item.frequency, 0.48, i * 0.38));
});

const moodText = {
  artpop: "emotionally serious art-pop, intimate close vocal, piano and warm analog synths, sophisticated pop harmony, deep low end, pristine modern mix",
  ambient: "deep environmental ambient music, organic field-like textures, evolving harmonic drones, restrained pulse, naturalistic spatial depth, no bombast",
  synthpop: "cinematic synth-pop, strong melodic hook, luminous analog pads, detailed electronic percussion, wide but controlled mix, emotionally sincere",
  vocal: "modern a cappella and vocal counterpoint, close human voices, layered bass and inner parts, precise tuning, expressive lead, minimal non-vocal percussion"
};

const conditionText = {
  resolution: "Form: establish C/Helpful clearly, add G/Harmless, introduce D/Honest as beautiful major-second tension, then A/Autonomy. First large chorus exposes all four identities concurrently and becomes dense without becoming random. Bridge strips back and reintroduces C → G → D → A one at a time. Final chorus preserves the same four identities but distributes them through call-and-response and counterpoint so it feels larger yet clearer. End with a strong G → C sense of return.",
  staged: "Form: four linked stages in the exact order C/Helpful → G/Harmless → D/Honest → A/Autonomy. Each new stage should preserve or recall a motif from earlier stages rather than replacing it. The final section integrates all four identities through temporal counterpoint, not a single undifferentiated block.",
  simultaneous: "Form: after a short introduction, expose C/Helpful, G/Harmless, D/Honest and A/Autonomy together in the same large section. Preserve all four identities concurrently using layered motifs and chordal density. Do not resolve by simply deleting one identity.",
  "order-mutant": "CONTROL CONDITION. Use the same four tonal identities but stage them in the mutated order A/Autonomy → D/Honest → G/Harmless → C/Helpful. Preserve earlier motifs as later identities enter. Treat this as musically sincere, not comedic."
};

function buildPrompt() {
  const condition = document.getElementById("condition").value;
  const mood = document.getElementById("mood").value;
  const seconds = document.getElementById("duration").value;
  const text = [
    `Target ~${Math.round(Number(seconds) / 60 * 10) / 10} minutes. ${moodText[mood]}.`,
    "Constitutional tonal identities: Helpful=C, Harmless=G, Honest=D, Autonomy=A. Treat these as recurring musical identities, not literal spoken labels.",
    conditionText[condition],
    "Major-second tensions should feel yearning and musically intentional, not like an error. Preserve strong melody, sectional contrast, memorable recurrence, and professional production. No spoken technical exposition. The computation should shape the form underneath a real song."
  ].join(" ");
  const out = document.getElementById("prompt-output");
  out.value = text;
  document.getElementById("prompt-count").textContent = `${text.length} characters`;
}

document.getElementById("generate-prompt").addEventListener("click", buildPrompt);
document.getElementById("condition").addEventListener("change", buildPrompt);
document.getElementById("mood").addEventListener("change", buildPrompt);
document.getElementById("duration").addEventListener("change", buildPrompt);
document.getElementById("copy-prompt").addEventListener("click", async () => {
  const out = document.getElementById("prompt-output");
  await navigator.clipboard.writeText(out.value);
  const b = document.getElementById("copy-prompt");
  b.textContent = "Copied";
  setTimeout(() => b.textContent = "Copy", 1200);
});
buildPrompt();

function goertzel(samples, sampleRate, frequency, start, length) {
  const omega = 2 * Math.PI * frequency / sampleRate;
  const coeff = 2 * Math.cos(omega);
  let s0 = 0, s1 = 0, s2 = 0;
  const end = Math.min(samples.length, start + length);
  for (let i = start; i < end; i++) {
    s0 = samples[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return Math.max(0, s1 * s1 + s2 * s2 - coeff * s1 * s2);
}

function pitchClassEnergy(samples, sampleRate, startFrac, endFrac) {
  const start = Math.floor(samples.length * startFrac);
  const end = Math.floor(samples.length * endFrac);
  const regionLength = Math.max(1, end - start);
  const frameLength = Math.min(4096, regionLength);
  const frameCount = Math.min(20, Math.max(4, Math.floor(regionLength / frameLength)));
  const energies = new Array(12).fill(0);

  const frequencies = [];
  for (let midi = 36; midi <= 96; midi++) {
    frequencies.push({ pc: midi % 12, hz: 440 * Math.pow(2, (midi - 69) / 12) });
  }

  for (let f = 0; f < frameCount; f++) {
    const pos = frameCount === 1 ? start : start + Math.floor((regionLength - frameLength) * f / (frameCount - 1));
    for (const item of frequencies) {
      energies[item.pc] += goertzel(samples, sampleRate, item.hz, pos, frameLength);
    }
  }
  const total = energies.reduce((a, b) => a + b, 0) || 1;
  return energies.map(v => v / total);
}

function silenceFraction(samples, sampleRate) {
  const frame = Math.max(1, Math.floor(sampleRate * 0.05));
  let silent = 0, total = 0;
  for (let i = 0; i < samples.length; i += frame) {
    let sum = 0;
    const end = Math.min(samples.length, i + frame);
    for (let j = i; j < end; j++) sum += samples[j] * samples[j];
    const rms = Math.sqrt(sum / Math.max(1, end - i));
    if (rms < 0.002) silent++;
    total++;
  }
  return total ? silent / total : 1;
}

function mono(buffer) {
  const out = new Float32Array(buffer.length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < out.length; i++) out[i] += data[i] / buffer.numberOfChannels;
  }
  return out;
}

async function analyzeFile(file) {
  const panel = document.getElementById("analysis");
  panel.classList.remove("hidden");
  document.getElementById("verdict-title").textContent = "Analyzing…";
  document.getElementById("verdict-chip").className = "verdict pending";
  document.getElementById("verdict-chip").textContent = "…";
  document.getElementById("file-meta").textContent = file.name;

  const bytes = await file.arrayBuffer();
  const buffer = await ctx().decodeAudioData(bytes.slice(0));
  const samples = mono(buffer);
  const duration = buffer.duration;
  const silence = silenceFraction(samples, buffer.sampleRate);

  const sectionData = mapping.map((item, i) => {
    const energy = pitchClassEnergy(samples, buffer.sampleRate, i / 4, (i + 1) / 4);
    const pitchClassIndex = { C:0, "C#":1, D:2, "D#":3, E:4, F:5, "F#":6, G:7, "G#":8, A:9, "A#":10, B:11 };
    const fraction = energy[pitchClassIndex[item.note]];
    return {
      principle: item.principle,
      note: item.note,
      start_frac: i / 4,
      end_frac: (i + 1) / 4,
      target_fraction: fraction,
      pass: fraction >= 0.08
    };
  });

  const durationPass = duration >= 30 && duration <= 360;
  const silencePass = silence <= 0.20;
  const overall = durationPass && silencePass && sectionData.every(x => x.pass);

  document.getElementById("duration-value").textContent = `${duration.toFixed(1)} s ${durationPass ? "✓" : "×"}`;
  document.getElementById("silence-value").textContent = `${(silence * 100).toFixed(1)}% ${silencePass ? "✓" : "×"}`;

  const results = document.getElementById("section-results");
  results.innerHTML = sectionData.map((x, i) => `
    <div class="section-card ${x.pass ? "pass" : "fail"}">
      <small>Quarter ${i + 1} · ${x.principle}</small>
      <div class="big-note">${x.note}</div>
      <div class="pct">${(x.target_fraction * 100).toFixed(1)}%</div>
      <div class="energy-bar"><span style="width:${Math.min(100, x.target_fraction * 500)}%"></span></div>
      <small>${x.pass ? "target present" : "below 8% threshold"}</small>
    </div>
  `).join("");

  const chip = document.getElementById("verdict-chip");
  chip.className = `verdict ${overall ? "pass" : "fail"}`;
  chip.textContent = overall ? "PASS" : "FAIL";
  document.getElementById("verdict-title").textContent = overall ? "The declared path survived this preview." : "This render drifted from the declared path.";

  lastReceipt = {
    schema_version: "harmoness-browser-receipt/v0",
    canonical: false,
    note: "Browser preview only; repository CI is canonical for committed PCM WAV witnesses.",
    file: { name: file.name, type: file.type, bytes: file.size },
    audio: { duration_sec: Number(duration.toFixed(6)), sample_rate: buffer.sampleRate, channels: buffer.numberOfChannels, silence_fraction: Number(silence.toFixed(6)) },
    expected_path: mapping.map(x => x.note),
    checks: {
      duration: { pass: durationPass, min: 30, max: 360 },
      silence: { pass: silencePass, max: 0.20 },
      sections: sectionData.map(x => ({ ...x, target_fraction: Number(x.target_fraction.toFixed(6)) }))
    },
    verdict: overall ? "PASS" : "FAIL"
  };
  document.getElementById("download-receipt").disabled = false;
}

const input = document.getElementById("audio-file");
input.addEventListener("change", () => {
  if (input.files && input.files[0]) analyzeFile(input.files[0]).catch(showError);
});

const dropzone = document.getElementById("dropzone");
["dragenter", "dragover"].forEach(evt => dropzone.addEventListener(evt, e => {
  e.preventDefault();
  dropzone.style.borderColor = "var(--accent)";
}));
["dragleave", "drop"].forEach(evt => dropzone.addEventListener(evt, e => {
  e.preventDefault();
  dropzone.style.borderColor = "";
}));
dropzone.addEventListener("drop", e => {
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) analyzeFile(file).catch(showError);
});

function showError(error) {
  document.getElementById("analysis").classList.remove("hidden");
  document.getElementById("verdict-title").textContent = "Could not decode this audio file.";
  const chip = document.getElementById("verdict-chip");
  chip.className = "verdict fail";
  chip.textContent = "ERROR";
  document.getElementById("file-meta").textContent = error.message || String(error);
}

document.getElementById("download-receipt").addEventListener("click", () => {
  if (!lastReceipt) return;
  const blob = new Blob([JSON.stringify(lastReceipt, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "harmoness-browser-receipt.json";
  a.click();
  URL.revokeObjectURL(url);
});
