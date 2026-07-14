"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { pickMemberColor } from "@/lib/colors";
import { sendInviteEmail } from "@/lib/email";

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(["manager", "operator"], { message: "Pick a role." }),
  title: z
    .string()
    .trim()
    .max(60, "Keep the title under 60 characters.")
    .optional(),
});

export type InviteState = {
  error?: string;
  success?: string;
  emailWarning?: string;
};

/**
 * Invites a team member. Creates a memberships row with status 'invited' (RLS's
 * memberships_insert requires the caller be a workspace admin), then attempts to
 * send the invite email. The row is the source of truth — if email isn't wired up
 * yet, the invite still stands and the person is auto-linked when they sign in.
 */
export async function inviteMember(
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Please sign in again." };
  }

  // Resolve the caller's admin membership + workspace (RLS scopes this to workspaces
  // where the user is founder/manager).
  const { data: membership } = await supabase
    .from("memberships")
    .select("workspace_id, role, workspace:workspaces(name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", ["founder", "manager"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { error: "Only founders and managers can invite team members." };
  }

  const workspaceId = membership.workspace_id as string;
  // Supabase types an embedded to-one relation as an array; normalize it.
  const workspaceRel = membership.workspace as
    { name: string } | { name: string }[] | null;
  const workspaceName =
    (Array.isArray(workspaceRel) ? workspaceRel[0] : workspaceRel)?.name ??
    "your workspace";

  // Guard against inviting someone already on the team (active or pending).
  const { data: existing } = await supabase
    .from("memberships")
    .select("id, status")
    .eq("workspace_id", workspaceId)
    .eq("invited_email", email)
    .not("status", "eq", "archived")
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: "That email is already on your team." };
  }

  const { error: insertError } = await supabase.from("memberships").insert({
    workspace_id: workspaceId,
    role,
    title: title ?? null,
    color: pickMemberColor(email),
    status: "invited",
    invited_email: email,
    invited_at: new Date().toISOString(),
  });

  if (insertError) {
    return { error: "Couldn't create the invite. Please try again." };
  }

  const emailResult = await sendInviteEmail({
    to: email,
    workspaceName,
    inviterName: user.email ?? "A teammate",
    role,
  });

  revalidatePath("/app/team");

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

const membershipIdSchema = z.string().uuid();

/** Soft-archive a member — we keep the row for history, never hard-delete. */
export async function archiveMember(
  membershipId: string,
): Promise<InviteState> {
  const parsed = membershipIdSchema.safeParse(membershipId);
  if (!parsed.success) return { error: "Invalid member." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("memberships")
    .update({ status: "archived" })
    .eq("id", parsed.data);

  if (error) return { error: "Couldn't archive that member." };

  revalidatePath("/app/team");
  return { success: "Member archived." };
}

/** Cancel a pending invite by archiving the row. */
export async function cancelInvite(membershipId: string): Promise<InviteState> {
  return archiveMember(membershipId);
}
