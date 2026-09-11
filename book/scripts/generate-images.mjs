#!/usr/bin/env node
/**
 * Generate the line-art illustrations for "Cut, Color & Build: Construction Site"
 * on Replicate.
 *
 * Two models, chosen per image in images.json. Flux 1.1 Pro draws simple
 * objects well but returns technical illustration for cranes, rollers and
 * excavators whatever the prompt says; those go to Recraft V3 SVG, which
 * returns real vector line art and needs no tracing.
 *
 * This script spends real money, so every guard the project runs on is in here
 * rather than in someone's memory:
 *
 *   - DRY_RUN=1 prints the exact prompts and the price and calls nothing.
 *   - ONLY=a06,a23 restricts the run to named images (one-before-many).
 *   - SEED=7 varies the fixed style seed, for redoing a rejected image.
 *   - Anything already present in art/ is skipped unless FORCE=1.
 *   - The run is priced up front and aborts if it would pass CEILING_USD.
 *   - A failed generation is reported and stops the run. Nothing is retried
 *     automatically — a silent retry is a silent second charge.
 *   - Every billable call is appended to costs.jsonl before the next one starts.
 *
 * Usage:
 *   REPLICATE_API_KEY=... node book/scripts/generate-images.mjs
 *   DRY_RUN=1 node book/scripts/generate-images.mjs
 *   ONLY=a06,a23,a29 node book/scripts/generate-images.mjs
 */

import { readFileSync, existsSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BOOK = join(HERE, "..", "book1");
const ART = join(BOOK, "art");
/** One ledger for the whole repo, at its root. Each line names its project. */
const LEDGER = join(HERE, "..", "..", "costs.jsonl");

/** Hard stop for a single run, in dollars. The whole book is ~$1.20 of art. */
const CEILING_USD = Number(process.env.CEILING_USD ?? 5);
/** One attempt per image. A failure is reported, never retried behind your back. */
const ATTEMPTS = 1;
/** Flux normally answers in well under a minute; these bound a hung request. */
const REQ_TIMEOUT_MS = 150_000;
const MAX_POLL_MS = 180_000;
/**
 * Replicate throttles prediction creation to 6 a minute with a burst of 1
 * while the account holds under $5 of credit, so two back-to-back images 429.
 * Wait this long between creations to stay under it. Top the account up past
 * $5 and this can drop.
 */
const PACE_MS = Number(process.env.PACE_MS ?? 11_000);

const DRY_RUN = process.env.DRY_RUN === "1";
const FORCE = process.env.FORCE === "1";
const ONLY = (process.env.ONLY ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/* ------------------------------------------------------------------ *
 * Prompt assembly
 * ------------------------------------------------------------------ */

const spec = JSON.parse(readFileSync(join(BOOK, "images.json"), "utf8"));
/**
 * The style block is read from disk rather than inlined, so the one in the book
 * plan, the one in the prompts and the one in any future book stay identical.
 * Flux is distilled and rejects a negative prompt, so every avoidance in it is
 * phrased as part of the description.
 */
const STYLE = readFileSync(join(BOOK, "style.txt"), "utf8").trim();

const buildPrompt = (img) => `${STYLE}\n\nSubject: ${img.subject}`;

/**
 * Which model draws an image, and what that model needs.
 *
 * Flux 1.1 Pro draws simple objects well — a cone, a hard hat, a sign — but
 * returns technical illustration for cranes, rollers and excavators whatever
 * the prompt says, so those go to Recraft, which draws real vector line art.
 * Each model takes its own size argument and returns its own file type.
 */
const modelOf = (img) => img.model ?? spec.model;
const settingsOf = (img) => {
  const name = modelOf(img);
  const cfg = spec.models[name];
  if (!cfg) throw new Error(`images.json has no settings for model "${name}".`);
  return cfg;
};
const priceOf = (img) => settingsOf(img).usdPerImage;
const outPath = (img) => join(ART, `${img.key}.${settingsOf(img).ext}`);

function inputFor(img) {
  const cfg = settingsOf(img);
  const size = cfg.sizes[img.aspect];
  const base = { prompt: buildPrompt(img) };

  if (modelOf(img).startsWith("recraft")) {
    // Recraft has no seed; consistency comes from its style setting.
    return { ...base, size: size.size, style: cfg.style };
  }
  return {
    ...base,
    // flux-1.1-pro only honours width/height when aspect_ratio is "custom";
    // its `megapixels` input is ignored entirely.
    aspect_ratio: "custom",
    width: size.width,
    height: size.height,
    seed: SEED,
    output_format: cfg.ext,
    prompt_upsampling: spec.promptUpsampling,
    safety_tolerance: 2,
  };
}

const describe = (img) => {
  const cfg = settingsOf(img);
  const size = cfg.sizes[img.aspect];
  return size.size ?? `${size.width}x${size.height}`;
};

/**
 * One seed across the whole book keeps the drawing style consistent. The flip
 * side is that a straight re-run reproduces the same picture, so redoing a
 * rejected image needs a different seed — hence the override.
 */
// An unset workflow input arrives as "", not as undefined, so test for content.
const SEED = process.env.SEED ? Number(process.env.SEED) : spec.seed;
if (!Number.isInteger(SEED)) {
  console.error(`SEED must be a whole number, got "${process.env.SEED}".`);
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * Selection and pricing
 * ------------------------------------------------------------------ */

const known = new Set(spec.images.map((i) => i.key));
for (const key of ONLY) {
  if (!known.has(key)) {
    console.error(`ONLY names "${key}", which is not an image in images.json.`);
    console.error(`Known keys: ${[...known].join(", ")}`);
    process.exit(1);
  }
}

const requested = ONLY.length ? spec.images.filter((i) => ONLY.includes(i.key)) : spec.images;

const cached = requested.filter((i) => !FORCE && existsSync(outPath(i)));
const todo = requested.filter((i) => FORCE || !existsSync(outPath(i)));

const estimate = +todo.reduce((sum, i) => sum + priceOf(i), 0).toFixed(2);
const byModel = new Map();
for (const i of todo) byModel.set(modelOf(i), (byModel.get(modelOf(i)) ?? 0) + 1);

console.log(`seed       ${SEED}${SEED === spec.seed ? " (book default, Flux only)" : " (override of the book default " + spec.seed + ")"}`);
console.log(`requested  ${requested.length}${ONLY.length ? ` (ONLY=${ONLY.join(",")})` : ""}`);
console.log(`cached     ${cached.length}${cached.length ? ` → ${cached.map((i) => i.key).join(", ")}` : ""}`);
console.log(`to build   ${todo.length}${todo.length ? ` → ${todo.map((i) => i.key).join(", ")}` : ""}`);
for (const [name, n] of byModel) {
  console.log(`           ${n} on ${name} at $${spec.models[name].usdPerImage}/image`);
}
console.log(`estimate   $${estimate.toFixed(2)}`);
console.log("");

if (!todo.length) {
  console.log("Nothing to do. Every requested image already exists (FORCE=1 to rebuild).");
  process.exit(0);
}

if (estimate > CEILING_USD) {
  console.error(`ABORT: $${estimate.toFixed(2)} would pass the $${CEILING_USD} ceiling for one run.`);
  console.error("Narrow the run with ONLY=..., or raise CEILING_USD deliberately.");
  process.exit(1);
}

if (DRY_RUN) {
  for (const img of todo) {
    console.log(`--- ${img.key}  ${img.aspect}  ${describe(img)}  ${modelOf(img)}  activities ${img.usedBy.join(", ")}`);
    console.log(buildPrompt(img));
    console.log("");
  }
  console.log(`DRY RUN — nothing was sent, nothing was charged. Would have spent $${estimate.toFixed(2)}.`);
  process.exit(0);
}

const TOKEN = process.env.REPLICATE_API_KEY;
if (!TOKEN) {
  console.error("REPLICATE_API_KEY is not set. Refusing to run.");
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * Replicate
 * ------------------------------------------------------------------ */

const fetchWithTimeout = async (url, init = {}, ms = REQ_TIMEOUT_MS) => {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Run one prediction to completion and return the output image URL. */
async function predict(img) {
  const input = inputFor(img);

  const create = () =>
    fetchWithTimeout(`https://api.replicate.com/v1/models/${modelOf(img)}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({ input }),
    });

  let res = await create();

  // A 429 is the one failure worth waiting out. The request is refused before
  // any image is made, so nothing was billed and asking again is not a second
  // charge — unlike a failed prediction, which this script never retries.
  for (let waits = 0; res.status === 429 && waits < 2; waits++) {
    const body = await res.clone().json().catch(() => ({}));
    const after = Math.min(Number(body.retry_after ?? 10), 60);
    console.log(`throttled, waiting ${after}s`);
    await sleep((after + 1) * 1000);
    res = await create();
  }

  if (!res.ok) {
    throw new Error(`Replicate returned ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }

  let pred = await res.json();

  // `Prefer: wait` usually returns a finished prediction, but it can time out
  // and hand back a still-running one. Poll that to a terminal state.
  const deadline = Date.now() + MAX_POLL_MS;
  while (pred.status !== "succeeded" && pred.status !== "failed" && pred.status !== "canceled") {
    if (Date.now() > deadline) throw new Error(`Still ${pred.status} after ${MAX_POLL_MS / 1000}s.`);
    await sleep(2000);
    const poll = await fetchWithTimeout(pred.urls.get, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!poll.ok) throw new Error(`Poll returned ${poll.status}`);
    pred = await poll.json();
  }

  if (pred.status !== "succeeded") {
    throw new Error(`Prediction ${pred.status}: ${pred.error ?? "no error given"}`);
  }

  // Both models return a single URI string: a PNG from Flux, an SVG from Recraft.
  const url = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  if (typeof url !== "string") throw new Error(`Unexpected output shape: ${JSON.stringify(pred.output).slice(0, 200)}`);
  return { url, id: pred.id };
}

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

mkdirSync(ART, { recursive: true });

let spent = 0;
const made = [];

for (const [i, img] of todo.entries()) {
  if (i > 0 && PACE_MS > 0) await sleep(PACE_MS);

  process.stdout.write(`${img.key}  ${img.aspect} ${describe(img)}  ... `);

  let result;
  try {
    result = await predict(img);
  } catch (err) {
    console.log("FAILED");
    console.error(`\n${img.key} failed: ${err.message}`);
    console.error(
      ATTEMPTS === 1
        ? "Stopping here rather than retrying — a retry is a second charge. Re-run with ONLY=" + img.key + " once you have decided."
        : "",
    );
    console.error(`\nSpent this run: $${spent.toFixed(2)} across ${made.length} image(s): ${made.join(", ") || "none"}`);
    process.exit(1);
  }

  const bin = await fetchWithTimeout(result.url);
  if (!bin.ok) {
    console.log("FAILED");
    console.error(`${img.key}: generated but the download returned ${bin.status}. The call was still charged.`);
    console.error(`Image URL: ${result.url}`);
    process.exit(1);
  }
  writeFileSync(outPath(img), Buffer.from(await bin.arrayBuffer()));

  spent += priceOf(img);
  made.push(img.key);

  appendFileSync(
    LEDGER,
    JSON.stringify({
      ts: new Date().toISOString(),
      project: "book1-construction",
      service: "replicate",
      model: modelOf(img),
      item: img.key,
      predictionId: result.id,
      seed: SEED,
      usd: priceOf(img),
    }) + "\n",
  );

  console.log(`ok  → book1/art/${img.key}.${settingsOf(img).ext}`);
}

console.log("");
console.log(`Done. ${made.length} image(s), $${spent.toFixed(2)} spent this run.`);
console.log("Check each one against the quality checklist in book/book1/CHECKLIST.md before building pages.");
