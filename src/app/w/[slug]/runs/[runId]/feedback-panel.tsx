import { Sparkles } from "lucide-react";

import type { FeedbackNote } from "@/types/db";

/**
 * The "Before you start" panel — Feedback Memory made visible. Every unresolved
 * correction for this playbook shows here, at the very top of the run, in amber (the
 * one place amber is used in the whole product). It is never collapsed and can't be
 * dismissed by the operator — only a founder resolving the note removes it.
 */
export function FeedbackPanel({ notes }: { notes: FeedbackNote[] }) {
  if (notes.length === 0) return null;

  return (
    <section
      data-testid="feedback-panel"
      className="border-clovior-amber/30 bg-clovior-amber/10 rounded-xl border p-4"
    >
      <div className="flex items-center gap-2 text-clovior-amber">
        <Sparkles className="size-4" />
        <h2 className="text-sm font-semibold tracking-tight">
          Before you start
        </h2>
      </div>
      <ul className="mt-2 flex flex-col gap-2">
        {notes.map((note) => (
          <li key={note.id} className="text-foreground/90 flex gap-2 text-sm">
            <span aria-hidden className="text-clovior-amber">
              •
            </span>
            <span className="whitespace-pre-wrap">{note.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
