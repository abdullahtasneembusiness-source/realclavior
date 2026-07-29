/**
 * Episode data. A new story is new numbers in this shape — never new code
 * (CLAUDE.md §4.1).
 *
 * Route coordinates are normalised 0..1 in the x/z plane so the same component
 * serves a mountain in Nepal and a cave in Kentucky. Real lat/lng converts into
 * this space by the projector in lib/geo; the shape below is the reconstructed
 * Largay track, deliberately approximate until the Warden Service release
 * settles the exact distances (see moe/episodes/largay/sources.md).
 */

export interface RouteMarker {
  /** Fraction along the route, 0..1. */
  at: number;
  label: string;
  sublabel?: string;
  kind: "normal" | "caution" | "divergence";
}

export interface RouteData {
  title: string;
  subtitle?: string;
  terrainSeed: number;
  /** Normalised route points; x and z both 0..1. */
  route: { x: number; z: number }[];
  markers: RouteMarker[];
  cameraStartAngle: number;
  cameraSweep: number;
  cameraRadius: number;
  cameraHeight: number;
}

export const largayRoute: RouteData = {
  title: "Redington Township",
  subtitle: "Reconstruction · July 2013",
  terrainSeed: 1307,

  // The AT corridor runs roughly north; she leaves it and drifts east, then
  // climbs to the knoll where she made camp.
  route: [
    { x: 0.32, z: 0.86 },
    { x: 0.34, z: 0.78 },
    { x: 0.36, z: 0.7 },
    { x: 0.38, z: 0.62 }, // ← the step-off point
    { x: 0.44, z: 0.585 },
    { x: 0.5, z: 0.56 },
    { x: 0.55, z: 0.52 },
    { x: 0.6, z: 0.47 },
    { x: 0.64, z: 0.41 },
    { x: 0.67, z: 0.35 }, // ← the climb for signal
    { x: 0.69, z: 0.3 },
    { x: 0.7, z: 0.26 }, // ← the camp
  ],

  markers: [
    { at: 0.0, label: "On trail", sublabel: "06:00, 22 July", kind: "normal" },
    { at: 0.27, label: "Steps off trail", sublabel: "cannot relocate it", kind: "divergence" },
    { at: 0.55, label: "11:01 — text sent", sublabel: "never delivered", kind: "caution" },
    { at: 0.82, label: "Climbs for signal", sublabel: "moving away from the corridor", kind: "caution" },
    { at: 1.0, label: "Camp", sublabel: "stays put, as advised", kind: "normal" },
  ],

  cameraStartAngle: -0.7,
  cameraSweep: 0.5,
  cameraRadius: 24,
  cameraHeight: 19,
};
