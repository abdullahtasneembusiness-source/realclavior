import Link from "next/link";
import { ArrowLeft, Sparkles, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole, requireWorkspaceContext } from "@/lib/workspace";
import { aiManualAvailable } from "@/lib/ai-manual";
import type { ManualSection } from "@/types/db";
import { MANUAL_SECTIONS } from "./sections";
import { ManualSectionCard } from "./manual-section-card";

export default async function FounderManualPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const ctx = await requireWorkspaceContext(params.workspaceId);
  const isAdmin = isAdminRole(ctx.membership.role);

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("founder_manual_sections")
    .select("*")
    .eq("workspace_id", ctx.workspace.id);

  const sections = (rows ?? []) as ManualSection[];
  const bodyByKey = new Map(sections.map((s) => [s.section_key, s.body]));
  const isEmpty = !sections.some((s) => (s.body ?? "").trim().length > 0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={`/w/${ctx.workspace.id}/brain`}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Team Brain
        </Link>
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 flex size-9 items-center justify-center rounded-lg text-primary">
            <User className="size-5" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Founder&apos;s Manual
            </h1>
            <p className="text-sm text-muted-foreground">
              How the founder thinks and expects to be worked with.
            </p>
          </div>
        </div>
      </div>

      {isEmpty && isAdmin ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-5">
            <h2 className="font-medium">Build your manual</h2>
            <p className="text-sm text-muted-foreground">
              The single biggest thing a new operator needs — and the one
              founders never write down. Answer a few quick questions and
              Clovior drafts it in your voice, or fill the sections in yourself
              below.
            </p>
            <div className="flex flex-wrap gap-2">
              {aiManualAvailable() ? (
                <Button asChild data-testid="manual-interview-cta">
                  <Link href={`/w/${ctx.workspace.id}/brain/manual/interview`}>
                    <Sparkles /> Answer a few questions
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3" data-testid="manual-sections">
        {MANUAL_SECTIONS.map((s) => (
          <ManualSectionCard
            key={s.key}
            workspaceId={ctx.workspace.id}
            sectionKey={s.key}
            heading={s.heading}
            hint={s.hint}
            body={bodyByKey.get(s.key) ?? null}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </div>
  );
}
