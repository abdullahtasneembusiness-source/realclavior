"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { checkDueLaunches } from "./actions";

/**
 * Fires the catch-up spawn once when the launches area is opened: any armed launch
 * whose start date has arrived goes live. Stand-in for the daily cron that would
 * normally do this (see BUILD_LOG). Refreshes so newly-spawned runs show immediately.
 */
export function DueCheck({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      await checkDueLaunches(workspaceId);
      router.refresh();
    })();
  }, [workspaceId, router]);

  return null;
}
