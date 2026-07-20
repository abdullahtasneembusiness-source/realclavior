"use client";

import { useEffect, useState } from "react";

/**
 * Counts up to `value` over ~650ms with an ease-out curve — the Command View stat
 * tiles tick to life instead of just appearing. Server HTML renders 0 and the count
 * plays on hydration; reduced-motion users (and zero values) get the number instantly.
 */
export function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (
      value === 0 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 650;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{display}</>;
}
