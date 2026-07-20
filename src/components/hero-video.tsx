"use client";

import { useRef, useState } from "react";

/**
 * The landing hero's ambient product-demo video. Autoplay requires muted +
 * playsInline (iOS refuses inline autoplay without both), loop keeps it ambient,
 * and the poster (the video's first frame) paints instantly so there's never a
 * blank/black flash. If the video fails to load for any reason we fall back to
 * the poster as a static image, so the hero never looks broken.
 *
 * React quirk: the `muted` prop isn't always serialized into SSR markup, which
 * can block autoplay before hydration — the ref callback re-asserts it on the
 * real element, belt and suspenders.
 *
 * Sources: WebM (VP9, ~2 MB) first for browsers that support it, MP4 (H.264,
 * ~4.3 MB, faststart) as the universal fallback. Both stream progressively and
 * never block the page render.
 */
export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(true);

  if (failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/clovior-demo-poster.jpg"
        alt="Clovior product demo"
        className="block w-full"
        style={{ aspectRatio: "16 / 9" }}
      />
    );
  }

  return (
    <div className="relative">
      <video
        ref={(el) => {
          videoRef.current = el;
          if (el) el.muted = muted;
        }}
        className="block w-full"
        style={{ aspectRatio: "16 / 9" }}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/clovior-demo-poster.jpg"
        onError={() => setFailed(true)}
        aria-label="Clovior product demo video"
      >
        <source src="/clovior-demo.webm" type="video/webm" />
        <source src="/clovior-demo.mp4" type="video/mp4" />
      </video>

      {/* The demo has an understated soundtrack; default stays muted (autoplay
          requires it) with a quiet corner toggle for anyone who wants it. */}
      <button
        type="button"
        aria-label={muted ? "Unmute demo video" : "Mute demo video"}
        onClick={() => {
          const v = videoRef.current;
          if (!v) return;
          v.muted = !muted;
          setMuted(!muted);
        }}
        className="absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-full border border-border bg-background/85 text-foreground opacity-70 backdrop-blur transition-opacity hover:opacity-100"
      >
        {muted ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M11 5 6 9H2v6h4l5 4V5Z" />
            <line x1="22" x2="16" y1="9" y2="15" />
            <line x1="16" x2="22" y1="9" y2="15" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M11 5 6 9H2v6h4l5 4V5Z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
      </button>
    </div>
  );
}
