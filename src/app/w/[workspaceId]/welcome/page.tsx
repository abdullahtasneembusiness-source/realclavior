import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/workspace";
import { CATEGORY_LABELS } from "../brain/categories";
import type { BrainEntry, Playbook } from "@/types/db";
import { OnboardingFlow, type OnboardingItem } from "./onboarding-flow";

/**
 * Onboarding mode. A sequential walkthrough of the Team Brain plus the playbooks this
 * member owns — the first thing a new hire sees. Reachable by anyone (a founder can
 * preview it); the workspace home auto-sends not-yet-onboarded members here.
 */
export default async function WelcomePage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const ctx = await requireWorkspaceContext(params.workspaceId);
  const supabase = await createClient();

  const [{ data: entryRows }, { data: playbookRows }] = await Promise.all([
    supabase
      .from("brain_entries")
      .select("*")
      .eq("workspace_id", ctx.workspace.id)
      .not("category", "eq", "corrections")
      .order("category", { ascending: true })
      .order("updated_at", { ascending: false }),
    supabase
      .from("playbooks")
      .select("*")
      .eq("workspace_id", ctx.workspace.id)
      .eq("owner_membership_id", ctx.membership.id)
      .eq("status", "active")
      .order("created_at", { ascending: true }),
  ]);

  const entries = (entryRows ?? []) as BrainEntry[];
  const playbooks = (playbookRows ?? []) as Playbook[];

  const items: OnboardingItem[] = [
    ...entries.map((e) => ({
      id: `brain-${e.id}`,
      label: CATEGORY_LABELS[e.category],
      title: e.title,
      body: e.body,
    })),
    ...playbooks.map((p) => ({
      id: `playbook-${p.id}`,
      label: "Your playbook",
      title: p.name,
      body: p.description,
    })),
  ];

  const firstName = (ctx.fullName ?? "").split(" ")[0];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A quick walkthrough of how {ctx.workspace.name} works and what&apos;s
          yours to run. Two minutes, then you&apos;re off.
        </p>
      </div>

      <OnboardingFlow workspaceId={ctx.workspace.id} items={items} />
    </div>
  );
}
