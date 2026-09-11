#!/usr/bin/env node
/**
 * Upscale the cover illustration on Replicate, so the front panel prints at
 * 300 DPI.
 *
 * The front panel of the wrap is 8.625 x 11.25 inches once bleed is counted,
 * which is 2588 x 3375 px at 300 DPI. Flux Ultra returns 1792 x 2368, so the
 * art needs about 1.5x.
 *
 * Replicate model names move around, so this tries a short list of cheap
 * upscalers and uses the first that answers. A model that does not exist
 * returns 404 before anything is generated, so a miss costs nothing — only
 * the one that runs is billed.
 *
 * Usage:
 *   REPLICATE_API_KEY=... node book/scripts/upscale.mjs
 *   DRY_RUN=1 node book/scripts/upscale.mjs
 */

import { readFileSync, existsSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ART = join(HERE, "..", "book1", "art");
const LEDGER = join(HERE, "..", "..", "costs.jsonl");

const SRC = join(ART, "cover.png");
const OUT = join(ART, "cover-hi.png");

/** Cheap upscalers, best first. Each entry names how it takes its options. */
const CANDIDATES = [
  { model: "recraft-ai/recraft-crisp-upscale", usd: 0.006, input: (uri) => ({ image: uri }) },
  { model: "nightmareai/real-esrgan", usd: 0.003, input: (uri) => ({ image: uri, scale: 2, face_enhance: false }) },
  { model: "philz1337x/clarity-upscaler", usd: 0.012, input: (uri) => ({ image: uri, scale_factor: 2 }) },
];

const REQ_TIMEOUT_MS = 300_000;
const MAX_POLL_MS = 300_000;
const DRY_RUN = process.env.DRY_RUN === "1";

if (!existsSync(SRC)) {
  console.error(`No cover art at ${SRC}. Generate it first.`);
  process.exit(1);
}

if (DRY_RUN) {
  console.log(`source   ${SRC}`);
  console.log("would try, in order:");
  for (const c of CANDIDATES) console.log(`  ${c.model}  $${c.usd}`);
  console.log("\nDRY RUN — nothing was sent, nothing was charged.");
  process.exit(0);
}

const TOKEN = process.env.REPLICATE_API_KEY;
if (!TOKEN) {
  console.error("REPLICATE_API_KEY is not set. Refusing to run.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchWithTimeout = async (url, init = {}, ms = REQ_TIMEOUT_MS) => {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
};

const dataUri = `data:image/png;base64,${readFileSync(SRC).toString("base64")}`;
console.log(`source   ${(readFileSync(SRC).length / 1e6).toFixed(1)} MB`);

let used = null;
let output = null;

for (const candidate of CANDIDATES) {
  process.stdout.write(`${candidate.model}  ... `);
  const res = await fetchWithTimeout(
    `https://api.replicate.com/v1/models/${candidate.model}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({ input: candidate.input(dataUri) }),
    },
  );

  if (res.status === 404 || res.status === 422) {
    // Refused before any work, so nothing was generated and nothing billed.
    console.log(`unavailable (${res.status}), trying the next`);
    continue;
  }
  if (!res.ok) {
    console.log("FAILED");
    console.error(`${candidate.model} returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
    process.exit(1);
  }

  let pred = await res.json();
  const deadline = Date.now() + MAX_POLL_MS;
  while (!["succeeded", "failed", "canceled"].includes(pred.status)) {
    if (Date.now() > deadline) {
      console.log("FAILED");
      console.error(`Still ${pred.status} after ${MAX_POLL_MS / 1000}s.`);
      process.exit(1);
    }
    await sleep(3000);
    const poll = await fetchWithTimeout(pred.urls.get, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!poll.ok) break;
    pred = await poll.json();
  }

  if (pred.status !== "succeeded") {
    console.log("FAILED");
    console.error(`${candidate.model}: ${pred.error ?? pred.status}`);
    process.exit(1);
  }

  output = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  used = { ...candidate, id: pred.id };
  console.log("ok");
  break;
}

if (!output) {
  console.error("No upscaler was reachable. The cover can be resampled locally instead.");
  process.exit(1);
}

const bin = await fetchWithTimeout(output);
if (!bin.ok) {
  console.error(`Upscaled but the download returned ${bin.status}. The call was still charged.`);
  console.error(`Image URL: ${output}`);
  process.exit(1);
}
writeFileSync(OUT, Buffer.from(await bin.arrayBuffer()));

appendFileSync(
  LEDGER,
  JSON.stringify({
    ts: new Date().toISOString(),
    project: "book1-construction",
    service: "replicate",
    model: used.model,
    item: "cover-upscale",
    predictionId: used.id,
    usd: used.usd,
  }) + "\n",
);

console.log(`\nUpscaled with ${used.model} → book1/art/cover-hi.png`);
