import Link from "next/link";
import { ArrowRight, LayoutDashboard, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComingSoon } from "@/components/shell/coming-soon";
import { requireWorkspaceContext } from "@/lib/workspace";
import { MyRuns } from "./runs/my-runs";

export default async function WorkspaceHome({
  params,
}: {
  params: { workspaceId: string };
}) {
  const ctx = await requireWorkspaceContext(params.workspaceId);
  const isAdmin =
    ctx.membership.role === "founder" || ctx.membership.role === "manager";

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            My Playbooks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything handed to you, ready to run.
          </p>
        </div>
        <MyRuns
          workspaceId={ctx.workspace.id}
          membershipId={ctx.membership.id}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome to {ctx.workspace.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your workspace is live. Bring your team in, then start building
          playbooks.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-primary" /> Bring your team in
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Invite your operators and managers by email. They&apos;ll join the
            moment they sign in.
          </p>
          <Button asChild>
            <Link href={`/w/${ctx.workspace.id}/team`}>
              Manage team <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <ComingSoon
        icon={LayoutDashboard}
        title="Command View"
        description="Every run, every person, status and blockers — one dashboard that answers 'is my team moving?' in under 3 seconds."
        phase="Coming in Phase 3"
      />
    </div>
  );
}
