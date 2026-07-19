import { Resend } from "resend";

import { getSiteUrl } from "@/lib/site";

/**
 * Transactional email via Resend. In Phase 1 this sends invite emails; digests and
 * overdue alerts come in Phase 6.
 *
 * If RESEND_API_KEY isn't configured, sends are skipped rather than throwing — the
 * membership/invite row is the source of truth, and an invited user can also sign in
 * directly with the invited email and be auto-linked. Callers get { sent: false }
 * so they can surface an appropriate hint.
 */
const apiKey = process.env.RESEND_API_KEY;
const fromEmail =
  process.env.RESEND_FROM_EMAIL ?? "Clovior <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

export type SendResult = { sent: boolean; error?: string };

export async function sendInviteEmail(params: {
  to: string;
  workspaceName: string;
  inviterName: string;
  role: string;
}): Promise<SendResult> {
  if (!resend) {
    return { sent: false, error: "email_not_configured" };
  }

  // Land on /login with the email pre-filled, so the invitee just taps "Send magic
  // link" — one tap, no retyping — then signs in and is auto-linked to the workspace.
  const acceptUrl = `${getSiteUrl()}/login?email=${encodeURIComponent(params.to)}`;
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: params.to,
    subject: `${params.inviterName} added you to ${params.workspaceName} on Clovior`,
    text: [
      `${params.inviterName} added you to ${params.workspaceName} as ${params.role}.`,
      "",
      `Open this link and tap "Send magic link" to join the team:`,
      acceptUrl,
      "",
      "Clovior — your team, running without you.",
    ].join("\n"),
  });

  if (error) {
    return { sent: false, error: error.message };
  }
  return { sent: true };
}
