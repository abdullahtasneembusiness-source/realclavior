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

async function generate(p) {
  console.log(`→ ${p.name}: ${p.prompt.slice(0, 70)}...`);
  const fullPrompt = style.base ? `${p.prompt}, ${style.base}` : p.prompt;
  const res = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait", // run synchronously, return the result when ready
    },
    body: JSON.stringify({
      input: {
        prompt: fullPrompt,
        // Not every model accepts a negative prompt; harmless where unsupported.
        ...(style.negative ? { negative_prompt: style.negative } : {}),
        aspect_ratio: "16:9",
        output_format: "jpg",
        ...(p.input || {}),
      },
    }),
  });

  let pred = await res.json();
  if (!res.ok) throw new Error(`Replicate ${res.status}: ${JSON.stringify(pred)}`);

  let tries = 0;
  while (pred.status && !["succeeded", "failed", "canceled"].includes(pred.status) && tries++ < 60) {
    await sleep(2000);
    const g = await fetch(pred.urls.get, { headers: { Authorization: `Bearer ${token}` } });
    pred = await g.json();
  }
  if (pred.status !== "succeeded") {
    throw new Error(`prediction ${pred.status}: ${JSON.stringify(pred.error || pred)}`);
  }

  const url = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  const img = await fetch(url);
  const buf = Buffer.from(await img.arrayBuffer());
  const out = `${outDir}/${p.name}.jpg`;
  await writeFile(out, buf);
  console.log(`✅ ${out} (${(buf.length / 1024).toFixed(0)} KB)`);
}

let ok = 0;
let fail = 0;
for (const p of prompts) {
  try {
    await generate(p);
    ok++;
  } catch (e) {
    console.error(`❌ ${p.name}: ${e.message}`);
    fail++;
  }
}
console.log(`Done: ${ok} generated, ${fail} failed.`);
if (ok === 0) exit(1);
