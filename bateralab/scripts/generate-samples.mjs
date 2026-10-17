#!/usr/bin/env node
/**
 * Gera os samples do kit em public/samples/*.wav por síntese (DSP simples).
 *
 * Os sons são 100% gerados por este script — sem gravações de terceiros —,
 * por isso não há licença externa a respeitar (ver README → "Origem dos sons").
 * Para trocar por um kit gravado, basta substituir os .wav mantendo os nomes.
 *
 * Uso: npm run samples
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "samples");

// Gerador pseudo-aleatório determinístico: o mesmo script gera sempre os mesmos arquivos.
let seed = 1234567;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
const noise = () => rand() * 2 - 1;

function render(seconds, fn) {
  const n = Math.floor(seconds * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i / SR, i);
  return out;
}

/** Filtro passa-alto de 1ª ordem. */
function highpass(buf, cutoff) {
  const rc = 1 / (2 * Math.PI * cutoff);
  const a = rc / (rc + 1 / SR);
  const out = new Float32Array(buf.length);
  let prevIn = 0;
  let prevOut = 0;
  for (let i = 0; i < buf.length; i++) {
    prevOut = a * (prevOut + buf[i] - prevIn);
    prevIn = buf[i];
    out[i] = prevOut;
  }
  return out;
}

/** Filtro passa-baixo de 1ª ordem. */
function lowpass(buf, cutoff) {
  const dt = 1 / SR;
  const a = dt / (1 / (2 * Math.PI * cutoff) + dt);
  const out = new Float32Array(buf.length);
  let y = 0;
  for (let i = 0; i < buf.length; i++) out[i] = y += a * (buf[i] - y);
  return out;
}

const mix = (...bufs) => {
  const out = new Float32Array(Math.max(...bufs.map(([b]) => b.length)));
  for (const [b, g] of bufs) for (let i = 0; i < b.length; i++) out[i] += b[i] * g;
  return out;
};

const envelope = (buf, decay, attack = 0.001) =>
  buf.map((s, i) => {
    const t = i / SR;
    return s * Math.min(1, t / attack) * Math.exp(-t / decay);
  });

/** Tambor: seno com queda de afinação (como o MembraneSynth). */
function drum(f0, f1, pitchDecay, decay, seconds, click = 0.3) {
  let phase = 0;
  const body = render(seconds, (t) => {
    const f = f1 + (f0 - f1) * Math.exp(-t / pitchDecay);
    phase += (2 * Math.PI * f) / SR;
    return Math.sin(phase) * Math.exp(-t / decay);
  });
  const attack = envelope(render(0.02, noise), 0.003);
  return mix([body, 1], [lowpass(attack, 3000), click]);
}

/** Prato: soma de ondas quadradas em razões inarmónicas + ruído, passa-alto. */
function metal(base, decay, seconds, hp, noiseAmt = 0.5) {
  const ratios = [1, 1.483, 1.932, 2.546, 2.63, 3.897];
  const phases = ratios.map(() => rand());
  const raw = render(seconds, (t) => {
    let s = 0;
    ratios.forEach((r, k) => {
      s += ((t * base * r + phases[k]) % 1) < 0.5 ? 1 : -1;
    });
    return (s / ratios.length) * (1 - noiseAmt) + noise() * noiseAmt;
  });
  return envelope(highpass(highpass(raw, hp), hp), decay);
}

function normalize(buf, peak = 0.9) {
  const max = buf.reduce((m, s) => Math.max(m, Math.abs(s)), 0) || 1;
  const out = buf.map((s) => (s / max) * peak);
  // fade-out final de 5 ms para nunca terminar num clique
  const fade = Math.floor(0.005 * SR);
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
  return out;
}

function wav(buf) {
  const data = Buffer.alloc(buf.length * 2);
  buf.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const snare = () => {
  const body = drum(330, 180, 0.02, 0.06, 0.35, 0.1);
  const wires = envelope(highpass(lowpass(render(0.35, noise), 9000), 1500), 0.09);
  return mix([body, 0.6], [wires, 0.9]);
};

const kit = {
  kick: drum(160, 48, 0.035, 0.32, 0.6, 0.4),
  snare: snare(),
  hihatClosed: metal(410, 0.035, 0.18, 6500, 0.6),
  hihatOpen: metal(410, 0.45, 1.2, 6000, 0.6),
  tom1: drum(260, 165, 0.06, 0.28, 0.7, 0.2),
  tom2: drum(200, 125, 0.06, 0.32, 0.8, 0.2),
  floorTom: drum(140, 85, 0.07, 0.42, 1.0, 0.2),
  crash: metal(300, 1.1, 2.6, 3500, 0.75),
  ride: mix(
    [metal(520, 0.9, 2.2, 3000, 0.35), 1],
    [render(2.2, (t) => Math.sin(2 * Math.PI * 2650 * t) * Math.exp(-t / 0.6)), 0.15],
  ),
};

mkdirSync(outDir, { recursive: true });
for (const [name, buf] of Object.entries(kit)) {
  writeFileSync(join(outDir, `${name}.wav`), wav(normalize(buf)));
  console.log(`✓ ${name}.wav (${(buf.length / SR).toFixed(2)} s)`);
}
