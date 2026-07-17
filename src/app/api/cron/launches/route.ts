import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { spawnLaunch } from "@/lib/launches";
import type { Launch } from "@/types/db";

/**
 * GET /api/cron/launches — the daily job that makes launches fire on their own.
 *
 * It finds every armed launch whose start date has arrived (across ALL workspaces) and
 * spawns its runs, flipping it live — so a launch scheduled for next Monday goes out on
 * Monday whether or not anyone opens the app. Without this, spawning only happened when a
 * founder loaded the launches page (the opportunistic checkDueLaunches catch-up).
 *
 * Auth: Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. We reject
 * anything else so the public can't trigger it, and fail closed when the secret is unset.
 * Uses the service-role client (bypasses RLS to see all workspaces); spawnLaunch is
 * idempotent, so a retried or overlapping run never double-spawns.
 */

export const dynamic = "force-dynamic";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // No secret configured → refuse, never run wide open.
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Armed, non-template launches whose day has come. Null start_date rows (templates,
  // undated drafts) are excluded by the date comparison; the filters make it explicit.
  const { data: dueRows, error } = await supabase
    .from("launches")
    .select("*")
    .eq("status", "armed")
    .eq("is_template", false)
    .lte("start_date", today());

  if (error) {
    return NextResponse.json(
      { error: "Couldn't read due launches." },
      { status: 500 },
    );
  }

  const due = (dueRows ?? []) as Launch[];
  // eslint-disable-next-line no-console
  console.error(
    `[cron] due=${due.length} ids=${due.map((d) => `${d.id}:${d.status}:${d.start_date}`).join(",")}`,
  );
  let launched = 0;
  let spawned = 0;
  for (const launch of due) {
    const n = await spawnLaunch(supabase, launch.workspace_id, launch);
    if (n > 0) launched += 1;
    spawned += n;
  }

  return NextResponse.json({
    ok: true,
    dueConsidered: due.length,
    launched,
    spawned,
  });
}
