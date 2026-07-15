import { Badge } from "@/components/ui/badge";
import { MemberAvatar } from "@/components/member-avatar";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireWorkspaceContext } from "@/lib/workspace";
import type { Membership } from "@/types/db";
import { InviteDialog } from "./invite-dialog";
import { MemberActions } from "./member-actions";

function roleLabel(role: Membership["role"]) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default async function TeamPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const ctx = await requireWorkspaceContext(params.workspaceId);
  requireAdmin(ctx);

  const callerIsFounder = ctx.membership.role === "founder";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .not("status", "eq", "archived")
    .order("created_at", { ascending: true });

  const members = (data ?? []) as Membership[];
  const active = members.filter((m) => m.status === "active");
  const pending = members.filter((m) => m.status === "invited");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone who runs work inside {ctx.workspace.name}.
          </p>
        </div>
        <InviteDialog workspaceId={ctx.workspace.id} />
      </div>

      {error ? (
        <p className="border-destructive/30 bg-destructive/10 rounded-md border px-3 py-2 text-sm text-destructive">
          Couldn&apos;t load your team. Refresh to try again.
        </p>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Active · {active.length}
        </h2>
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {active.map((m) => {
            const displayName = m.title || m.invited_email || "Member";
            const isSelf = m.id === ctx.membership.id;
            return (
              <div
                key={m.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <MemberAvatar name={displayName} color={m.color} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{displayName}</span>
                      {isSelf ? (
                        <span className="text-xs text-muted-foreground">
                          (you)
                        </span>
                      ) : null}
                    </div>
                    {m.invited_email ? (
                      <p className="text-xs text-muted-foreground">
                        {m.invited_email}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{roleLabel(m.role)}</Badge>
                  <MemberActions
                    workspaceId={ctx.workspace.id}
                    membershipId={m.id}
                    pending={false}
                    currentRole={m.role}
                    canArchive={m.role !== "founder" && !isSelf}
                    canChangeRole={
                      !isSelf && (m.role !== "founder" || callerIsFounder)
                    }
                    callerIsFounder={callerIsFounder}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {pending.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pending · {pending.length}
          </h2>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {pending.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <MemberAvatar
                    name={m.invited_email ?? "?"}
                    color={m.color}
                    className="opacity-70"
                  />
                  <div>
                    <span className="text-sm font-medium">
                      {m.invited_email}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Invited — awaiting sign-up
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{roleLabel(m.role)}</Badge>
                  <MemberActions
                    workspaceId={ctx.workspace.id}
                    membershipId={m.id}
                    pending
                    currentRole={m.role}
                    canArchive
                    canChangeRole={false}
                    callerIsFounder={callerIsFounder}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
