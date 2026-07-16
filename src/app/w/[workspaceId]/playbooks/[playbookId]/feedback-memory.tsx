"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Check, Loader2, Pencil, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  resolveFeedbackNote,
  updateFeedbackNote,
  type FeedbackState,
} from "../../feedback/actions";
import type { FeedbackNote } from "@/types/db";

const initialState: FeedbackState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null} Save note
    </Button>
  );
}

function EditNoteDialog({
  workspaceId,
  playbookId,
  note,
}: {
  workspaceId: string;
  playbookId: string;
  note: FeedbackNote;
}) {
  const [open, setOpen] = useState(false);
  const bound = updateFeedbackNote.bind(null, workspaceId, playbookId, note.id);
  const [state, formAction] = useFormState(bound, initialState);
  const lastSuccess = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.success && state.success !== lastSuccess.current) {
      lastSuccess.current = state.success;
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Edit note">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit note</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <textarea
            name="body"
            rows={3}
            required
            maxLength={2000}
            defaultValue={note.body}
            className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <SaveButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NoteRow({
  workspaceId,
  playbookId,
  note,
}: {
  workspaceId: string;
  playbookId: string;
  note: FeedbackNote;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function resolve() {
    setError(null);
    startTransition(async () => {
      const result = await resolveFeedbackNote(
        workspaceId,
        playbookId,
        note.id,
      );
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div
      data-testid={`feedback-note-${note.id}`}
      className="flex items-start gap-3 px-4 py-3"
    >
      <span aria-hidden className="mt-1 text-clovior-amber">
        •
      </span>
      <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm">{note.body}</p>
      {error ? (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
      <div className="flex shrink-0 items-center">
        <EditNoteDialog
          workspaceId={workspaceId}
          playbookId={playbookId}
          note={note}
        />
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          data-testid={`resolve-note-${note.id}`}
          onClick={resolve}
        >
          {isPending ? <Loader2 className="animate-spin" /> : <Check />} Resolve
        </Button>
      </div>
    </div>
  );
}

export function FeedbackMemory({
  workspaceId,
  playbookId,
  notes,
}: {
  workspaceId: string;
  playbookId: string;
  notes: FeedbackNote[];
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-2 text-clovior-amber">
          <Sparkles className="size-4" />
          <h2 className="text-lg font-semibold tracking-tight">
            Feedback Memory
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Standing corrections shown to whoever runs this — before every run.
          Resolve one when it&apos;s no longer needed.
        </p>

        {notes.length > 0 ? (
          <div
            data-testid="feedback-memory-list"
            className="border-clovior-amber/30 bg-clovior-amber/5 mt-4 divide-y divide-border overflow-hidden rounded-xl border"
          >
            {notes.map((note) => (
              <NoteRow
                key={note.id}
                workspaceId={workspaceId}
                playbookId={playbookId}
                note={note}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
            No standing feedback yet. Corrections you save while reviewing a run
            land here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
