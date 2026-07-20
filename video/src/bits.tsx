import React from "react";
import { interpolate, random, useCurrentFrame } from "remotion";
import { C, F, monoLabel } from "./theme";

/* ---------- Text that types itself, with human variance ---------- */

export const TypeText: React.FC<{
  text: string;
  /** Scene-local frame typing starts. */
  start: number;
  /** Base frames per character (0.5 ≈ 60cps, 1.5 ≈ 20cps). */
  fpc?: number;
  seed?: string;
  style?: React.CSSProperties;
  caret?: boolean;
}> = ({ text, start, fpc = 1.4, seed = "t", style, caret = true }) => {
  const frame = useCurrentFrame();
  // Deterministic per-character timing with a little jitter so it reads as human.
  let t = start;
  let visible = 0;
  let done = true;
  for (let i = 0; i < text.length; i++) {
    t += fpc * (0.6 + random(`${seed}-${i}`) * 0.9);
    if (frame >= t) visible = i + 1;
    else {
      done = false;
      break;
    }
  }
  if (visible === text.length) done = true;
  const typing = frame >= start && !done;
  return (
    <span style={style}>
      {text.slice(0, visible)}
      {caret && typing ? (
        <span
          style={{
            display: "inline-block",
            width: 2,
            height: "1em",
            background: C.ink,
            verticalAlign: "text-bottom",
            marginLeft: 1,
          }}
        />
      ) : null}
    </span>
  );
};

/** Frame at which a TypeText with the same params finishes. */
export function typeEnd(text: string, start: number, fpc = 1.4, seed = "t"): number {
  let t = start;
  for (let i = 0; i < text.length; i++) {
    t += fpc * (0.6 + random(`${seed}-${i}`) * 0.9);
  }
  return Math.ceil(t);
}

/* ---------- Simple fade/rise-in for content ---------- */

export const Rise: React.FC<{
  at: number;
  children: React.ReactNode;
  dur?: number;
  dy?: number;
  style?: React.CSSProperties;
}> = ({ at, children, dur = 9, dy = 10, style }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [at, at + dur], [dy, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ opacity: o, transform: `translateY(${y}px)`, ...style }}>{children}</div>
  );
};

/* ---------- App chrome: sidebar + canvas, faithful to the real shell ---------- */

const NavRow: React.FC<{ label: string; active?: boolean }> = ({ label, active }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 14px",
      borderRadius: 8,
      background: active ? C.muted : "transparent",
      color: active ? C.ink : C.sub,
      fontFamily: F.body,
      fontSize: 17,
      fontWeight: 500,
    }}
  >
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: 2.5,
        background: active ? C.green : "#C9C8C0",
      }}
    />
    {label}
  </div>
);

export const AppFrame: React.FC<{
  variant: "admin" | "operator";
  active: string;
  userName: string;
  userInitial: string;
  userColor?: string;
  children: React.ReactNode;
}> = ({ variant, active, userName, userInitial, userColor = C.green, children }) => {
  const nav =
    variant === "admin"
      ? {
          workspace: ["Command View", "Playbooks", "Team", "Goals"],
          growth: ["Brain", "Launches"],
        }
      : { workspace: ["Home", "Brain"], growth: [] as string[] };
  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: C.bg,
        display: "flex",
        fontFamily: F.body,
        color: C.ink,
      }}
    >
      <aside
        style={{
          width: 300,
          background: C.card,
          borderRight: `1px solid ${C.border}`,
          padding: "26px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 6px" }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: C.green,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: F.mono,
              fontSize: 17,
              fontWeight: 600,
            }}
          >
            A
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>Abdullah&apos;s Team</div>
            <div style={monoLabel(11)}>{variant === "admin" ? "Founder" : "Operator"}</div>
          </div>
        </div>
        <div>
          <div style={{ ...monoLabel(11), padding: "0 6px", marginBottom: 8 }}>Workspace</div>
          {nav.workspace.map((n) => (
            <NavRow key={n} label={n} active={n === active} />
          ))}
        </div>
        {nav.growth.length > 0 ? (
          <div>
            <div style={{ ...monoLabel(11), padding: "0 6px", marginBottom: 8 }}>Growth</div>
            {nav.growth.map((n) => (
              <NavRow key={n} label={n} active={n === active} />
            ))}
          </div>
        ) : null}
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 12, padding: "0 6px" }}>
          <Avatar initial={userInitial} color={userColor} size={34} />
          <div style={{ fontSize: 16, fontWeight: 500 }}>{userName}</div>
        </div>
      </aside>
      <main style={{ position: "relative", flex: 1 }}>{children}</main>
    </div>
  );
};

/* ---------- Primitives ---------- */

export const Avatar: React.FC<{ initial: string; color: string; size?: number }> = ({
  initial,
  color,
  size = 30,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: color,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: F.mono,
      fontSize: size * 0.46,
      fontWeight: 600,
      flexShrink: 0,
    }}
  >
    {initial}
  </div>
);

export const Card: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({
  style,
  children,
}) => (
  <div
    style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      boxShadow: "0 1px 2px rgba(22,21,15,0.04)",
      ...style,
    }}
  >
    {children}
  </div>
);

export const GreenButton: React.FC<{
  label: string;
  style?: React.CSSProperties;
  pressedAt?: number | null;
  outline?: boolean;
}> = ({ label, style, pressedAt = null, outline }) => {
  const frame = useCurrentFrame();
  const pressed =
    pressedAt !== null && frame >= pressedAt && frame <= pressedAt + 6;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 26px",
        height: 54,
        borderRadius: 6,
        background: outline ? C.card : pressed ? C.greenHover : C.green,
        color: outline ? C.ink : "#fff",
        border: outline ? `1px solid ${C.border}` : "none",
        fontFamily: F.body,
        fontSize: 19,
        fontWeight: 500,
        transform: pressed ? "scale(0.97)" : "scale(1)",
        ...style,
      }}
    >
      {label}
    </div>
  );
};

/** Checkbox that fills (≈150ms) then draws its checkmark in. */
export const CheckBox: React.FC<{ checkedAt: number | null; size?: number }> = ({
  checkedAt,
  size = 30,
}) => {
  const frame = useCurrentFrame();
  const on = checkedAt !== null && frame >= checkedAt;
  const fill = on
    ? interpolate(frame, [checkedAt!, checkedAt! + 5], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const draw = on
    ? interpolate(frame, [checkedAt! + 3, checkedAt! + 9], [24, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 24;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 7,
        border: `2px solid ${fill > 0 ? C.green : "#C9C8C0"}`,
        background: `rgba(31,61,43,${fill})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 20 20">
        <path
          d="M4 10.5 L8.5 15 L16 5.5"
          fill="none"
          stroke="#fff"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={24}
          strokeDashoffset={draw}
        />
      </svg>
    </div>
  );
};

/** The amber Feedback Memory panel — the ONLY place amber appears. */
export const FeedbackPanel: React.FC<{
  notes: { text: string; isNew?: boolean }[];
  style?: React.CSSProperties;
}> = ({ notes, style }) => (
  <div
    style={{
      background: "rgba(232,163,23,0.10)",
      border: `1px solid rgba(232,163,23,0.45)`,
      borderRadius: 10,
      padding: "22px 26px",
      ...style,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.amber }} />
      <span style={{ ...monoLabel(13), color: "#8A6414" }}>Before you start</span>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {notes.map((n) => (
        <div key={n.text} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          {n.isNew ? (
            <span
              style={{
                ...monoLabel(11),
                color: "#8A6414",
                border: "1px solid rgba(232,163,23,0.5)",
                borderRadius: 4,
                padding: "2px 7px",
                marginTop: 3,
              }}
            >
              New
            </span>
          ) : null}
          <span style={{ fontFamily: F.body, fontSize: 21, lineHeight: 1.45, color: C.ink }}>
            {n.text}
          </span>
        </div>
      ))}
    </div>
    <div style={{ ...monoLabel(11), color: "#8A6414", marginTop: 14 }}>
      Shows first, every run
    </div>
  </div>
);

/* ---------- Lower-third overlay ---------- */

export const Overlay: React.FC<{ text: string; at: number; hold?: number }> = ({
  text,
  at,
  hold = 60,
}) => {
  const frame = useCurrentFrame();
  const inEnd = at + 9;
  const outStart = at + 9 + hold;
  const o = interpolate(frame, [at, inEnd, outStart, outStart + 8], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [at, inEnd], [14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 64,
        display: "flex",
        justifyContent: "center",
        opacity: o,
        transform: `translateY(${y}px)`,
        zIndex: 80,
      }}
    >
      <div
        style={{
          background: "rgba(250,250,247,0.88)",
          backdropFilter: "blur(10px)",
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "16px 34px",
          fontFamily: F.display,
          fontWeight: 600,
          fontSize: 36,
          letterSpacing: "-0.02em",
          color: C.ink,
          boxShadow: "0 12px 32px -16px rgba(22,21,15,0.25)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

/* ---------- Scene wrapper: soft cross-fade at both ends ---------- */

export const SceneFade: React.FC<{
  dur: number;
  fadeIn?: boolean;
  fadeOut?: boolean;
  children: React.ReactNode;
}> = ({ dur, fadeIn = true, fadeOut = true, children }) => {
  const frame = useCurrentFrame();
  let o = 1;
  if (fadeIn) o *= interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  if (fadeOut)
    o *= interpolate(frame, [dur - 8, dur], [1, 0], { extrapolateLeft: "clamp" });
  return <div style={{ position: "absolute", inset: 0, opacity: o }}>{children}</div>;
};
