"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { updateRunStep, type RunState } from "../actions";
import type { RunStep } from "@/types/db";

const initialState: RunState = {};

function StepLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      <ExternalLink className="size-3" />
      <span className="max-w-[18rem] truncate">{url}</span>
    </a>
  );
}

function SaveButton({ stepId }: { stepId: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant="outline"
      disabled={pending}
      data-testid={`save-run-step-${stepId}`}
    >
      {pending ? <Loader2 className="animate-spin" /> : null} Save
    </Button>
  );
}

function EditableStep({
  workspaceId,
  runId,
  step,
  index,
}: {
  workspaceId: string;
  runId: string;
  step: RunStep;
  index: number;
}) {
  const bound = updateRunStep.bind(null, workspaceId, runId, step.id);
  const [state, formAction] = useFormState(bound, initialState);

  return (
    <form
      action={formAction}
      data-testid={`run-step-${step.id}`}
      className="flex flex-col gap-3 px-4 py-3"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {index + 1}
        </span>
        <label className="flex flex-1 items-start gap-2.5">
          <input
            type="checkbox"
            name="done"
            defaultChecked={step.done}
            data-testid={`run-step-done-${step.id}`}
            className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
          />
          <span className="flex flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
              {step.title}
              {step.requires_proof ? (
                <Badge variant="secondary" className="gap-1">
                  <ShieldCheck className="size-3" /> Proof
                </Badge>
              ) : null}
            </span>
            {step.detail ? (
              <span className="whitespace-pre-wrap text-sm text-muted-foreground">
                {step.detail}
              </span>
            ) : null}
            {step.link_url ? <StepLink url={step.link_url} /> : null}
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-2 pl-9">
        {step.requires_proof ? (
          <Input
            name="proofUrl"
            type="url"
            inputMode="url"
            placeholder="Proof link (https://…)"
            defaultValue={step.proof_url ?? ""}
            data-testid={`run-step-proof-${step.id}`}
          />
        ) : (
          <input type="hidden" name="proofUrl" value="" />
        )}
        <textarea
          name="note"
          rows={1}
          maxLength={2000}
          defaultValue={step.note ?? ""}
          placeholder="Add a note (optional)"
          className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="flex items-center gap-3">
          <SaveButton stepId={step.id} />
          {state.error ? (
            <span className="text-xs text-destructive" role="alert">
              {state.error}
            </span>
          ) : state.success ? (
            <span className="text-xs text-clovior-mint">{state.success}</span>
          ) : null}
        </div>
      </div>
    </form>
  );
}

function ReadOnlyStep({ step, index }: { step: RunStep; index: number }) {
  return (
    <div
      data-testid={`run-step-${step.id}`}
      className="flex items-start gap-3 px-4 py-3"
    >
      <span className="mt-0.5 shrink-0">
        {step.done ? (
          <CheckCircle2 className="size-5 text-clovior-mint" />
        ) : (
          <Circle className="size-5 text-muted-foreground" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              step.done
                ? "text-sm font-medium text-muted-foreground line-through"
                : "text-sm font-medium"
            }
          >
            {index + 1}. {step.title}
          </span>
          {step.requires_proof ? (
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="size-3" /> Proof
            </Badge>
          ) : null}
        </div>
        {step.detail ? (
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
            {step.detail}
          </p>
        ) : null}
        {step.proof_url ? (
          <p className="mt-1">
            <StepLink url={step.proof_url} />
          </p>
        ) : null}
        {step.note ? (
          <p className="mt-1 text-xs italic text-muted-foreground">
            “{step.note}”
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function RunChecklist({
  workspaceId,
  runId,
  steps,
  editable,
}: {
  workspaceId: string;
  runId: string;
  steps: RunStep[];
  editable: boolean;
}) {
  if (steps.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        This run has no steps.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {steps.map((step, index) =>
        editable ? (
          <EditableStep
            key={step.id}
            workspaceId={workspaceId}
            runId={runId}
            step={step}
            index={index}
          />
        ) : (
          <ReadOnlyStep key={step.id} step={step} index={index} />
        ),
      )}
    </div>
  );
}
