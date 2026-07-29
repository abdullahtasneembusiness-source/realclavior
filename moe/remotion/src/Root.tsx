import React from "react";
import { AbsoluteFill, Composition } from "remotion";

import { TerrainMassing } from "./scenes/TerrainMassing";
import { largayRoute } from "./data/largay";

const FPS = 30;

/**
 * No corner banners, no accent bars, no chrome.
 *
 * The reference is frames, motion, voiceover and music — nothing else. Every
 * decorative overlay we add is a signal that the video was assembled from a
 * template rather than authored. Labels live in the scene, attached to the
 * things they name (see TerrainMassing), and nothing else is permitted on top.
 */
const LargayMassing: React.FC = () => (
  <AbsoluteFill>
    <TerrainMassing data={largayRoute} />
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <Composition
    id="LargayMassing"
    component={LargayMassing}
    durationInFrames={FPS * 12}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
