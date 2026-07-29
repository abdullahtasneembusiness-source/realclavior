/**
 * Giving a still image life.
 *
 * A generated frame is static; these components are what turn it into a shot.
 * Nothing here costs anything to run, so motion, transitions and treatments are
 * all iterated locally rather than regenerated.
 *
 *   StillMotion   — slow push / pan across an image, with grain and vignette
 *   PortraitCard  — a person card with the face obscured and a name beneath
 *   CrossFade     — one still handing over to the next
 */

import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

import { theme } from "../theme";

const src = (p: string) => (/^https?:\/\//.test(p) ? p : staticFile(p));

export type MoveDirection = "in" | "out" | "left" | "right" | "up" | "down";

/**
 * Slow continuous move across a still. §4.4: nothing bounces, nothing
 * overshoots — a document, not a title sequence.
 *
 * `zoom` is the total scale travelled over the shot. Because generated stills
 * come back at roughly 1344x768, the base scale is already above 1 so a push
 * never reveals an edge and never samples beyond the source resolution.
 */
export const StillMotion: React.FC<{
  image: string;
  direction?: MoveDirection;
  zoom?: number;
  /** 0..1 — how strongly the vignette closes the frame. */
  vignette?: number;
  children?: React.ReactNode;
}> = ({ image, direction = "in", zoom = 1.1, vignette = 0.55, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const t = interpolate(frame, [0, durationInFrames - 1], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });

  // Overscan so a pan never exposes the edge of the image.
  const base = 1.06;
  const scale =
    direction === "in"
      ? base * interpolate(t, [0, 1], [1, zoom])
      : direction === "out"
        ? base * interpolate(t, [0, 1], [zoom, 1])
        : base * zoom;

  const travel = 3.2; // percent of frame travelled on a lateral move
  const tx =
    direction === "left" ? interpolate(t, [0, 1], [travel, -travel])
    : direction === "right" ? interpolate(t, [0, 1], [-travel, travel])
    : 0;
  const ty =
    direction === "up" ? interpolate(t, [0, 1], [travel, -travel])
    : direction === "down" ? interpolate(t, [0, 1], [-travel, travel])
    : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.color.ground, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) translate(${tx}%, ${ty}%)`,
          transformOrigin: "50% 50%",
        }}
      >
        <Img src={src(image)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>

      {/* Grain. Generated stills are too clean; a little noise binds them to the
          diagram footage and hides upscaling softness. */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          opacity: 0.06,
          mixBlendMode: "overlay",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background: `radial-gradient(115% 105% at 50% 48%, transparent 42%, rgba(8,10,12,${vignette}) 100%)`,
        }}
      />

      {children}
    </AbsoluteFill>
  );
};

/**
 * A person card. The face is deliberately obscured and the card is captioned
 * as a reconstruction.
 *
 * These figures are generated stand-ins, not photographs of the people
 * involved. Obscuring the face and saying "reconstruction" on the card is what
 * keeps that honest — a viewer must never come away believing they have seen a
 * real photograph of someone who died.
 */
export const PortraitCard: React.FC<{
  image: string;
  name: string;
  /** Face position as a fraction of the card, for the obscuring pass. */
  face?: { x: number; y: number; r: number };
  appearSec?: number;
  width?: number;
}> = ({ image, name, face = { x: 0.5, y: 0.34, r: 0.17 }, appearSec = 0, width = 460 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(
    frame,
    [appearSec * fps, appearSec * fps + fps * 0.6],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );
  const h = width * 1.28;

  return (
    <div style={{ opacity: enter, transform: `translateY(${(1 - enter) * 18}px)` }}>
      <div
        style={{
          width,
          height: h,
          borderRadius: 26,
          overflow: "hidden",
          position: "relative",
          filter: "saturate(0.72) contrast(1.04)",
        }}
      >
        <Img src={src(image)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {/* Face obscured — a heavy local blur, feathered so it reads as a
            treatment rather than a censorship box. */}
        <div
          style={{
            position: "absolute",
            left: `${(face.x - face.r) * 100}%`,
            top: `${(face.y - face.r) * 100}%`,
            width: `${face.r * 200}%`,
            height: `${face.r * 200}%`,
            backdropFilter: "blur(26px)",
            WebkitBackdropFilter: "blur(26px)",
            borderRadius: "50%",
            maskImage: "radial-gradient(circle, black 52%, transparent 72%)",
            WebkitMaskImage: "radial-gradient(circle, black 52%, transparent 72%)",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 14,
          textAlign: "center",
          fontFamily: theme.font.display,
          fontSize: theme.font.size.label,
          fontWeight: theme.font.weight.bold,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: theme.color.snow,
        }}
      >
        {name}
      </div>
      <div
        style={{
          marginTop: 4,
          textAlign: "center",
          fontFamily: theme.font.mono,
          fontSize: theme.minBodyPx,
          color: theme.color.snowFaint,
          letterSpacing: 1,
        }}
      >
        reconstruction
      </div>
    </div>
  );
};

/** One still handing over to the next. */
export const CrossFade: React.FC<{
  from: React.ReactNode;
  to: React.ReactNode;
  atSec: number;
  durSec?: number;
}> = ({ from, to, atSec, durSec = 0.9 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [atSec * fps, (atSec + durSec) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 1 - p }}>{from}</AbsoluteFill>
      <AbsoluteFill style={{ opacity: p }}>{to}</AbsoluteFill>
    </AbsoluteFill>
  );
};
