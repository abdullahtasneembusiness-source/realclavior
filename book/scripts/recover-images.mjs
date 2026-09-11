#!/usr/bin/env node
/**
 * Re-download images that were generated and paid for but never reached the
 * repository.
 *
 * A run can succeed at Replicate and still lose its output: the batch of 14
 * Recraft images generated, committed on the runner, and then failed to push
 * because the branch had moved underneath it. The runner was discarded with
 * the images on it.
 *
 * Replicate keeps finished predictions, and fetching one again costs nothing,
 * so nothing here is billable. Predictions are matched back to image keys by
 * the exact "Subject:" line in the prompt, which is unique per image.
 *
 * Output URLs expire roughly an hour after generation, so this only helps
 * shortly after the loss.
 *
 * Usage:
 *   REPLICATE_API_KEY=... node book/scripts/recover-images.mjs
 *   HOURS=3 node book/scripts/recover-images.mjs
 */

import { readFileSync, existsSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BOOK = join(HERE, "..", "book1");
const ART = join(BOOK, "art");
const LEDGER = join(HERE, "..", "..", "costs.jsonl");

/** How far back to look. Older predictions have expired output URLs anyway. */
const HOURS = Number(process.env.HOURS ?? 3);
/** Pages of 100 to walk before giving up. */
const MAX_PAGES = 6;

const TOKEN = process.env.REPLICATE_API_KEY;
if (!TOKEN) {
  console.error("REPLICATE_API_KEY is not set. Refusing to run.");
  process.exit(1);
}

const spec = JSON.parse(readFileSync(join(BOOK, "images.json"), "utf8"));
const settingsOf = (img) => spec.models[img.model ?? spec.model];

/** "Subject: ..." is unique per image, so it identifies a prediction. */
const bySubject = new Map(spec.images.map((i) => [`Subject: ${i.subject}`, i]));

const missing = spec.images.filter((i) => !existsSync(join(ART, `${i.key}.${settingsOf(i).ext}`)));
if (!missing.length) {
  console.log("Every image is already present. Nothing to recover.");
  process.exit(0);
}
console.log(`missing ${missing.length}: ${missing.map((i) => i.key).join(", ")}`);

const auth = { Authorization: `Bearer ${TOKEN}` };
const since = Date.now() - HOURS * 3600_000;

let url = "https://api.replicate.com/v1/predictions";
const found = new Map();

for (let page = 0; page < MAX_PAGES && url; page++) {
  const res = await fetch(url, { headers: auth });
  if (!res.ok) {
    console.error(`Listing predictions returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
    process.exit(1);
  }
  const body = await res.json();

  for (const row of body.results ?? []) {
    if (row.status !== "succeeded") continue;
    if (new Date(row.created_at).getTime() < since) {
      url = null;  // the list is newest first, so everything past here is older
      break;
    }
    // The list view omits input and output, so fetch the prediction itself.
    const one = await fetch(`https://api.replicate.com/v1/predictions/${row.id}`, { headers: auth });
    if (!one.ok) continue;
    const pred = await one.json();

    const prompt = pred.input?.prompt ?? "";
    for (const [subject, img] of bySubject) {
      if (prompt.includes(subject) && !found.has(img.key)) {
        found.set(img.key, { img, pred });
      }
    }
  }
  if (url) url = body.next ?? null;
}

mkdirSync(ART, { recursive: true });

let recovered = 0;
for (const img of missing) {
  const hit = found.get(img.key);
  if (!hit) {
    console.log(`${img.key}  no finished prediction found in the last ${HOURS}h`);
    continue;
  }
  const out = Array.isArray(hit.pred.output) ? hit.pred.output[0] : hit.pred.output;
  if (typeof out !== "string") {
    console.log(`${img.key}  prediction ${hit.pred.id} has no usable output`);
    continue;
  }

  const bin = await fetch(out);
  if (!bin.ok) {
    console.log(`${img.key}  output expired or unreachable (${bin.status})`);
    continue;
  }
  const cfg = settingsOf(img);
  writeFileSync(join(ART, `${img.key}.${cfg.ext}`), Buffer.from(await bin.arrayBuffer()));

  // The ledger line was lost with the runner, so restore it at the original
  // time. The charge happened; only the record of it went missing.
  appendFileSync(
    LEDGER,
    JSON.stringify({
      ts: hit.pred.created_at,
      project: "book1-construction",
      service: "replicate",
      model: img.model ?? spec.model,
      item: img.key,
      predictionId: hit.pred.id,
      usd: cfg.usdPerImage,
      note: "recovered: generated and charged, but the run lost its push",
    }) + "\n",
  );

  recovered++;
  console.log(`${img.key}  recovered → book1/art/${img.key}.${cfg.ext}`);
}

console.log("");
console.log(`Recovered ${recovered} of ${missing.length}. Nothing was generated and nothing was charged.`);
process.exit(recovered === missing.length ? 0 : 1);
