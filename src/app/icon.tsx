import { ImageResponse } from "next/og";

/**
 * Favicon: the Clovior clover glyph (see brand-mark.tsx), generated at build time.
 * Three forest squares + one mint — recognizable at 32px in a browser tab.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const GREEN = "#1F3D2B";
const MINT = "#2E7D52";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAF7",
          borderRadius: 7,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: 22,
            height: 22,
            gap: 2,
          }}
        >
          <div style={{ width: 10, height: 10, background: GREEN, borderRadius: 3 }} />
          <div style={{ width: 10, height: 10, background: MINT, borderRadius: 3 }} />
          <div style={{ width: 10, height: 10, background: GREEN, borderRadius: 3 }} />
          <div style={{ width: 10, height: 10, background: GREEN, borderRadius: 3 }} />
        </div>
      </div>
    ),
    size,
  );
}
