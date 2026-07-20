import React from "react";
import { AbsoluteFill, Composition, Sequence } from "remotion";
import { Scene1, Scene2, Scene3, Scene4, Scene5 } from "./scenes";
import { C } from "./theme";

/**
 * ClovorDemo — 45s product demo. 1920x1080 @ 30fps = 1350 frames.
 *   Scene 1  0–210    Describe how you work
 *   Scene 2  210–420  Hand-off
 *   Scene 3  420–840  The operator runs it
 *   Scene 4  840–1140 Correct once
 *   Scene 5  1140–1350 It sticks + end card
 */
const Demo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/*
        AUDIO SLOT — the video stands alone silent. To add a soundtrack later:
        put the file at video/public/soundtrack.mp3 and uncomment:

          import { Audio, staticFile } from "remotion";
          <Audio src={staticFile("soundtrack.mp3")} />
      */}
      <Sequence from={0} durationInFrames={210}>
        <Scene1 />
      </Sequence>
      <Sequence from={210} durationInFrames={210}>
        <Scene2 />
      </Sequence>
      <Sequence from={420} durationInFrames={420}>
        <Scene3 />
      </Sequence>
      <Sequence from={840} durationInFrames={300}>
        <Scene4 />
      </Sequence>
      <Sequence from={1140} durationInFrames={210}>
        <Scene5 />
      </Sequence>
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ClovorDemo"
      component={Demo}
      durationInFrames={1350}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
