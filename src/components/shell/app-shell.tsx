"use client";

import { ADMIN_NAV, OPERATOR_NAV, type SidebarExtras } from "./nav-config";
import { SidebarContent } from "./sidebar-content";
import { MobileHeader } from "./mobile-header";
import { OperatorMobileHeader } from "./operator-mobile-header";
import { BottomTabBar } from "./bottom-tab-bar";
import { cn } from "@/lib/utils";
import type { ActiveContext } from "@/lib/workspace";

/**
 * The shell is a Client Component on purpose. Its nav config (nav-config.ts) carries
 * non-serializable values — an `href(id)` builder and Lucide `icon` components — and
 * those get handed down to the interactive nav (MobileHeader / NavLink / BottomTabBar).
 * A Server Component may not pass functions across the server→client boundary, so if
 * the shell rendered on the server every workspace route would 500. Keeping the shell
 * itself on the client means nav-config only ever moves client→client; the server
 * layout still passes the serializable `ctx` and the server-rendered `children` in the
 * normal supported way.
 */
export function AppShell({
  ctx,
  extras,
  children,
}: {
  ctx: ActiveContext;
  extras?: SidebarExtras;
  children: React.ReactNode;
}) {
  const isAdmin =
    ctx.membership.role === "founder" || ctx.membership.role === "manager";
  const navItems = isAdmin ? ADMIN_NAV : OPERATOR_NAV;
  const displayName =
    ctx.fullName || ctx.membership.title || ctx.email || "You";

  return (
    <div className="flex min-h-screen">
      <aside
        data-testid="desktop-sidebar"
        className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border bg-card lg:flex lg:flex-col"
      >
        <SidebarContent
          workspaceId={ctx.workspace.id}
          workspace={ctx.workspace}
          allWorkspaces={ctx.allWorkspaces}
          navItems={navItems}
          displayName={displayName}
          email={ctx.email}
          color={ctx.membership.color}
          role={ctx.membership.role}
          extras={extras}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {isAdmin ? (
          <MobileHeader
            workspaceId={ctx.workspace.id}
            workspace={ctx.workspace}
            allWorkspaces={ctx.allWorkspaces}
            navItems={navItems}
            displayName={displayName}
            email={ctx.email}
            color={ctx.membership.color}
            role={ctx.membership.role}
            extras={extras}
          />
        ) : (
          <OperatorMobileHeader
            workspaceId={ctx.workspace.id}
            workspaceName={ctx.workspace.name}
            displayName={displayName}
            color={ctx.membership.color}
          />
        )}

        <main
          className={cn(
            "flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8",
            !isAdmin && "pb-24 lg:pb-8",
          )}
        >
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>

        {!isAdmin ? (
          <BottomTabBar workspaceId={ctx.workspace.id} navItems={navItems} />
        ) : null}
      </div>
    </div>
  );
}
