import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/workspace";
import { CATEGORY_LABELS } from "../brain/categories";
import { MANUAL_SECTIONS } from "../brain/manual/sections";
import type { BrainEntry, ManualSection, Playbook } from "@/types/db";
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

  const [{ data: entryRows }, { data: playbookRows }, { data: manualRows }] =
    await Promise.all([
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
      supabase
        .from("founder_manual_sections")
        .select("*")
        .eq("workspace_id", ctx.workspace.id),
    ]);

  const entries = (entryRows ?? []) as BrainEntry[];
  const playbooks = (playbookRows ?? []) as Playbook[];

  // The Founder's Manual leads onboarding — the first thing a new operator reads.
  const manual = (manualRows ?? []) as ManualSection[];
  const manualBody = new Map(manual.map((s) => [s.section_key, s.body]));
  const manualText = MANUAL_SECTIONS.map((s) => {
    const body = (manualBody.get(s.key) ?? "").trim();
    return body ? `${s.heading}\n${body}` : null;
  })
    .filter((x): x is string => x !== null)
    .join("\n\n");

  const manualItem: OnboardingItem[] = manualText
    ? [
        {
          id: "founder-manual",
          label: "Start here",
          title: "Founder's Manual",
          body: manualText,
        },
      ]
    : [];

  const items: OnboardingItem[] = [
    ...manualItem,
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
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
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
