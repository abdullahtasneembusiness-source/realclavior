// Generate a voiceover MP3 from a script file using the ElevenLabs API.
// No dependencies — uses Node 22's built-in fetch. Runs on GitHub Actions
// where the API key comes from repo secrets.
//
// Usage: node moe/scripts/generate-voiceover.mjs [scriptPath] [outPath]

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { argv, env, exit } from "node:process";
import { dirname } from "node:path";

// Accept several possible secret names so a naming mismatch doesn't break the run.
const pick = (...names) => {
  for (const n of names) if (env[n] && env[n].trim()) return env[n].trim();
  return "";
};

const apiKey = pick("ELEVENLABS_API_KEY", "ELEVEN_LABS_API_KEY", "ELEVENLABS_KEY", "XI_API_KEY");
// Default voice = "Rachel" (a public ElevenLabs voice) so it works even before you pick one.
const voiceId = pick("ELEVENLABS_VOICE_ID", "ELEVEN_LABS_VOICE_ID", "VOICE_ID") || "21m00Tcm4TlvDq8ikWAM";
const modelId = pick("ELEVENLABS_MODEL_ID") || "eleven_multilingual_v2";

const scriptPath = argv[2] || "moe/episodes/blackreef/script.txt";
const outPath = argv[3] || "moe/out/voiceover.mp3";

if (!apiKey) {
  console.error("❌ No ElevenLabs API key found. Add it as a repo secret named ELEVENLABS_API_KEY.");
  exit(1);
}

const full = (await readFile(scriptPath, "utf8")).trim();
if (!full) {
  console.error(`❌ Script file is empty: ${scriptPath}`);
  exit(1);
}

// Character quota is real money. Default to a short sample so that choosing a
// narrator, or debugging anything unrelated, never costs a full script render.
const mode = (env.VOICE_MODE || "sample").toLowerCase();
const text = mode === "full" ? full : full.slice(0, 600);

// Optional A/B: pass several voice IDs and get one sample file each.
const voices = (env.VOICE_IDS || "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);
const targets = voices.length ? voices : [voiceId];

if (mode !== "full" && voices.length) {
  console.log(`A/B sample across ${voices.length} voices — ${text.length} chars each`);
}
console.log(
  `Mode: ${mode.toUpperCase()} · ${text.length} of ${full.length} chars · ` +
    `${targets.length} voice(s) · est. ${text.length * targets.length} characters billed`
);
if (mode === "full") {
  console.log("⚠ FULL mode — this bills the entire script. Only use when the voice is settled.");
}

await mkdir(dirname(outPath), { recursive: true });

let wrote = 0;
for (const v of targets) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${v}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true },
    }),
  });

  if (!res.ok) {
    console.error(`❌ voice ${v} — ElevenLabs ${res.status}: ${await res.text()}`);
    continue;
  }

  // One file per voice when A/B-ing, so they can be compared side by side.
  const dest = targets.length > 1 ? outPath.replace(/\.mp3$/, `-${v}.mp3`) : outPath;
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  console.log(`✅ ${dest} (${(buf.length / 1024).toFixed(0)} KB) — voice ${v}`);
  wrote++;
}

if (!wrote) exit(1);
