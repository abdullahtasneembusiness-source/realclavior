import React from "react";
import { AbsoluteFill, Composition } from "remotion";

import { TerrainMassing } from "./scenes/TerrainMassing";
import { ForestTrail } from "./scenes/ForestTrail";
import { largayRoute } from "./data/largay";
import { StillMotion, PortraitCard, CrossFade } from "./components/StillMotion";

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

/** A still, given life: slow push, grain, vignette, then a card resolves in. */
const StillShot: React.FC = () => (
  <CrossFade
    atSec={2.6}
    durSec={1.0}
    from={<StillMotion image="stills/01-trail-wide.jpg" direction="in" zoom={1.14} />}
    to={
      <StillMotion image="stills/01-trail-wide.jpg" direction="left" zoom={1.2} vignette={0.7}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <PortraitCard
            image="stills/01-trail-wide.jpg"
            name="Geraldine Largay"
            appearSec={3.4}
          />
        </AbsoluteFill>
      </StillMotion>
    }
  />
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="StillShot"
      component={StillShot}
      durationInFrames={FPS * 7}
      fps={FPS}
      width={1920}
      height={1080}
    />
    <Composition
      id="LargayMassing"
      component={LargayMassing}
      durationInFrames={FPS * 12}
      fps={FPS}
      width={1920}
      height={1080}
    />
    {/* A usable 5-second shot: she walks away up the trail. */}
    <Composition
      id="ForestTrail"
      component={ForestTrail}
      durationInFrames={FPS * 5}
      fps={FPS}
      width={1920}
      height={1080}
    />
  </>
);
