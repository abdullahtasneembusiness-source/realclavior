"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { resolveWorkspaceId } from "@/lib/workspace";
import { pickMemberColor } from "@/lib/colors";
import { sendInviteEmail } from "@/lib/email";
import type { Role } from "@/types/db";

const membershipIdSchema = z.string().uuid();

export type InviteState = {
  error?: string;
  success?: string;
  emailWarning?: string;
};

async function getWorkspaceName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
): Promise<string> {
  const { data } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .maybeSingle();
  return data?.name ?? "your workspace";
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(["manager", "operator"], { message: "Pick a role." }),
  title: z
    .string()
    .trim()
    .max(60, "Keep the title under 60 characters.")
    .optional(),
});

/**
 * Invites a team member into a specific workspace. Creates a memberships row with
 * status 'invited' — RLS's memberships_insert requires the caller be an admin of
 * this exact workspace_id, so a mismatched/forged workspaceId here just fails at
 * the database layer regardless of what the client sends.
 */
export async function inviteMember(
  workspaceId: string,
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    title: formData.get("title") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { email, role, title } = parsed.data;
  const supabase = await createClient();
  const wsId = await resolveWorkspaceId(supabase, workspaceId);
  if (!wsId) return { error: "Invalid workspace." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Please sign in again." };
  }

  // Guard against inviting someone already on the team (active or pending) in
  // this workspace.
  const { data: existing } = await supabase
    .from("memberships")
    .select("id")
    .eq("workspace_id", wsId)
    .eq("invited_email", email)
    .not("status", "eq", "archived")
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: "That email is already on your team." };
  }

  const { error: insertError } = await supabase.from("memberships").insert({
    workspace_id: wsId,
    role,
    title: title ?? null,
    color: pickMemberColor(email),
    status: "invited",
    invited_email: email,
    invited_at: new Date().toISOString(),
  });

  if (insertError) {
    return {
      error:
        insertError.code === "42501"
          ? "Only founders and managers can invite team members."
          : "Couldn't create the invite. Please try again.",
    };
  }

  const workspaceName = await getWorkspaceName(supabase, wsId);
  const emailResult = await sendInviteEmail({
    to: email,
    workspaceName,
    inviterName: user.email ?? "A teammate",
    role,
  });

  revalidatePath(`/w/${workspaceId}/team`);

  if (!emailResult.sent) {
    return {
      success: `${email} was invited.`,
      emailWarning:
        emailResult.error === "email_not_configured"
          ? "Email isn't configured yet, so no invite email was sent. They can still join by signing in with this email."
          : "The invite was created, but the email failed to send.",
    };
  }

  return { success: `Invite sent to ${email}.` };
}

/** Soft-archive a member — we keep the row for history, never hard-delete. */
export async function archiveMember(
  workspaceId: string,
  membershipId: string,
): Promise<InviteState> {
  const parsedId = membershipIdSchema.safeParse(membershipId);
  if (!parsedId.success) return { error: "Invalid member." };

  const supabase = await createClient();
  const wsId = await resolveWorkspaceId(supabase, workspaceId);
  if (!wsId) return { error: "Invalid member." };

  const { error } = await supabase
    .from("memberships")
    .update({ status: "archived" })
    .eq("id", parsedId.data)
    .eq("workspace_id", wsId);

  if (error) return { error: "Couldn't archive that member." };

  revalidatePath(`/w/${workspaceId}/team`);
  return { success: "Member archived." };
}

/** Cancel a pending invite by archiving the row. */
export async function cancelInvite(
  workspaceId: string,
  membershipId: string,
): Promise<InviteState> {
  return archiveMember(workspaceId, membershipId);
}

/** Re-sends the invite email for a still-pending member, without creating a new row. */
export async function resendInvite(
  workspaceId: string,
  membershipId: string,
): Promise<InviteState> {
  const parsedId = membershipIdSchema.safeParse(membershipId);
  if (!parsedId.success) return { error: "Invalid member." };

  const supabase = await createClient();
  const wsId = await resolveWorkspaceId(supabase, workspaceId);
  if (!wsId) return { error: "Invalid member." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Please sign in again." };

  const { data: target } = await supabase
    .from("memberships")
    .select("invited_email, role, status")
    .eq("id", parsedId.data)
    .eq("workspace_id", wsId)
    .maybeSingle();

  if (!target || target.status !== "invited" || !target.invited_email) {
    return { error: "That invite can't be resent." };
  }

  const { error: touchError } = await supabase
    .from("memberships")
    .update({ invited_at: new Date().toISOString() })
    .eq("id", parsedId.data)
    .eq("workspace_id", wsId);

  if (touchError) return { error: "Couldn't resend the invite." };

  const workspaceName = await getWorkspaceName(supabase, wsId);
  const emailResult = await sendInviteEmail({
    to: target.invited_email,
    workspaceName,
    inviterName: user.email ?? "A teammate",
    role: target.role,
  });

  if (!emailResult.sent) {
    return {
      success: "Invite refreshed.",
      emailWarning:
        emailResult.error === "email_not_configured"
          ? "Email isn't configured yet, so no invite email was sent."
          : "Couldn't send the email, but the invite is still active.",
    };
  }

  return { success: `Invite resent to ${target.invited_email}.` };
}

const roleSchema = z.enum(["founder", "manager", "operator"]);

/**
 * Changes a member's role, with guardrails beyond what RLS alone enforces:
 * - You can't change your own role here (avoid an accidental self-demotion).
 * - Only a founder can touch the founder tier (promote to it, or change an
 *   existing founder's role) — a manager can freely toggle manager <-> operator.
 * - The workspace must always keep at least one active founder.
 */
export async function changeRole(
  workspaceId: string,
  membershipId: string,
  role: Role,
): Promise<InviteState> {
  const parsedId = membershipIdSchema.safeParse(membershipId);
  const parsedRole = roleSchema.safeParse(role);
  if (!parsedId.success || !parsedRole.success) {
    return { error: "Invalid request." };
  }

  const supabase = await createClient();
  const wsId = await resolveWorkspaceId(supabase, workspaceId);
  if (!wsId) return { error: "Invalid request." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Please sign in again." };

  const { data: rows } = await supabase
    .from("memberships")
    .select("id, user_id, role, status")
    .eq("workspace_id", wsId)
    .eq("status", "active");

  const all = rows ?? [];
  const caller = all.find((m) => m.user_id === user.id);
  const target = all.find((m) => m.id === parsedId.data);

  if (!caller || (caller.role !== "founder" && caller.role !== "manager")) {
    return { error: "Only founders and managers can change roles." };
  }
  if (!target) return { error: "That member isn't active in this workspace." };
  if (target.id === caller.id) {
    return { error: "You can't change your own role here." };
  }
  if (
    (target.role === "founder" || parsedRole.data === "founder") &&
    caller.role !== "founder"
  ) {
    return { error: "Only a founder can change the founder role." };
  }
  if (target.role === "founder" && parsedRole.data !== "founder") {
    const founderCount = all.filter((m) => m.role === "founder").length;
    if (founderCount <= 1) {
      return { error: "A workspace needs at least one founder." };
    }
  }

  const { error } = await supabase
    .from("memberships")
    .update({ role: parsedRole.data })
    .eq("id", parsedId.data)
    .eq("workspace_id", wsId);

  if (error) return { error: "Couldn't update that role." };

  revalidatePath(`/w/${workspaceId}/team`);
  return { success: "Role updated." };
}
