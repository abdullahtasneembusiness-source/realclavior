import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";

/**
 * Cursor choreography. A scene declares waypoints — where the cursor should be at
 * which (scene-local) frame, and whether it clicks on arrival. Between waypoints the
 * cursor travels a slightly arced bezier with easeInOutCubic, so nothing moves in
 * robotic straight lines and nothing ever teleports.
 */
export type Way = { f: number; x: number; y: number; click?: boolean };

const easeInOutCubic = Easing.bezier(0.65, 0, 0.35, 1);

export function cursorPos(frame: number, ways: Way[]): { x: number; y: number } {
  if (ways.length === 0) return { x: -100, y: -100 };
  if (frame <= ways[0].f) return { x: ways[0].x, y: ways[0].y };
  const last = ways[ways.length - 1];
  if (frame >= last.f) return { x: last.x, y: last.y };
  let i = 0;
  while (i < ways.length - 1 && ways[i + 1].f <= frame) i++;
  const a = ways[i];
  const b = ways[i + 1];
  if (b.f === a.f) return { x: b.x, y: b.y };
  const t = easeInOutCubic((frame - a.f) / (b.f - a.f));
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  // Slight arc: perpendicular offset, strongest mid-travel, alternating side.
  const arc = Math.min(36, dist * 0.1) * (i % 2 === 0 ? 1 : -1);
  const px = dist > 0 ? -dy / dist : 0;
  const py = dist > 0 ? dx / dist : 0;
  const bow = Math.sin(t * Math.PI) * arc;
  return { x: a.x + dx * t + px * bow, y: a.y + dy * t + py * bow };
}

export const Cursor: React.FC<{ ways: Way[] }> = ({ ways }) => {
  const frame = useCurrentFrame();
  const { x, y } = cursorPos(frame, ways);

  // Click feedback: a quick 0.92 scale dip plus a subtle expanding ring.
  let scale = 1;
  let ring: { r: number; o: number } | null = null;
  for (const w of ways) {
    if (!w.click) continue;
    if (frame >= w.f && frame <= w.f + 12) {
      ring = {
        r: interpolate(frame, [w.f, w.f + 12], [6, 34]),
        o: interpolate(frame, [w.f, w.f + 12], [0.45, 0]),
      };
    }
    if (frame >= w.f - 1 && frame <= w.f + 7) {
      scale = interpolate(frame, [w.f - 1, w.f + 2, w.f + 7], [1, 0.92, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    }
  }

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 90 }}>
      {ring ? (
        <div
          style={{
            position: "absolute",
            left: x - ring.r,
            top: y - ring.r,
            width: ring.r * 2,
            height: ring.r * 2,
            borderRadius: "50%",
            border: `2.5px solid rgba(22,21,15,${ring.o})`,
          }}
        />
      ) : null}
      <svg
        width={30}
        height={30}
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: `scale(${scale})`,
          transformOrigin: "4px 3px",
          filter: "drop-shadow(0 2px 4px rgba(22,21,15,0.35))",
        }}
      >
        <path
          d="M5 2.2 L5 19.2 L9.1 15.4 L11.6 21 L14.3 19.8 L11.9 14.4 L17.5 14.1 Z"
          fill="#16150F"
          stroke="#FFFFFF"
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

/** True from the given click frame on — for driving UI state off a cursor click. */
export function after(frame: number, at: number): boolean {
  return frame >= at;
}
