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

const text = (await readFile(scriptPath, "utf8")).trim();
if (!text) {
  console.error(`❌ Script file is empty: ${scriptPath}`);
  exit(1);
}
console.log(`Generating voiceover — ${text.length} chars · voice ${voiceId} · model ${modelId}`);

const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
  method: "POST",
  headers: { "xi-api-key": apiKey, "content-type": "application/json", accept: "audio/mpeg" },
  body: JSON.stringify({
    text,
    model_id: modelId,
    voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true },
  }),
});

if (!res.ok) {
  console.error(`❌ ElevenLabs API error ${res.status}: ${await res.text()}`);
  exit(1);
}

const buf = Buffer.from(await res.arrayBuffer());
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, buf);
console.log(`✅ Wrote ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
