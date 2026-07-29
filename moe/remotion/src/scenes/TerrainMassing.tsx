/**
 * TerrainMassing — the reference video's aerial massing model, in our language.
 *
 * The technique being reproduced (see moe/REFERENCE-ANALYSIS.md §1.2):
 *   · the world rendered as simplified, deliberately unreal grey massing
 *   · everything muted except the one thing that matters
 *   · labels set IN 3D SPACE, lying on the geometry in perspective
 *   · a slow continuous camera move (§4.4 — no snap cuts, no overshoot)
 *
 * Everything here is geometry and data. Nothing is generated, nothing is
 * photographed, and it re-renders for free forever.
 *
 * Terrain note: with no offline DEM available, the height field is procedural
 * and seeded so it is reproducible frame to frame. `heightAt` is the single
 * place real elevation data slots in when we have it — nothing else changes.
 */

import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";

import { theme } from "../theme";
import type { RouteData } from "../data/largay";

/* ------------------------------------------------------------------ *
 * Terrain
 * ------------------------------------------------------------------ */

const GRID = 96; // mesh resolution
const SIZE = 20; // world units across

/** Seeded value noise — deterministic, so every render is identical. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeHeightField(seed: number) {
  const rnd = mulberry32(seed * 2654435761);
  const peaks = Array.from({ length: 7 }, () => ({
    x: (rnd() - 0.5) * SIZE * 1.1,
    z: (rnd() - 0.5) * SIZE * 1.1,
    amp: 1.4 + rnd() * 3.2,
    sig: 1.2 + rnd() * 2.4,
  }));
  return (x: number, z: number) => {
    let h = 0;
    for (const p of peaks) {
      const dx = x - p.x;
      const dz = z - p.z;
      h += p.amp * Math.exp(-(dx * dx + dz * dz) / (2 * p.sig * p.sig));
    }
    // low-frequency roughness so slopes aren't perfectly smooth bells
    h += 0.12 * Math.sin(x * 0.9 + 1.7) * Math.cos(z * 0.8 - 0.4);
    return h;
  };
}

/* ------------------------------------------------------------------ *
 * Scene contents
 * ------------------------------------------------------------------ */

const Terrain: React.FC<{ heightAt: (x: number, z: number) => number }> = ({ heightAt }) => {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, GRID, GRID);
    g.rotateX(-Math.PI / 2); // lie flat
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
    }
    g.computeVertexNormals();
    return g;
  }, [heightAt]);

  return (
    <>
      {/* Solid massing — inert granite, matte, no specular distraction.
          Flat shading is deliberate: facets read as a survey model, not scenery. */}
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial
          color={theme.color.graniteLight}
          roughness={0.95}
          metalness={0}
          flatShading
        />
      </mesh>
      {/* Wireframe overlay reads as survey contour without needing real contours */}
      <mesh geometry={geometry}>
        <meshBasicMaterial color={theme.color.sage} wireframe transparent opacity={0.22} />
      </mesh>
    </>
  );
};

/** The route, drawn as a tube so it holds weight at distance. */
const Route: React.FC<{
  points: THREE.Vector3[];
  progress: number;
  color: string;
}> = ({ points, progress, color }) => {
  const geo = useMemo(() => {
    const n = Math.max(2, Math.floor(points.length * progress));
    const curve = new THREE.CatmullRomCurve3(points.slice(0, n));
    return new THREE.TubeGeometry(curve, Math.max(8, n * 4), 0.045, 8, false);
  }, [points, progress]);

  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
};

/** A marker that sits on the terrain — a thin pillar plus a ground ring. */
const Marker: React.FC<{ at: THREE.Vector3; color: string; height?: number }> = ({
  at,
  color,
  height = 1.1,
}) => (
  <group position={[at.x, at.y, at.z]}>
    <mesh position={[0, height / 2, 0]}>
      <cylinderGeometry args={[0.018, 0.018, height, 8]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.16, 0.2, 32]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} />
    </mesh>
  </group>
);

/* ------------------------------------------------------------------ *
 * Composition
 * ------------------------------------------------------------------ */

export const TerrainMassing: React.FC<{ data: RouteData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames, fps } = useVideoConfig();

  const heightAt = useMemo(() => makeHeightField(data.terrainSeed), [data.terrainSeed]);

  // Project the route's normalised coordinates onto the terrain surface.
  const routePoints = useMemo(
    () =>
      data.route.map((p) => {
        const x = (p.x - 0.5) * SIZE * 0.8;
        const z = (p.z - 0.5) * SIZE * 0.8;
        return new THREE.Vector3(x, heightAt(x, z) + 0.05, z);
      }),
    [data.route, heightAt]
  );

  const t = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });

  // §4.4 — one slow continuous move. A gentle orbit that also descends.
  const angle = data.cameraStartAngle + t * data.cameraSweep;
  const radius = interpolate(t, [0, 1], [data.cameraRadius, data.cameraRadius * 0.82]);
  const camY = interpolate(t, [0, 1], [data.cameraHeight, data.cameraHeight * 0.72]);

  const routeProgress = interpolate(frame, [0, durationInFrames * 0.75], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  const camera = useMemo(() => {
    const c = new THREE.PerspectiveCamera(38, width / height, 0.1, 200);
    c.position.set(Math.cos(angle) * radius, camY, Math.sin(angle) * radius);
    c.lookAt(0, 0, 0);
    // Required before Vector3.project() — without it the view matrix is stale
    // and every projected label lands in the wrong place (or off-screen).
    c.updateMatrixWorld(true);
    c.updateProjectionMatrix();
    return c;
  }, [angle, radius, camY, width, height]);

  const fadeIn = interpolate(frame, [0, fps * 0.8], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.color.ground }}>
      <ThreeCanvas width={width} height={height} camera={camera} style={{ opacity: fadeIn }}>
        {/* Flat, directional, unromantic light. This is a model, not a landscape.
            Raked low so relief reads as form rather than a smooth blob. */}
        <ambientLight intensity={0.75} />
        <directionalLight position={[9, 7, 5]} intensity={2.1} />
        <directionalLight position={[-8, 5, -6]} intensity={0.5} color={theme.color.sage} />

        <Terrain heightAt={heightAt} />
        <Route points={routePoints} progress={routeProgress} color={theme.color.amber} />

        {data.markers.map((m, i) => {
          const idx = Math.min(routePoints.length - 1, Math.round(m.at * (routePoints.length - 1)));
          const p = routePoints[idx];
          const shown = routeProgress >= m.at;
          if (!shown) return null;
          return (
            <Marker
              key={i}
              at={p}
              color={m.kind === "divergence" ? theme.color.alarm : theme.color.amber}
              height={m.kind === "divergence" ? 1.6 : 1.0}
            />
          );
        })}
      </ThreeCanvas>

      {/* Labels are projected from the actual 3D marker positions, so each one
          names a thing that is visibly on screen and moves with it.
          A label that isn't pointing at something does not get to exist —
          that rule is what separates information from decoration. */}
      {data.markers.map((m, i) => {
        if (routeProgress < m.at) return null;
        const idx = Math.min(routePoints.length - 1, Math.round(m.at * (routePoints.length - 1)));
        const world = routePoints[idx].clone();
        world.y += m.kind === "divergence" ? 1.6 : 1.0;

        const ndc = world.project(camera);
        if (ndc.z > 1) return null; // behind camera
        const sx = (ndc.x * 0.5 + 0.5) * width;
        const sy = (-ndc.y * 0.5 + 0.5) * height;
        if (sx < 0 || sx > width || sy < 0 || sy > height) return null;

        const appear = interpolate(
          frame,
          [m.at * durationInFrames * 0.75, m.at * durationInFrames * 0.75 + fps * 0.4],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const isAlarm = m.kind === "divergence";

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: sx,
              top: sy,
              transform: "translate(10px, -100%)",
              opacity: appear,
              whiteSpace: "nowrap",
            }}
          >
            <div
              style={{
                fontFamily: theme.font.display,
                // §4.6 floor. Small and quiet — the geometry is the subject.
                fontSize: theme.minBodyPx + 2,
                fontWeight: theme.font.weight.semibold,
                color: isAlarm ? theme.color.alarm : theme.color.snow,
                textShadow: "0 1px 6px rgba(0,0,0,0.9)",
                lineHeight: 1.15,
              }}
            >
              {m.label}
            </div>
            {m.sublabel && (
              <div
                style={{
                  fontFamily: theme.font.mono,
                  fontSize: theme.font.size.micro,
                  color: theme.color.snowMuted,
                  textShadow: "0 1px 6px rgba(0,0,0,0.9)",
                }}
              >
                {m.sublabel}
              </div>
            )}
          </div>
        );
      })}

      {/* Tilt-shift + vignette: what makes this read as a MODEL of the event
          rather than a photograph of a place. Reference §1.6. */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background: `linear-gradient(to bottom, rgba(10,12,14,0.85) 0%, transparent 22%, transparent 74%, rgba(10,12,14,0.9) 100%)`,
          backdropFilter: "blur(2.5px)",
          WebkitBackdropFilter: "blur(2.5px)",
          maskImage:
            "linear-gradient(to bottom, black 0%, transparent 26%, transparent 70%, black 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, transparent 26%, transparent 70%, black 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background: `radial-gradient(120% 110% at 50% 45%, transparent 45%, rgba(6,8,10,0.85) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
