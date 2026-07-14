import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveContext } from "@/lib/workspace";

export default async function AppHome() {
  const ctx = await requireActiveContext();
  const isAdmin =
    ctx.membership.role === "founder" || ctx.membership.role === "manager";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome to {ctx.workspace.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? "Your workspace is live. Bring your team in, then start building playbooks."
            : "You're in. Your playbooks and runs will show up here as they're handed to you."}
        </p>
      </div>

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-primary" /> Bring your team in
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Invite your operators and managers by email. They&apos;ll join the
              moment they sign in.
            </p>
            <Button asChild>
              <Link href="/app/team">
                Manage team <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Playbooks, runs, and the rest of the product arrive in the next build
        sessions.
      </p>
    </div>
  );
}
