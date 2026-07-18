"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { WorkspaceSummary } from "@/lib/workspace";
import type { Role } from "@/types/db";

function WorkspaceMark({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground",
        className,
      )}
    >
      {name.trim()[0]?.toUpperCase() ?? "C"}
    </span>
  );
}

export function WorkspaceSwitcher({
  current,
  workspaces,
  role,
}: {
  current: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
  /** Viewer's role in this workspace, shown as a subtle line under the name. */
  role?: Role;
}) {
  const router = useRouter();

  if (workspaces.length <= 1) {
    return (
      <div className="flex items-center gap-2.5 px-1 py-1">
        <WorkspaceMark name={current.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{current.name}</p>
          {role ? <p className="section-label">{role}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-md px-1 py-1 text-left transition-colors hover:bg-accent"
        >
          <WorkspaceMark name={current.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{current.name}</p>
            {role ? <p className="section-label">{role}</p> : null}
          </div>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onSelect={() => router.push(`/w/${ws.slug}`)}
            className="gap-2.5"
          >
            <WorkspaceMark name={ws.name} className="size-6 text-xs" />
            <span className="min-w-0 flex-1 truncate">{ws.name}</span>
            {ws.id === current.id ? (
              <Check className="size-4 shrink-0 text-primary" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
