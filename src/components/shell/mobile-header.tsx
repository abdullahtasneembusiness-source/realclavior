"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MemberAvatar } from "@/components/member-avatar";
import type { NavItem } from "./nav-config";
import { SidebarContent } from "./sidebar-content";
import type { WorkspaceSummary } from "@/lib/workspace";

/**
 * Admin (founder/manager) mobile header: hamburger opens a full sidebar drawer.
 * Operators don't get this — their nav lives entirely in the bottom tab bar
 * (see bottom-tab-bar.tsx), a genuinely simpler shell rather than this one with
 * items hidden.
 */
export function MobileHeader({
  workspaceId,
  workspace,
  allWorkspaces,
  navItems,
  displayName,
  email,
  color,
}: {
  workspaceId: string;
  workspace: WorkspaceSummary;
  allWorkspaces: WorkspaceSummary[];
  navItems: NavItem[];
  displayName: string;
  email: string | null;
  color: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-background/90 sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border px-4 backdrop-blur lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open navigation">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent
            workspaceId={workspaceId}
            workspace={workspace}
            allWorkspaces={allWorkspaces}
            navItems={navItems}
            displayName={displayName}
            email={email}
            color={color}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <span className="flex-1 truncate text-sm font-medium">
        {workspace.name}
      </span>
      <MemberAvatar name={displayName} color={color} size="sm" />
    </header>
  );
}
