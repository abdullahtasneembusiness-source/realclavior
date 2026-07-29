import React from "react";
import { AbsoluteFill, Composition, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { TerrainMassing } from "./scenes/TerrainMassing";
import { largayRoute } from "./data/largay";
import { theme } from "./theme";

const FPS = 30;
const W = 1920;
const H = 1080;

/**
 * Corner-anchored label plates, matching the reference system: a small tracked
 * caps line above a heavy line, on a translucent dark plate with an accent
 * block. Two can sit on screen at once because they anchor to opposite corners.
 */
const Plate: React.FC<{
  corner: "bottom-left" | "top-right";
  kicker: string;
  title: string;
  accent?: string;
  appearSec?: number;
}> = ({ corner, kicker, title, accent = theme.color.amber, appearSec = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = interpolate(frame, [appearSec * fps, appearSec * fps + fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dx = interpolate(o, [0, 1], [corner === "bottom-left" ? -24 : 24, 0]);
  const right = corner === "top-right";

  return (
    <div
      style={{
        position: "absolute",
        ...(right ? { top: 72, right: 84 } : { bottom: 84, left: 84 }),
        display: "flex",
        alignItems: "stretch",
        flexDirection: right ? "row-reverse" : "row",
        gap: 14,
        opacity: o,
        transform: `translateX(${dx}px)`,
      }}
    >
      <div style={{ width: 6, background: accent }} />
      <div
        style={{
          background: "rgba(10,12,14,0.72)",
          padding: "12px 22px 14px",
          textAlign: right ? "right" : "left",
        }}
      >
        <div
          style={{
            fontFamily: theme.font.display,
            fontSize: theme.font.size.micro,
            letterSpacing: theme.font.trackingLabel,
            textTransform: "uppercase",
            color: theme.color.snowMuted,
            marginBottom: 4,
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            fontFamily: theme.font.display,
            fontSize: theme.font.size.title,
            fontWeight: theme.font.weight.bold,
            color: theme.color.snow,
            lineHeight: 1,
          }}
        >
          {title}
        </div>
      </div>
    </div>
  );
};

const LargayMassing: React.FC = () => (
  <AbsoluteFill>
    <TerrainMassing data={largayRoute} />
    <Plate corner="bottom-left" kicker="22 July 2013" title="Redington Twp." appearSec={0.8} />
    <Plate
      corner="top-right"
      kicker="Appalachian Trail"
      title="Section hiker"
      accent={theme.color.amber}
      appearSec={1.6}
    />
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="LargayMassing"
      component={LargayMassing}
      durationInFrames={FPS * 12}
      fps={FPS}
      width={W}
      height={H}
    />
  </>
);
