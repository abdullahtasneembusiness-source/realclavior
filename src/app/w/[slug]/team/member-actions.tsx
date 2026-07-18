"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  archiveMember,
  cancelInvite,
  changeRole,
  resendInvite,
} from "./actions";
import type { Role } from "@/types/db";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "founder", label: "Founder" },
  { value: "manager", label: "Manager" },
  { value: "operator", label: "Operator" },
];

export function MemberActions({
  workspaceId,
  membershipId,
  pending,
  currentRole,
  canArchive,
  canChangeRole,
  callerIsFounder,
}: {
  workspaceId: string;
  membershipId: string;
  pending: boolean;
  currentRole: Role;
  canArchive: boolean;
  canChangeRole: boolean;
  callerIsFounder: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ error?: string; success?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
    });
  }

  if (!pending && !canArchive && !canChangeRole) return null;

  return (
    <div className="flex items-center gap-2">
      {error ? (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending}>
            {isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <MoreHorizontal />
            )}
            <span className="sr-only">Member actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {pending ? (
            <>
              <DropdownMenuItem
                onSelect={() =>
                  run(() => resendInvite(workspaceId, membershipId))
                }
              >
                Resend invite
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onSelect={() =>
                  run(() => cancelInvite(workspaceId, membershipId))
                }
              >
                Cancel invite
              </DropdownMenuItem>
            </>
          ) : (
            <>
              {canChangeRole ? (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Change role</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {ROLE_OPTIONS.map((option) => {
                      const disabled =
                        option.value === currentRole ||
                        (option.value === "founder" && !callerIsFounder);
                      return (
                        <DropdownMenuItem
                          key={option.value}
                          disabled={disabled}
                          onSelect={() =>
                            run(() =>
                              changeRole(
                                workspaceId,
                                membershipId,
                                option.value,
                              ),
                            )
                          }
                        >
                          {option.value === currentRole ? (
                            <Check className="size-3.5" />
                          ) : (
                            <span className="size-3.5" />
                          )}
                          {option.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ) : null}
              {canArchive ? (
                <>
                  {canChangeRole ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() =>
                      run(() => archiveMember(workspaceId, membershipId))
                    }
                  >
                    Archive member
                  </DropdownMenuItem>
                </>
              ) : null}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
