import Link from "next/link";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/member-avatar";
import { requireActiveContext } from "@/lib/workspace";
import { signOut } from "./actions";

/**
 * Minimal authenticated shell for Phase 1 — a top bar with the workspace name, a
 * couple of links, and sign-out. The real role-based sidebar / workspace switcher
 * is Session 2; this is intentionally thin so the auth + invite flow can be tested.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireActiveContext();
  const isAdmin =
    ctx.membership.role === "founder" || ctx.membership.role === "manager";

  return (
    <div className="min-h-screen">
      <header className="bg-background/80 sticky top-0 z-10 border-b border-border backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/app" className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                C
              </span>
              <span className="font-medium">{ctx.workspace.name}</span>
            </Link>
            <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
              <Link
                href="/app"
                className="transition-colors hover:text-foreground"
              >
                Home
              </Link>
              {isAdmin ? (
                <Link
                  href="/app/team"
                  className="transition-colors hover:text-foreground"
                >
                  Team
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <MemberAvatar
              name={ctx.email ?? ctx.membership.title ?? "You"}
              color={ctx.membership.color}
              size="sm"
            />
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut /> Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
