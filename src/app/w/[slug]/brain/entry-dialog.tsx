"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import dynamic from "next/dynamic";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrainEntry, updateBrainEntry, type BrainState } from "./actions";

// Code-split the editor (Tiptap/ProseMirror) so it only loads when a dialog opens.
const RichTextEditor = dynamic(
  () => import("@/components/rich-text").then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-40 items-center justify-center rounded-md border border-input text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
      </div>
    ),
  },
);
import { CATEGORY_LABELS, EDITABLE_CATEGORIES } from "./categories";
import type { BrainEntry } from "@/types/db";

const initialState: BrainState = {};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} data-testid="save-brain-entry">
      {pending ? <Loader2 className="animate-spin" /> : null} {label}
    </Button>
  );
}

export function EntryDialog({
  workspaceId,
  entry,
  defaultCategory,
  trigger,
}: {
  workspaceId: string;
  entry?: BrainEntry;
  defaultCategory?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = !!entry;
  const bound = isEdit
    ? updateBrainEntry.bind(null, workspaceId, entry.id)
    : createBrainEntry.bind(null, workspaceId);
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
        {trigger ?? (
          <Button data-testid="new-brain-entry">
            <Plus /> New entry
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit entry" : "New entry"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="entry-title">Title</Label>
            <Input
              id="entry-title"
              name="title"
              defaultValue={entry?.title ?? ""}
              placeholder="e.g. Our brand voice in 3 words"
              autoFocus
              required
              maxLength={140}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="entry-category">Category</Label>
            <select
              id="entry-category"
              name="category"
              defaultValue={entry?.category ?? defaultCategory ?? "standards"}
              className={selectClass}
            >
              {EDITABLE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="entry-body">Details</Label>
            <RichTextEditor
              name="body"
              editorId="entry-body"
              ariaLabel="Details"
              defaultValue={entry?.body ?? ""}
            />
          </div>

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
            <SaveButton label={isEdit ? "Save entry" : "Add entry"} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
