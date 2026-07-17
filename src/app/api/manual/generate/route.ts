import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/workspace";
import { generateFounderManual } from "@/lib/ai-manual";

/**
 * POST /api/manual/generate — synthesizes a Founder's Manual from interview answers.
 * Same guards as the playbook generator: authenticated → founder/manager → under the
 * shared per-workspace daily AI cap (ai_generations, kind 'founder_manual'). Persists
 * nothing; the founder reviews and saves the draft on the client.
 */

const DAILY_LIMIT = 25;

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  answers: z
    .array(z.object({ q: z.string().max(500), a: z.string().max(2000) }))
    .min(1)
    .max(20),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { workspaceId, answers } = parsed.data;

  // Need at least a little to work with.
  if (answers.every((p) => p.a.trim().length === 0)) {
    return NextResponse.json(
      { error: "Answer a couple of questions first." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in again." },
      {
        status: 401,
      },
    );
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("id, role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership || !isAdminRole(membership.role)) {
    return NextResponse.json(
      { error: "Only founders and managers can build the manual." },
      { status: 403 },
    );
  }

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("ai_generations")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", startOfDay.toISOString());
  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: "You've reached today's AI limit. Try again tomorrow." },
      { status: 429 },
    );
  }

  const { error: usageError } = await supabase.from("ai_generations").insert({
    workspace_id: workspaceId,
    membership_id: membership.id,
    kind: "founder_manual",
  });
  if (usageError) {
    return NextResponse.json(
      { error: "Couldn't start generation. Try again." },
      { status: 403 },
    );
  }

  const result = await generateFounderManual(answers);
  if (!result.ok) {
    if (result.code === "not_configured") {
      return NextResponse.json(
        {
          error:
            "AI isn't set up on this workspace yet. You can still write the manual yourself.",
          code: "not_configured",
        },
        { status: 501 },
      );
    }
    return NextResponse.json(
      {
        error:
          "The writer couldn't draft that. Try again, or write it yourself.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ sections: result.sections });
}
