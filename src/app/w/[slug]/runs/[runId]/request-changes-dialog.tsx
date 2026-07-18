"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { requestChangesRun, type RunState } from "../actions";
import { distillFeedback } from "../../feedback/actions";

const initialState: RunState = {};

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} data-testid="request-changes-send">
      {pending ? <Loader2 className="animate-spin" /> : null} Send back
    </Button>
  );
}

export function RequestChangesDialog({
  workspaceId,
  runId,
  hasDistiller,
}: {
  workspaceId: string;
  runId: string;
  hasDistiller: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [distilling, startDistilling] = useTransition();
  const [distillError, setDistillError] = useState<string | null>(null);

  const bound = requestChangesRun.bind(null, workspaceId, runId);
  const [state, formAction] = useFormState(bound, initialState);
  const lastSuccess = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.success && state.success !== lastSuccess.current) {
      lastSuccess.current = state.success;
      setOpen(false);
      setComment("");
    }
  }, [state.success]);

  function cleanUp() {
    setDistillError(null);
    startDistilling(async () => {
      const result = await distillFeedback(comment);
      if (result.text) setComment(result.text);
      else if (result.error && result.error !== "not_configured")
        setDistillError(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="run-request-changes">
          <RotateCcw /> Request changes
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request changes</DialogTitle>
          <DialogDescription>
            Tell them what to fix. Saved to Feedback Memory, it shows before
            every future run — so it only has to be said once.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rc-comment">What needs to change?</Label>
              {hasDistiller ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={distilling || comment.trim().length < 2}
                  onClick={cleanUp}
                >
                  {distilling ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Sparkles />
                  )}
                  Clean up
                </Button>
              ) : null}
            </div>
            <textarea
              id="rc-comment"
              name="comment"
              rows={3}
              required
              maxLength={2000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Always add captions before uploading — not after."
              className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {distillError ? (
              <p className="text-xs text-muted-foreground">{distillError}</p>
            ) : null}
          </div>

          <label
            htmlFor="rc-save"
            className="border-clovior-amber/30 bg-clovior-amber/10 flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm"
          >
            <input
              id="rc-save"
              name="saveToMemory"
              type="checkbox"
              defaultChecked
              data-testid="save-to-memory"
              className="mt-0.5 size-4 shrink-0 rounded border-input accent-clovior-amber"
            />
            <span>
              <span className="font-medium">Save to Feedback Memory</span>
              <span className="ml-1 text-muted-foreground">
                — they&apos;ll see this before every future run of this
                playbook.
              </span>
            </span>
          </label>

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
            <SendButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
