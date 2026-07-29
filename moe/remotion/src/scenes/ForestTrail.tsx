/**
 * ForestTrail — a real scene, built entirely in code.
 *
 * Dense conifer forest, a narrow footpath, and a lone figure walking away from
 * camera. Everything is geometry: instanced trees, a displaced ground mesh,
 * exponential fog for depth, and a figure assembled from primitives.
 *
 * Why the figure is distant and anonymous: partly craft — a silhouette at
 * distance reads as a person without needing a face we cannot procedurally
 * make — and partly the standing editorial rule that this is a real death with
 * a living family, so no recognisable likeness is ever rendered.
 */

import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";

import { theme } from "../theme";

/** Minimal geometry merge — avoids pulling in an addons dependency. */
function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  const pos: number[] = [];
  const norm: number[] = [];
  for (const g of geos) {
    const ng = g.index ? g.toNonIndexed() : g;
    pos.push(...Array.from(ng.attributes.position.array as Float32Array));
    ng.computeVertexNormals();
    norm.push(...Array.from(ng.attributes.normal.array as Float32Array));
  }
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(norm, 3));
  return out;
}

const rnd = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Gentle ground undulation. The path is carved slightly lower than around it. */
const groundHeight = (x: number, z: number) =>
  0.35 * Math.sin(x * 0.32 + 1.1) + 0.28 * Math.cos(z * 0.24) + 0.12 * Math.sin(z * 0.6 + x * 0.2);

/** Distance from the trail centreline, which snakes gently along +z. */
const trailX = (z: number) => 0.9 * Math.sin(z * 0.055) + 0.35 * Math.sin(z * 0.13 + 2.0);

const Ground: React.FC = () => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(160, 260, 180, 260);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const d = Math.abs(x - trailX(z));
      // carve the path: a shallow trough about 0.7 units wide
      const carve = d < 0.75 ? -0.09 * (1 - d / 0.75) : 0;
      pos.setY(i, groundHeight(x, z) + carve);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  // The path itself: a narrow ribbon following the centreline, laid just above
  // the carved trough so it reads as worn ground rather than painted-on.
  const path = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let z = -20; z <= 240; z += 2) {
      const x = trailX(z);
      pts.push(new THREE.Vector3(x, groundHeight(x, z) + 0.02, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const t = new THREE.TubeGeometry(curve, pts.length * 2, 0.42, 6, false);
    // Squash it flat — an unsquashed tube reads as a pipe lying in the forest.
    t.scale(1, 0.045, 1);
    return t;
  }, []);

  return (
    <>
      <mesh geometry={geo} receiveShadow>
        <meshStandardMaterial color="#2E3A31" roughness={1} metalness={0} />
      </mesh>
      <mesh geometry={path}>
        <meshStandardMaterial color="#4A4034" roughness={1} metalness={0} />
      </mesh>
    </>
  );
};

/** Low undergrowth so the forest floor isn't a bare plane. */
const Undergrowth: React.FC<{ count?: number; seed?: number }> = ({ count = 1400, seed = 31 }) => {
  const mesh = useMemo(() => {
    const r = rnd(seed * 613);
    const g = new THREE.ConeGeometry(0.3, 0.42, 5);
    const m = new THREE.InstancedMesh(
      g,
      new THREE.MeshStandardMaterial({ color: "#2A3627", roughness: 1, flatShading: true }),
      count
    );
    const mat = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    let placed = 0;
    let guard = 0;
    while (placed < count && guard++ < count * 10) {
      const z = -20 + r() * 240;
      const x = (r() - 0.5) * 110;
      if (Math.abs(x - trailX(z)) < 0.62) continue; // keep the path walkable
      const sc = 0.5 + r() * 1.5;
      q.setFromEuler(new THREE.Euler(0, r() * Math.PI * 2, (r() - 0.5) * 0.25));
      p.set(x, groundHeight(x, z) + sc * 0.16, z);
      s.set(sc, sc * (0.6 + r() * 0.8), sc);
      mat.compose(p, q, s);
      m.setMatrixAt(placed++, mat);
    }
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, [count, seed]);

  return <primitive object={mesh} />;
};

/** Conifers as two instanced meshes: trunks and foliage cones. */
const Trees: React.FC<{ count?: number; seed?: number }> = ({ count = 900, seed = 7 }) => {
  const { trunks, foliage } = useMemo(() => {
    const r = rnd(seed * 977);
    const trunkGeo = new THREE.CylinderGeometry(0.045, 0.085, 1, 5);
    // A single cone reads as a game asset. Three stacked, tapering tiers give a
    // conifer's actual stepped silhouette, which is what sells it at distance.
    const tiers: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) {
      const c = new THREE.ConeGeometry(0.66 - i * 0.17, 1.5 - i * 0.18, 7);
      c.translate(0, i * 0.62, 0);
      tiers.push(c);
    }
    const coneGeo = mergeGeometries(tiers);

    const tm = new THREE.InstancedMesh(
      trunkGeo,
      new THREE.MeshStandardMaterial({ color: "#241E1A", roughness: 1 }),
      count
    );
    const fm = new THREE.InstancedMesh(
      coneGeo,
      new THREE.MeshStandardMaterial({ color: "#243027", roughness: 1, flatShading: true }),
      count
    );

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();

    let placed = 0;
    let guard = 0;
    while (placed < count && guard++ < count * 12) {
      const z = -20 + r() * 240;
      const x = (r() - 0.5) * 130;
      // keep the path clear, but let trees crowd right up to its edge
      if (Math.abs(x - trailX(z)) < 1.25) continue;

      const y = groundHeight(x, z);
      const scale = 1.5 + r() * 2.9;
      const lean = (r() - 0.5) * 0.06;

      q.setFromEuler(new THREE.Euler(lean, r() * Math.PI * 2, lean * 0.6));

      p.set(x, y + scale * 0.5, z);
      s.set(1, scale, 1);
      m.compose(p, q, s);
      tm.setMatrixAt(placed, m);

      p.set(x, y + scale * 0.55 + scale * 0.62, z);
      s.set(scale * 0.5, scale * 0.72, scale * 0.5);
      m.compose(p, q, s);
      fm.setMatrixAt(placed, m);

      placed++;
    }
    tm.instanceMatrix.needsUpdate = true;
    fm.instanceMatrix.needsUpdate = true;
    return { trunks: tm, foliage: fm };
  }, [count, seed]);

  return (
    <>
      <primitive object={trunks} />
      <primitive object={foliage} />
    </>
  );
};

/**
 * The figure. Primitives only — head, torso, pack, legs — dark against the
 * fog. At this distance the silhouette is what carries it.
 */
const Figure: React.FC<{ z: number; stride: number }> = ({ z, stride }) => {
  const x = trailX(z);
  const y = groundHeight(x, z);
  const swing = Math.sin(stride) * 0.34;
  const bob = Math.abs(Math.sin(stride)) * 0.03;
  const body = "#1B1F22";

  return (
    <group position={[x, y + bob, z]} rotation={[0, Math.PI, 0]}>
      {/* legs */}
      <mesh position={[-0.07, 0.34, 0]} rotation={[swing, 0, 0]}>
        <capsuleGeometry args={[0.055, 0.5, 3, 6]} />
        <meshStandardMaterial color={body} roughness={1} />
      </mesh>
      <mesh position={[0.07, 0.34, 0]} rotation={[-swing, 0, 0]}>
        <capsuleGeometry args={[0.055, 0.5, 3, 6]} />
        <meshStandardMaterial color={body} roughness={1} />
      </mesh>
      {/* torso */}
      <mesh position={[0, 0.86, 0]}>
        <capsuleGeometry args={[0.115, 0.42, 4, 8]} />
        <meshStandardMaterial color={body} roughness={1} />
      </mesh>
      {/* pack — the one warm accent in the frame, so the eye finds her */}
      <mesh position={[0, 0.92, -0.13]}>
        <boxGeometry args={[0.26, 0.42, 0.17]} />
        <meshStandardMaterial color={theme.color.amber} roughness={0.85} />
      </mesh>
      {/* arms */}
      <mesh position={[-0.17, 0.86, 0]} rotation={[-swing * 0.7, 0, 0.14]}>
        <capsuleGeometry args={[0.042, 0.38, 3, 6]} />
        <meshStandardMaterial color={body} roughness={1} />
      </mesh>
      <mesh position={[0.17, 0.86, 0]} rotation={[swing * 0.7, 0, -0.14]}>
        <capsuleGeometry args={[0.042, 0.38, 3, 6]} />
        <meshStandardMaterial color={body} roughness={1} />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.19, 0]}>
        <sphereGeometry args={[0.088, 10, 8]} />
        <meshStandardMaterial color="#2A2622" roughness={1} />
      </mesh>
    </group>
  );
};

export const ForestTrail: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames, fps } = useVideoConfig();

  const t = frame / Math.max(1, durationInFrames - 1);

  // She walks away up the trail; the camera follows a little behind and lower,
  // drifting in. One slow continuous move — §4.4.
  const figureZ = 26 + t * 7;
  const camZ = figureZ - interpolate(t, [0, 1], [13, 10.2]);
  const camX = trailX(camZ) + interpolate(t, [0, 1], [1.5, 0.55]);
  const camY = groundHeight(camX, camZ) + interpolate(t, [0, 1], [2.35, 1.95]);

  const camera = useMemo(() => {
    const c = new THREE.PerspectiveCamera(42, width / height, 0.1, 400);
    c.position.set(camX, camY, camZ);
    const lx = trailX(figureZ);
    c.lookAt(lx, groundHeight(lx, figureZ) + 1.0, figureZ);
    c.updateMatrixWorld(true);
    c.updateProjectionMatrix();
    return c;
  }, [camX, camY, camZ, figureZ, width, height]);

  const fade = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fps * 0.5, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#8A949B" }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={camera}
        style={{ opacity: fade * fadeOut }}
      >
        {/* Overcast: a bright flat sky, strong aerial perspective, no sun disc.
            Fog does most of the work — it's what creates depth in a forest. */}
        <fogExp2 attach="fog" args={["#8A949B", 0.042]} />
        <ambientLight intensity={1.35} color="#AEB9C0" />
        <hemisphereLight args={["#C3CCD2", "#20281F", 1.5]} />
        <directionalLight position={[14, 26, 8]} intensity={1.5} color="#DCE4E8" />

        <Ground />
        <Trees count={1500} />
        <Undergrowth />
        <Figure z={figureZ} stride={frame * 0.34} />
      </ThreeCanvas>

      {/* Slight lift of the blacks + vignette so it sits in the channel's grade */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background:
            "radial-gradient(120% 110% at 50% 44%, transparent 42%, rgba(18,24,28,0.72) 100%)",
          opacity: fade * fadeOut,
        }}
      />
    </AbsoluteFill>
  );
};
