/**
 * Transitions with actual movement.
 *
 * A crossfade is what you use when you have not decided how two shots relate.
 * These each carry a direction and a shape, which is what makes a cut feel
 * authored rather than defaulted.
 *
 * All of them are free to run and free to retune, so pacing gets iterated
 * locally rather than by regenerating anything.
 */

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { theme } from "../theme";

type Kids = React.ReactNode;

// Long, gentle ease. Slow to leave, slow to arrive, no overshoot (§4.4).
// The previous curve was firm and read as snappy; this one glides.
const ease = Easing.bezier(0.4, 0.0, 0.15, 1.0);
/** Even softer, for anything that should feel like it settles rather than moves. */
const easeSoft = Easing.inOut(Easing.ease);

/**
 * A hard band sweeps across and the new shot is revealed behind it. The band
 * itself is visible — that is what makes it read as a deliberate wipe.
 */
export const BandWipe: React.FC<{
  from: Kids;
  to: Kids;
  atSec: number;
  durSec?: number;
  direction?: "left" | "right";
  bandColor?: string;
}> = ({ from, to, atSec, durSec = 1.4, direction = "right", bandColor = theme.color.red }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [atSec * fps, (atSec + durSec) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

  const rev = direction === "right";
  // Reveal edge travels 0 → 100%; the band rides just ahead of it.
  const edge = p * 100;
  const clipTo = rev
    ? `inset(0 ${100 - edge}% 0 0)`
    : `inset(0 0 0 ${100 - edge}%)`;

  return (
    <AbsoluteFill>
      <AbsoluteFill>{from}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: clipTo, WebkitClipPath: clipTo }}>{to}</AbsoluteFill>
      {p > 0 && p < 1 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            [rev ? "left" : "right"]: `${edge}%`,
            width: 4,
            background: bandColor,
            transform: "translateX(-50%)",
          }}
        />
      )}
    </AbsoluteFill>
  );
};

/**
 * The outgoing shot accelerates toward camera and blurs out; the incoming
 * settles back from slightly too close. Reads as a push through.
 */
export const PushThrough: React.FC<{
  from: Kids;
  to: Kids;
  atSec: number;
  durSec?: number;
}> = ({ from, to, atSec, durSec = 1.3 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [atSec * fps, (atSec + durSec) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.color.ground, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${1 + p * 0.32})`,
          filter: `blur(${p * 14}px)`,
          opacity: 1 - p,
        }}
      >
        {from}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `scale(${1.22 - p * 0.22})`,
          filter: `blur(${(1 - p) * 12}px)`,
          opacity: p,
        }}
      >
        {to}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * The frame splits horizontally and opens, revealing what is behind. Good for
 * a reveal that should feel like something being uncovered.
 */
export const SplitOpen: React.FC<{
  from: Kids;
  to: Kids;
  atSec: number;
  durSec?: number;
}> = ({ from, to, atSec, durSec = 1.5 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [atSec * fps, (atSec + durSec) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const shift = p * 55;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.color.ground, overflow: "hidden" }}>
      <AbsoluteFill>{to}</AbsoluteFill>
      <AbsoluteFill
        style={{
          clipPath: "inset(0 0 50% 0)",
          transform: `translateY(-${shift}%)`,
        }}
      >
        {from}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          clipPath: "inset(50% 0 0 0)",
          transform: `translateY(${shift}%)`,
        }}
      >
        {from}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * A photo card arriving on a dark ground — the reference's register.
 * The card scales up from slightly small while a clip reveals it upward, so it
 * feels placed rather than faded on.
 */
export const CardIn: React.FC<{
  atSec: number;
  durSec?: number;
  children: Kids;
  delayIndex?: number;
}> = ({ atSec, durSec = 1.3, children, delayIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = (atSec + delayIndex * 0.32) * fps;
  const p = interpolate(frame, [start, start + durSec * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeSoft,
  });

  return (
    <div
      style={{
        opacity: interpolate(p, [0, 0.55], [0, 1], { extrapolateRight: "clamp" }),
        transform: `scale(${0.96 + p * 0.04}) translateY(${(1 - p) * 44}px)`,
        clipPath: `inset(${(1 - p) * 100}% 0 0 0)`,
        WebkitClipPath: `inset(${(1 - p) * 100}% 0 0 0)`,
      }}
    >
      {children}
    </div>
  );
};


/**
 * Rise and fade — the incoming shot lifts gently into place while the outgoing
 * settles down and away. The softest transition in the set; use it where the
 * narration is quiet and a cut would feel like an interruption.
 */
export const RiseIn: React.FC<{
  from: Kids;
  to: Kids;
  atSec: number;
  durSec?: number;
  /** How far the incoming shot travels, in percent of frame height. */
  travel?: number;
}> = ({ from, to, atSec, durSec = 1.6, travel = 6 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [atSec * fps, (atSec + durSec) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeSoft,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.color.ground, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          opacity: 1 - p,
          transform: `translateY(${p * travel * 0.4}%) scale(${1 - p * 0.02})`,
        }}
      >
        {from}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          opacity: p,
          transform: `translateY(${(1 - p) * travel}%) scale(${1.02 - p * 0.02})`,
        }}
      >
        {to}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
