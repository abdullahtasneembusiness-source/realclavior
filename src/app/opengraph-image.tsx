import { ImageResponse } from "next/og";

/**
 * OG share card for link previews (Slack, iMessage, X, WhatsApp). Matches the site:
 * warm off-white canvas, the clover glyph + wordmark, the hero headline, a hairline
 * frame. Generated at request time by Next — no static asset to keep in sync.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Clovior — Hand off work. It stays handed off.";

const GREEN = "#1F3D2B";
const MINT = "#2E7D52";
const INK = "#16150F";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FAFAF7",
          padding: 72,
          border: "1px solid #EAEAE4",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              width: 46,
              height: 46,
              gap: 4,
            }}
          >
            <div style={{ width: 21, height: 21, background: GREEN, borderRadius: 6 }} />
            <div style={{ width: 21, height: 21, background: MINT, borderRadius: 6 }} />
            <div style={{ width: 21, height: 21, background: GREEN, borderRadius: 6 }} />
            <div style={{ width: 21, height: 21, background: GREEN, borderRadius: 6 }} />
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: INK,
              letterSpacing: "-0.03em",
            }}
          >
            Clovior
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              color: INK,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              maxWidth: 900,
            }}
          >
            Hand off work. It stays handed off.
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#6B6A63",
              maxWidth: 860,
              lineHeight: 1.4,
            }}
          >
            Playbooks your operators run like checklists. Corrections that
            stick. One view of everything.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: "#6B6A63",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            For founders running remote teams
          </div>
          <div style={{ fontSize: 22, color: GREEN, fontWeight: 600 }}>
            clovior.com
          </div>
        </div>
      </div>
    ),
    size,
  );
}
