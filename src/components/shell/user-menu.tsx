"use client";

import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MemberAvatar } from "@/components/member-avatar";
import { signOut } from "@/lib/auth-actions";

export function UserMenu({
  workspaceId,
  displayName,
  email,
  color,
  compact = false,
}: {
  workspaceId: string;
  displayName: string;
  email: string | null;
  color: string | null;
  /** Icon-rail mode: avatar-only trigger. */
  compact?: boolean;
}) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <button
            type="button"
            title={displayName}
            aria-label="Account menu"
            className="flex justify-center rounded-md p-1 transition-colors hover:bg-accent"
          >
            <MemberAvatar name={displayName} color={color} size="sm" />
          </button>
        ) : (
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-accent"
          >
            <MemberAvatar name={displayName} color={color} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName}</p>
              {email ? (
                <p className="truncate text-xs text-muted-foreground">
                  {email}
                </p>
              ) : null}
            </div>
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "end" : "start"} className="w-56">
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
  );
}
