import { AppShell } from "@/components/shell/app-shell";
import type { SidebarExtras } from "@/components/shell/nav-config";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole, requireWorkspaceContext } from "@/lib/workspace";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const ctx = await requireWorkspaceContext(params.slug);

  // Admins get a richer sidebar: count chips and a recent-playbooks shortcut list.
  // Operators run the lean 2-item nav, so we skip these queries entirely for them.
  let extras: SidebarExtras | undefined;
  if (isAdminRole(ctx.membership.role)) {
    const supabase = await createClient();
    const wid = ctx.workspace.id;
    const [playbooks, team, launches] = await Promise.all([
      supabase
        .from("playbooks")
        .select("id, name", { count: "exact" })
        .eq("workspace_id", wid)
        .not("status", "eq", "archived")
        .order("updated_at", { ascending: false })
        .limit(4),
      supabase
        .from("memberships")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", wid)
        .eq("status", "active"),
      supabase
        .from("launches")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", wid)
        .eq("is_template", false)
        .eq("status", "live"),
    ]);

    extras = {
      recentPlaybooks: (playbooks.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
      })),
      counts: {
        playbooks: playbooks.count ?? 0,
        team: team.count ?? 0,
        launches: launches.count ?? 0,
      },
    };
  }

  return (
    <AppShell ctx={ctx} extras={extras}>
      {children}
    </AppShell>
  );
}
