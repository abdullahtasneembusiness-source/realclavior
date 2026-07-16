"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { addStep, deleteStep, moveStep, type PlaybookState } from "../actions";
import type { PlaybookStep } from "@/types/db";
import { StepFields } from "./step-fields";
import { EditStepDialog } from "./edit-step-dialog";

const initialState: PlaybookState = {};

function StepRow({
  workspaceId,
  playbookId,
  step,
  index,
  total,
}: {
  workspaceId: string;
  playbookId: string;
  step: PlaybookStep;
  index: number;
  total: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<PlaybookState>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div
      data-testid={`step-row-${step.id}`}
      className="flex items-start gap-3 px-4 py-3"
    >
      <div className="bg-primary/12 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-primary">
        {index + 1}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{step.title}</span>
          {step.requires_proof ? (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="size-3" /> Proof
            </Badge>
          ) : null}
        </div>
        {step.detail ? (
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
            {step.detail}
          </p>
        ) : null}
        {step.link_url ? (
          <a
            href={step.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="size-3" />
            <span className="max-w-[16rem] truncate">{step.link_url}</span>
          </a>
        ) : null}
        {error ? (
          <p className="mt-1 text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center">
        {isPending ? (
          <Loader2 className="mx-2 size-4 animate-spin text-muted-foreground" />
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Move step up"
          data-testid={`move-up-${step.id}`}
          disabled={index === 0 || isPending}
          onClick={() =>
            run(() => moveStep(workspaceId, playbookId, step.id, "up"))
          }
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Move step down"
          data-testid={`move-down-${step.id}`}
          disabled={index === total - 1 || isPending}
          onClick={() =>
            run(() => moveStep(workspaceId, playbookId, step.id, "down"))
          }
        >
          <ArrowDown className="size-4" />
        </Button>
        <EditStepDialog
          workspaceId={workspaceId}
          playbookId={playbookId}
          step={step}
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete step"
          data-testid={`delete-step-${step.id}`}
          disabled={isPending}
          className="text-muted-foreground hover:text-destructive"
          onClick={() =>
            run(() => deleteStep(workspaceId, playbookId, step.id))
          }
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} data-testid="add-step-submit">
      {pending ? (
        <>
          <Loader2 className="animate-spin" /> Adding…
        </>
      ) : (
        <>
          <Plus /> Add step
        </>
      )}
    </Button>
  );
}

function AddStepForm({
  workspaceId,
  playbookId,
}: {
  workspaceId: string;
  playbookId: string;
}) {
  const bound = addStep.bind(null, workspaceId, playbookId);
  const [state, formAction] = useFormState(bound, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const lastSuccess = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.success && state.success !== lastSuccess.current) {
      lastSuccess.current = state.success;
      formRef.current?.reset();
      // Return focus to the title so several steps can be typed in a row.
      formRef.current
        ?.querySelector<HTMLInputElement>('input[name="title"]')
        ?.focus();
    }
  }, [state.success]);

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <StepFields idPrefix="add-step" />
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          <div className="flex justify-end">
            <AddButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function StepsEditor({
  workspaceId,
  playbookId,
  steps,
}: {
  workspaceId: string;
  playbookId: string;
  steps: PlaybookStep[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Steps</h2>
        <span
          className="text-sm text-muted-foreground"
          data-testid="step-count"
        >
          {steps.length} {steps.length === 1 ? "step" : "steps"}
        </span>
      </div>

      {steps.length > 0 ? (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {steps.map((step, index) => (
            <StepRow
              key={step.id}
              workspaceId={workspaceId}
              playbookId={playbookId}
              step={step}
              index={index}
              total={steps.length}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No steps yet. Add the first one below — the exact thing the operator
          does first.
        </p>
      )}

      <AddStepForm workspaceId={workspaceId} playbookId={playbookId} />
    </section>
  );
}
