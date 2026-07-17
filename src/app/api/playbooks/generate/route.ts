import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/workspace";
import { generatePlaybookDraft } from "@/lib/ai-playbook";

/**
 * POST /api/playbooks/generate — drafts a playbook from a free-form description.
 *
 * Guards, in order: authenticated → founder/manager of this workspace → under the
 * per-workspace daily generation cap. The cap is enforced with a real row count (see
 * the ai_generations table) so it holds across serverless instances, and a usage row
 * is written before the model call so repeated attempts — successful or not — all
 * count against it. Nothing here persists a playbook; the draft lives in the client
 * until the founder saves it.
 */

// Generous enough that a founder setting up their workspace never hits it, low enough
// that nobody can spin the model in a loop.
const DAILY_LIMIT = 25;

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  description: z
    .string()
    .trim()
    .min(10, "Add a bit more detail so the draft has something to work with.")
    .max(8000, "That's a lot of text — trim it down a little."),
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const { workspaceId, description } = parsed.data;

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
      { error: "Only founders and managers can generate playbooks." },
      { status: 403 },
    );
  }

  // Count today's generations for this workspace (RLS restricts the row set to this
  // workspace's admins, and the query is scoped to it anyway).
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("ai_generations")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", startOfDay.toISOString());

  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      {
        error:
          "You've reached today's generation limit. Try again tomorrow, or build this one manually.",
      },
      { status: 429 },
    );
  }

  // Record the attempt before spending a model call, so the limit can't be bypassed
  // by racing requests. A blocked insert (non-admin) also means we never call out.
  const { error: usageError } = await supabase
    .from("ai_generations")
    .insert({ workspace_id: workspaceId, membership_id: membership.id });
  if (usageError) {
    return NextResponse.json(
      { error: "Couldn't start generation. Try again." },
      { status: 403 },
    );
  }

  const result = await generatePlaybookDraft(description);

  if (!result.ok) {
    if (result.code === "not_configured") {
      return NextResponse.json(
        {
          error:
            "AI generation isn't set up on this workspace yet. You can still build the playbook manually.",
          code: "not_configured",
        },
        { status: 501 },
      );
    }
    return NextResponse.json(
      {
        error:
          "The generator couldn't draft that. Try rephrasing, or build it manually.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ draft: result.draft });
}
