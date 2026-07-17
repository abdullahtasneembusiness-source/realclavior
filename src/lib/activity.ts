import type { SupabaseClient } from "@supabase/supabase-js";

// Accepts either the RLS-scoped server client or the service-role admin client — both
// are SupabaseClient. When called on the service-role client (the cron), getUser()
// returns no user and the log is silently skipped, which is the intended behavior.
type SupabaseServerClient = SupabaseClient;

export type ActivityVerb =
  | "started"
  | "completed_step"
  | "submitted"
  | "approved"
  | "requested_changes"
  | "added_note"
  | "launched";

/**
 * Records a workspace activity for the Live Feed. Best-effort telemetry: it resolves
 * the caller's membership and inserts an `activities` row, but never throws — a failed
 * log must never break the action that triggered it (the run already changed state).
 * RLS (activities_insert) already restricts inserts to active members of the workspace.
 */
export async function logActivity(
  supabase: SupabaseServerClient,
  opts: {
    workspaceId: string;
    verb: ActivityVerb;
    targetType: string;
    targetId: string;
  },
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: membership } = await supabase
      .from("memberships")
      .select("id")
      .eq("workspace_id", opts.workspaceId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    await supabase.from("activities").insert({
      workspace_id: opts.workspaceId,
      membership_id: membership?.id ?? null,
      verb: opts.verb,
      target_type: opts.targetType,
      target_id: opts.targetId,
    });
  } catch {
    // Telemetry is best-effort — swallow anything so the caller's action still succeeds.
  }
}
