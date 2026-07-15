"use client";

import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MemberAvatar } from "@/components/member-avatar";
import { signOut } from "@/lib/auth-actions";
import { LogOut, Settings } from "lucide-react";

/** No hamburger — the operator's whole nav is 2 items, they live in the bottom bar. */
export function OperatorMobileHeader({
  workspaceId,
  workspaceName,
  displayName,
  color,
}: {
  workspaceId: string;
  workspaceName: string;
  displayName: string;
  color: string | null;
}) {
  const router = useRouter();

  return (
    <header className="bg-background/90 sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border px-4 backdrop-blur lg:hidden">
      <span className="flex-1 truncate text-sm font-medium">
        {workspaceName}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Account menu">
            <MemberAvatar name={displayName} color={color} size="sm" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onSelect={() => router.push(`/w/${workspaceId}/settings`)}
          >
            <Settings /> Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={signOut} className="contents">
            <DropdownMenuItem
              asChild
              className="text-destructive focus:text-destructive"
            >
              <button type="submit" className="w-full">
                <LogOut /> Sign out
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
