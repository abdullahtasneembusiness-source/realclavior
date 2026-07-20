import { continueRender, delayRender, staticFile } from "remotion";

/**
 * Fonts are self-hosted (video/public/fonts/*.woff2, variable weight) and loaded with
 * the FontFace API behind delayRender — Remotion will not capture a single frame until
 * all three faces are ready, so font fallback is impossible. Self-hosting (rather than
 * @remotion/google-fonts' runtime fetch) also makes renders deterministic and offline,
 * and sidesteps the sandbox's TLS-intercepting proxy which the headless browser's cert
 * store doesn't trust.
 */
const FONTS: { family: string; file: string; weight: string }[] = [
  { family: "Space Grotesk", file: "fonts/SpaceGrotesk.woff2", weight: "300 700" },
  { family: "Inter", file: "fonts/Inter.woff2", weight: "100 900" },
  { family: "JetBrains Mono", file: "fonts/JetBrainsMono.woff2", weight: "100 800" },
];

if (typeof document !== "undefined") {
  for (const f of FONTS) {
    const handle = delayRender(`font: ${f.family}`);
    const face = new FontFace(
      f.family,
      `url('${staticFile(f.file)}') format('woff2')`,
      { weight: f.weight },
    );
    face
      .load()
      .then(() => {
        // TS's lib.dom is missing FontFaceSet.add in this config; it exists in Chrome.
        (document.fonts as unknown as { add: (f: FontFace) => void }).add(face);
        continueRender(handle);
      })
      .catch((err) => {
        // Surface loudly — a missing font must fail the render, not fall back silently.
        throw err;
      });
  }
}

export const F = {
  display: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

/** Exact Clovior design tokens (see src/app/globals.css in the main app). */
export const C = {
  bg: "#FAFAF7",
  card: "#FFFFFF",
  border: "#EAEAE4",
  ink: "#16150F",
  sub: "#6B6A63",
  green: "#1F3D2B",
  greenHover: "#16301F",
  amber: "#E8A317", // reserved: Feedback Memory ONLY
  mint: "#2E7D52",
  red: "#C0442E",
  muted: "#F4F4EF",
};

export const monoLabel = (size = 13): React.CSSProperties => ({
  fontFamily: F.mono,
  fontSize: size,
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: C.sub,
});
