"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setPlaybookStatus } from "../actions";
import { statusBadge } from "../playbook-format";
import type { PlaybookStatus } from "@/types/db";

export function PlaybookStatusMenu({
  workspaceId,
  playbookId,
  status,
}: {
  workspaceId: string;
  playbookId: string;
  status: PlaybookStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const badge = statusBadge(status);

  function change(next: PlaybookStatus) {
    setError(null);
    startTransition(async () => {
      const result = await setPlaybookStatus(workspaceId, playbookId, next);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error ? (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            data-testid="playbook-status-trigger"
          >
            {isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Badge variant={badge.variant}>{badge.label}</Badge>
            )}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {status !== "active" ? (
            <DropdownMenuItem onSelect={() => change("active")}>
              Set active
            </DropdownMenuItem>
          ) : null}
          {status !== "paused" ? (
            <DropdownMenuItem onSelect={() => change("paused")}>
              Pause
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onSelect={() => change("archived")}
          >
            Archive playbook
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
