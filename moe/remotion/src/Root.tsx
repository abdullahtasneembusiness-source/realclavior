import React from "react";
import { AbsoluteFill, Composition } from "remotion";

import { TerrainMassing } from "./scenes/TerrainMassing";
import { ForestTrail } from "./scenes/ForestTrail";
import { largayRoute } from "./data/largay";
import { StillMotion, PortraitCard } from "./components/StillMotion";
import { BandWipe, PushThrough, CardIn } from "./components/Transitions";
import { theme } from "./theme";

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

/** Photo cards arriving on a dark ground — the reference's register. */
const CardScene: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: "#0A0C0E",
      alignItems: "center",
      justifyContent: "center",
      gap: 64,
      flexDirection: "row",
    }}
  >
    <CardIn atSec={0.2} delayIndex={0}>
      <PortraitCard image="stills/01-trail-wide.jpg" name="Geraldine Largay" />
    </CardIn>
    <CardIn atSec={0.2} delayIndex={1}>
      <PortraitCard
        image="stills/01-trail-wide.jpg"
        name="The trail"
        face={{ x: 0.5, y: 0.5, r: 0.0 }}
      />
    </CardIn>
  </AbsoluteFill>
);

/** A still, given life, handed on with transitions that actually move. */
const StillShot: React.FC = () => (
  <PushThrough
    atSec={4.6}
    durSec={0.7}
    from={
      <BandWipe
        atSec={2.4}
        durSec={0.7}
        direction="right"
        from={<StillMotion image="stills/01-trail-wide.jpg" direction="in" zoom={1.14} />}
        to={<StillMotion image="stills/01-trail-wide.jpg" direction="left" zoom={1.22} vignette={0.72} />}
      />
    }
    to={<CardScene />}
  />
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="StillShot"
      component={StillShot}
      durationInFrames={FPS * 8}
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
