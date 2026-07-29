/**
 * Design tokens — the whole channel's look, per CLAUDE.md §4.3.
 * No hex values are permitted inside components; they all come from here.
 *
 * Palette is cold and forensic. Red is never decorative: it is reserved
 * exclusively for the moment things go wrong.
 */

export const theme = {
  color: {
    /** Near-black ground. Everything sits on this. */
    ground: "#0A0C0E",
    groundLift: "#12161A",

    /** Granite mid-tones — the massing model. Deliberately inert. */
    granite: "#3A4248",
    graniteLight: "#4E585F",
    graniteDark: "#232A2F",

    /** Muted sage — contour lines, grid, secondary geometry. */
    sage: "#6E7F70",
    sageFaint: "rgba(110, 127, 112, 0.35)",

    /** Snow-white — primary text. */
    snow: "#F2F5F7",
    snowMuted: "rgba(242, 245, 247, 0.62)",
    snowFaint: "rgba(242, 245, 247, 0.3)",

    /** The single signal colour. Route, subject, the thing to watch. */
    amber: "#E9A23B",
    amberGlow: "rgba(233, 162, 59, 0.45)",

    /** Desaturated red — the moment of divergence, and nothing else. */
    alarm: "#B84A42",
  },

  font: {
    /** Stencil-ish caps for primary labels. System stack keeps setup at zero. */
    display: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    size: {
      micro: 20,
      caption: 26,
      label: 34,
      body: 40,
      title: 62,
      display: 92,
    },
    weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
    trackingLabel: 3.5,
  },

  /** §4.6 legibility floor — body text never below this at 1080p. */
  minBodyPx: 28,

  motion: {
    /** §4.4 — slow, continuous, never overshooting. */
    cameraSecPerShot: 8,
    fadeSec: 0.6,
  },
} as const;

export type Theme = typeof theme;
