// Cap over-long silences in a narration track.
//
// Generated narration tends to sit on every paragraph break for a full second
// or more. On the page that looks like a considered pause; in the ear it sounds
// like the file dropped out. This shortens every silent run to a natural
// maximum without touching the speech itself, so the delivery keeps its rhythm
// and loses the dead air.
//
// Works on WAV (PCM 16-bit). Convert in and out with ffmpeg:
//   ffmpeg -i in.mp3 -ar 44100 -ac 1 -f wav tmp.wav
//   node moe/scripts/tighten-audio.mjs tmp.wav tight.wav [maxSilenceSec]
//   ffmpeg -i tight.wav -b:a 192k out.mp3
//
// No dependencies — parses the WAV header directly.

import { readFile, writeFile } from "node:fs/promises";
import { argv, exit } from "node:process";

const inPath = argv[2];
const outPath = argv[3];
const MAX_SILENCE = Number(argv[4] || 0.28); // seconds a gap may last
const THRESH_DB = Number(argv[5] || -40); // below this counts as silence

if (!inPath || !outPath) {
  console.error("usage: tighten-audio.mjs <in.wav> <out.wav> [maxSilenceSec] [thresholdDb]");
  exit(1);
}

const buf = await readFile(inPath);

/* ---- parse the WAV container ------------------------------------------- */

if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
  console.error("❌ Not a RIFF/WAVE file. Convert with ffmpeg first.");
  exit(1);
}

let pos = 12;
let fmt = null;
let dataStart = -1;
let dataLen = 0;
while (pos + 8 <= buf.length) {
  const id = buf.toString("ascii", pos, pos + 4);
  const size = buf.readUInt32LE(pos + 4);
  if (id === "fmt ") {
    fmt = {
      channels: buf.readUInt16LE(pos + 10),
      sampleRate: buf.readUInt32LE(pos + 12),
      bits: buf.readUInt16LE(pos + 22),
    };
  } else if (id === "data") {
    dataStart = pos + 8;
    dataLen = size;
    break;
  }
  pos += 8 + size + (size % 2);
}

if (!fmt || dataStart < 0) {
  console.error("❌ Could not find fmt/data chunks.");
  exit(1);
}
if (fmt.bits !== 16) {
  console.error(`❌ Expected 16-bit PCM, got ${fmt.bits}-bit. Re-encode with ffmpeg.`);
  exit(1);
}

const { channels, sampleRate } = fmt;
const samples = new Int16Array(
  buf.buffer.slice(buf.byteOffset + dataStart, buf.byteOffset + dataStart + dataLen)
);
const frames = samples.length / channels;

/* ---- find silent runs --------------------------------------------------- */

// RMS over short windows. A window-based measure is steadier than per-sample,
// so quiet consonants don't get mistaken for silence and clipped.
const WIN = Math.max(1, Math.round(sampleRate * 0.02)); // 20ms
const threshold = Math.pow(10, THRESH_DB / 20) * 32768;

const windowIsSilent = [];
for (let f = 0; f < frames; f += WIN) {
  let sum = 0;
  let n = 0;
  const end = Math.min(frames, f + WIN);
  for (let i = f; i < end; i++) {
    const v = samples[i * channels];
    sum += v * v;
    n++;
  }
  windowIsSilent.push(Math.sqrt(sum / Math.max(1, n)) < threshold);
}

/* ---- rebuild, capping each silent run ----------------------------------- */

const maxSilentWindows = Math.max(1, Math.round((MAX_SILENCE * sampleRate) / WIN));
const keep = []; // [startFrame, endFrame)
let w = 0;
let trimmedSec = 0;
let runs = 0;

while (w < windowIsSilent.length) {
  if (!windowIsSilent[w]) {
    const start = w;
    while (w < windowIsSilent.length && !windowIsSilent[w]) w++;
    keep.push([start * WIN, Math.min(frames, w * WIN)]);
  } else {
    const start = w;
    while (w < windowIsSilent.length && windowIsSilent[w]) w++;
    const len = w - start;
    const capped = Math.min(len, maxSilentWindows);
    if (len > maxSilentWindows) {
      runs++;
      trimmedSec += ((len - capped) * WIN) / sampleRate;
    }
    keep.push([start * WIN, Math.min(frames, (start + capped) * WIN)]);
  }
}

let outFrames = 0;
for (const [a, b] of keep) outFrames += b - a;

const out = new Int16Array(outFrames * channels);
let o = 0;
for (const [a, b] of keep) {
  for (let i = a; i < b; i++) {
    for (let c = 0; c < channels; c++) out[o++] = samples[i * channels + c];
  }
}

/* ---- write ------------------------------------------------------------- */

const dataBytes = out.length * 2;
const header = Buffer.alloc(44);
header.write("RIFF", 0, "ascii");
header.writeUInt32LE(36 + dataBytes, 4);
header.write("WAVE", 8, "ascii");
header.write("fmt ", 12, "ascii");
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(channels, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * channels * 2, 28);
header.writeUInt16LE(channels * 2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36, "ascii");
header.writeUInt32LE(dataBytes, 40);

await writeFile(outPath, Buffer.concat([header, Buffer.from(out.buffer)]));

const before = frames / sampleRate;
const after = outFrames / sampleRate;
console.log(
  `✅ ${outPath}\n` +
    `   ${before.toFixed(1)}s → ${after.toFixed(1)}s ` +
    `(${trimmedSec.toFixed(1)}s removed across ${runs} long gaps)\n` +
    `   silences capped at ${MAX_SILENCE}s, threshold ${THRESH_DB}dB`
);
