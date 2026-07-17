"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Pencil, Search, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteBrainEntry } from "./actions";
import { CATEGORY_LABELS, EDITABLE_CATEGORIES } from "./categories";
import { EntryDialog } from "./entry-dialog";
import type { BrainCategory, BrainEntry } from "@/types/db";

export interface CorrectionItem {
  id: string;
  body: string;
  playbookId: string;
  playbookName: string;
  createdAt: string;
}

type Filter = "all" | BrainCategory;

const FILTERS: Filter[] = ["all", ...EDITABLE_CATEGORIES, "corrections"];

function matches(entry: BrainEntry, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    entry.title.toLowerCase().includes(q) ||
    (entry.body ?? "").toLowerCase().includes(q)
  );
}

function EntryCard({
  workspaceId,
  isAdmin,
  entry,
}: {
  workspaceId: string;
  isAdmin: boolean;
  entry: BrainEntry;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    if (!confirm("Delete this entry?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteBrainEntry(workspaceId, entry.id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <Card data-testid={`brain-entry-${entry.id}`}>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-medium leading-tight">{entry.title}</h3>
            <span className="text-xs text-muted-foreground">
              {CATEGORY_LABELS[entry.category]}
            </span>
          </div>
          {isAdmin ? (
            <div className="flex shrink-0 items-center">
              <EntryDialog
                workspaceId={workspaceId}
                entry={entry}
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Edit entry">
                    <Pencil className="size-4" />
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete entry"
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive"
                onClick={remove}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </div>
          ) : null}
        </div>
        {entry.body ? (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {entry.body}
          </p>
        ) : null}
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** The Corrections category: a read-only mirror of feedback_notes, grouped by playbook. */
function CorrectionsView({
  workspaceId,
  corrections,
  query,
}: {
  workspaceId: string;
  corrections: CorrectionItem[];
  query: string;
}) {
  const q = query.toLowerCase();
  const filtered = corrections.filter(
    (c) =>
      !q ||
      c.body.toLowerCase().includes(q) ||
      c.playbookName.toLowerCase().includes(q),
  );

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; items: CorrectionItem[] }>();
    for (const c of filtered) {
      const g = map.get(c.playbookId) ?? { name: c.playbookName, items: [] };
      g.items.push(c);
      map.set(c.playbookId, g);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (corrections.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        No standing corrections yet. When a founder saves feedback while
        reviewing a run, it shows up here automatically.
      </p>
    );
  }

  if (groups.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        No corrections match “{query}”.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="brain-corrections">
      <p className="text-sm text-muted-foreground">
        Pulled live from Feedback Memory across your playbooks — resolve them on
        the playbook itself.
      </p>
      {groups.map(([playbookId, group]) => (
        <div
          key={playbookId}
          className="border-clovior-amber/30 bg-clovior-amber/5 overflow-hidden rounded-xl border"
        >
          <Link
            href={`/w/${workspaceId}/playbooks/${playbookId}`}
            className="border-clovior-amber/20 hover:bg-clovior-amber/10 flex items-center gap-2 border-b px-4 py-2.5 text-sm font-medium text-clovior-amber transition-colors"
          >
            <Sparkles className="size-4" /> {group.name}
          </Link>
          <ul className="flex flex-col gap-2 p-4">
            {group.items.map((c) => (
              <li key={c.id} className="flex gap-2 text-sm">
                <span aria-hidden className="text-clovior-amber">
                  •
                </span>
                <span className="whitespace-pre-wrap">{c.body}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function BrainBoard({
  workspaceId,
  isAdmin,
  entries,
  corrections,
}: {
  workspaceId: string;
  isAdmin: boolean;
  entries: BrainEntry[];
  corrections: CorrectionItem[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const visibleEntries = useMemo(() => {
    return entries.filter(
      (e) => (filter === "all" || e.category === filter) && matches(e, query),
    );
  }, [entries, filter, query]);

  const showingCorrections = filter === "corrections";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="brain-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the Brain…"
            className="pl-9"
          />
        </div>
        {isAdmin ? <EntryDialog workspaceId={workspaceId} /> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const label = f === "all" ? "All" : CATEGORY_LABELS[f];
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              data-testid={`brain-filter-${f}`}
              onClick={() => setFilter(f)}
              className={
                active
                  ? "rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
                  : "rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {showingCorrections ? (
        <CorrectionsView
          workspaceId={workspaceId}
          corrections={corrections}
          query={query}
        />
      ) : visibleEntries.length > 0 ? (
        <div
          data-testid="brain-entry-list"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {visibleEntries.map((entry) => (
            <EntryCard
              key={entry.id}
              workspaceId={workspaceId}
              isAdmin={isAdmin}
              entry={entry}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {query || filter !== "all"
            ? "Nothing here yet for this filter."
            : isAdmin
              ? "The Brain is empty. Add your first entry — voice, standards, tools, whatever a new hire would need."
              : "Nothing in the Team Brain yet."}
        </p>
      )}
    </div>
  );
}
