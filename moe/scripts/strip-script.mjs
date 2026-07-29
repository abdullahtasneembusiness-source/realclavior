// Turn an annotated SCRIPT.md into clean narration text for the voiceover step.
//
// Keeps SCRIPT.md as the single source of truth: the director reads the version
// with visual cues, ElevenLabs reads the stripped version. Never hand-edit
// script.txt — edit SCRIPT.md and re-run this.
//
// Usage: node moe/scripts/strip-script.mjs <episode>

import { readFile, writeFile } from "node:fs/promises";
import { argv, exit } from "node:process";

const episode = argv[2] || "largay";
const inPath = `moe/episodes/${episode}/SCRIPT.md`;
const outPath = `moe/episodes/${episode}/script.txt`;

const raw = await readFile(inPath, "utf8");

// Everything above the first horizontal rule is front matter describing the
// script — not narration. Dropping it by line-pattern was fragile and let the
// preamble leak into the voiceover, so cut at the separator instead.
const firstRule = raw.indexOf("\n---");
const md = firstRule === -1 ? raw : raw.slice(firstRule + 4);

const narration = md
  .split("\n")
  // Drop visual cues, headings, rules, and the front-matter preamble.
  .filter((l) => !/^\s*\[VISUAL:/i.test(l))
  .filter((l) => !/^\s*#/.test(l))
  .filter((l) => !/^\s*---\s*$/.test(l))
  .filter((l) => !/^\s*\*\*This is the master script/.test(l))
  .filter((l) => !/^\s*`npm run script:strip`/.test(l))
  .filter((l) => !/^\s*ElevenLabs step actually reads/.test(l))
  .filter((l) => !/^\s*Runtime estimate:/.test(l))
  .join("\n")
  // Strip any inline markdown emphasis so the TTS doesn't read asterisks.
  .replace(/\*\*(.+?)\*\*/g, "$1")
  .replace(/(?<!\w)\*(.+?)\*(?!\w)/g, "$1")
  // Collapse runs of blank lines into a single paragraph break.
  .replace(/\n{3,}/g, "\n\n")
  .trim();

if (!narration) {
  console.error(`❌ Nothing left after stripping ${inPath} — check the filters.`);
  exit(1);
}

await writeFile(outPath, narration + "\n");

const words = narration.split(/\s+/).length;
const mins = (words / 145).toFixed(1); // ~145 wpm documentary pace
console.log(`✅ ${outPath} — ${words} words, ~${mins} min at 145 wpm`);
