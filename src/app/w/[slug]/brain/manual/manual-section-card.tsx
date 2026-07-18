"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { saveManualSection, type ManualState } from "./actions";

const initialState: ManualState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null} Save
    </Button>
  );
}

export function ManualSectionCard({
  workspaceId,
  sectionKey,
  heading,
  hint,
  body,
  isAdmin,
}: {
  workspaceId: string;
  sectionKey: string;
  heading: string;
  hint: string;
  body: string | null;
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const bound = saveManualSection.bind(null, workspaceId, sectionKey);
  const [state, formAction] = useFormState(bound, initialState);
  const lastSuccess = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.success && state.success !== lastSuccess.current) {
      lastSuccess.current = state.success;
      setEditing(false);
    }
  }, [state.success]);

  return (
    <Card data-testid={`manual-section-${sectionKey}`}>
      <CardContent className="flex flex-col gap-2 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-medium">{heading}</h3>
            {!body && !editing ? (
              <p className="text-xs text-muted-foreground">{hint}</p>
            ) : null}
          </div>
          {isAdmin && !editing ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit ${heading}`}
              data-testid={`edit-section-${sectionKey}`}
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-4" />
            </Button>
          ) : null}
        </div>

        {editing ? (
          <form action={formAction} className="flex flex-col gap-2">
            <textarea
              name="body"
              rows={4}
              maxLength={3000}
              defaultValue={body ?? ""}
              autoFocus
              placeholder={hint}
              data-testid={`section-input-${sectionKey}`}
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
                size="sm"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <SaveButton />
            </div>
          </form>
        ) : body ? (
          <p className="text-foreground/90 whitespace-pre-wrap text-sm">
            {body}
          </p>
        ) : (
          <p className="text-muted-foreground/70 text-sm italic">
            {isAdmin ? "Not filled in yet." : "Nothing here yet."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
