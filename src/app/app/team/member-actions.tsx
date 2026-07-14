"use client";

import { useState, useTransition } from "react";
import { Loader2, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { archiveMember, cancelInvite } from "./actions";

export function MemberActions({
  membershipId,
  pending,
  canArchive,
}: {
  membershipId: string;
  pending: boolean;
  canArchive: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: (id: string) => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action(membershipId);
      if (result?.error) setError(result.error);
    });
  }

  if (!pending && !canArchive) return null;

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
        <DropdownMenuContent align="end">
          {pending ? (
            <DropdownMenuItem
              className="text-destructive"
              onSelect={() => run(cancelInvite)}
            >
              Cancel invite
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="text-destructive"
              onSelect={() => run(archiveMember)}
            >
              Archive member
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
