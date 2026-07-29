// Generate still images from prompts using Replicate (Flux). No dependencies —
// Node 22 built-in fetch. Token comes from repo secrets on GitHub Actions.
//
// Usage: node moe/scripts/generate-images.mjs [promptsJson] [outDir]
//
// promptsJson: a JSON array of { name, prompt, input? } — `input` lets a prompt
// override model params (e.g. a LoRA weights URL, aspect ratio).

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { argv, env, exit } from "node:process";

const pick = (...names) => {
  for (const n of names) if (env[n] && env[n].trim()) return env[n].trim();
  return "";
};

const token = pick("REPLICATE_API_TOKEN", "REPLICATE_API_KEY", "REPLICATE_TOKEN");
// flux-schnell is the cheap/fast model — good for pipeline tests. Switch to
// black-forest-labs/flux-1.1-pro (or your Flux 2 Pro + LoRA) for final stills.
const model = pick("REPLICATE_MODEL") || "black-forest-labs/flux-schnell";

if (!token) {
  console.error("❌ No Replicate token found (REPLICATE_API_TOKEN or REPLICATE_API_KEY).");
  exit(1);
}

const promptsPath = argv[2] || "moe/episodes/blackreef/images.json";
const outDir = argv[3] || "moe/out/images";

// Channel-wide look. Episode prompts describe only the SUBJECT; the style comes
// from here so every video across the channel matches.
let style = { base: "", negative: "" };
try {
  style = JSON.parse(await readFile("moe/style.json", "utf8"));
} catch {
  console.warn("⚠ moe/style.json not found — generating without channel style.");
}

let prompts;
try {
  prompts = JSON.parse(await readFile(promptsPath, "utf8"));
} catch {
  prompts = [
    {
      name: "test",
      prompt:
        "Documentary reconstruction still: a snowbound mountain ridge in a whiteout, cold desaturated blue-grey palette, low visibility, cinematic, moody, no people",
    },
  ];
}

await mkdir(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Every network call gets a deadline. Without one, a stalled request hangs the
// whole job with no output — which is exactly what happened the first time.
// Observed generation times are 20–45s with `Prefer: wait` holding the
// connection open, so the per-request budget has to sit well above that.
const REQ_TIMEOUT_MS = 150_000;
const MAX_POLL_MS = 180_000;
// §1.2 — paid calls are NEVER retried automatically, even when the failure
// looks transient. Silent retries are how credit got burned before. A failure
// is reported and the operator decides.
const ATTEMPTS = 1;

const fetchWithTimeout = (url, opts = {}) =>
  fetch(url, { ...opts, signal: AbortSignal.timeout(REQ_TIMEOUT_MS) });

async function generate(p) {
  console.log(`→ ${p.name}: ${p.prompt.slice(0, 70)}...`);
  const fullPrompt = style.base ? `${p.prompt}, ${style.base}` : p.prompt;

  // NOTE: no negative_prompt. Flux is a distilled model and does not take one —
  // passing it is rejected rather than ignored. Things to avoid belong in the
  // positive prompt (see moe/style.json).
  const res = await fetchWithTimeout(
    `https://api.replicate.com/v1/models/${model}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait", // run synchronously where the model supports it
      },
      body: JSON.stringify({
        input: {
          prompt: fullPrompt,
          aspect_ratio: "16:9",
          output_format: "jpg",
          output_quality: 92, // default compression was leaving stills at ~40KB
          megapixels: "1",
          ...(p.input || {}),
        },
      }),
    }
  );

  let pred = await res.json();
  if (!res.ok) throw new Error(`Replicate ${res.status}: ${JSON.stringify(pred)}`);

  const deadline = Date.now() + MAX_POLL_MS;
  while (pred.status && !["succeeded", "failed", "canceled"].includes(pred.status)) {
    if (Date.now() > deadline) throw new Error(`timed out while status=${pred.status}`);
    console.log(`   …${pred.status}`); // visible progress; a hang is now diagnosable
    await sleep(2000);
    const g = await fetchWithTimeout(pred.urls.get, {
      headers: { Authorization: `Bearer ${token}` },
    });
    pred = await g.json();
  }
  if (pred.status !== "succeeded") {
    throw new Error(`prediction ${pred.status}: ${JSON.stringify(pred.error || pred)}`);
  }

  const url = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  const img = await fetchWithTimeout(url);
  const buf = Buffer.from(await img.arrayBuffer());
  const out = `${outDir}/${p.name}.jpg`;
  await writeFile(out, buf);
  console.log(`✅ ${out} (${(buf.length / 1024).toFixed(0)} KB)`);
}

let ok = 0;
const failed = [];
for (const p of prompts) {
  let done = false;
  for (let attempt = 1; attempt <= ATTEMPTS && !done; attempt++) {
    try {
      await generate(p);
      ok++;
      done = true;
    } catch (e) {
      // No retry, by rule. Report and move on; the operator decides what to redo.
      console.error(`❌ ${p.name}: ${e.message}`);
      console.error("   Not retried (§1.2). Re-run this one deliberately if you want it.");
      failed.push(p.name);
    }
  }
}

console.log(`Done: ${ok} generated, ${failed.length} failed.`);
if (failed.length) console.log(`Failed after ${ATTEMPTS} attempts: ${failed.join(", ")}`);
// Only hard-fail if nothing at all came back; a partial set is still usable.
if (ok === 0) exit(1);
