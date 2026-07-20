import React from "react";
import {
  AbsoluteFill,
  Audio,
  Composition,
  Sequence,
  interpolate,
  staticFile,
} from "remotion";
import { Scene1, Scene2, Scene3, Scene4, Scene5 } from "./scenes";
import { C } from "./theme";

/**
 * ClovorDemo — 45.6s product demo synced to a ~100 BPM ambient track.
 * 1920x1080 @ 30fps = 1368 frames. Beat = 18 frames, bar (4 beats) = 72 frames;
 * every scene boundary lands on a bar:
 *   Scene 1  0–216     (bars 0–3)   Describe how you work
 *   Scene 2  216–432   (bars 3–6)   Hand-off
 *   Scene 3  432–864   (bars 6–12)  The operator runs it
 *   Scene 4  864–1152  (bars 12–16) Correct once
 *   Scene 5  1152–1368 (bars 16–19) It sticks + end card
 */
const DURATION = 1368;

const Demo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/*
        Soundtrack (video/public/soundtrack.mp3). The track is longer than the video,
        so it's trimmed at the video's end — softly, via the 1s volume fade-out below,
        never an abrupt cut. Fade-in ~0.5s (15 frames), fade-out ~1s (30 frames).
      */}
      <Audio
        src={staticFile("soundtrack.mp3")}
        volume={(f) =>
          interpolate(f, [0, 15, DURATION - 30, DURATION], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
      <Sequence from={0} durationInFrames={216}>
        <Scene1 />
      </Sequence>
      <Sequence from={216} durationInFrames={216}>
        <Scene2 />
      </Sequence>
      <Sequence from={432} durationInFrames={432}>
        <Scene3 />
      </Sequence>
      <Sequence from={864} durationInFrames={288}>
        <Scene4 />
      </Sequence>
      <Sequence from={1152} durationInFrames={216}>
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
      durationInFrames={DURATION}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
