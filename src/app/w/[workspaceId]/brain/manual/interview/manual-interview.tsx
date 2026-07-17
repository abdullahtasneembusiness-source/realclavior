"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { saveManualDraft } from "../actions";
import { INTERVIEW_QUESTIONS, MANUAL_SECTIONS } from "../sections";
import type { ManualSectionKey } from "@/types/db";

type Draft = Record<ManualSectionKey, string>;

const textareaClass =
  "flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function ManualInterview({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(
    INTERVIEW_QUESTIONS.map(() => ""),
  );
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  const total = INTERVIEW_QUESTIONS.length;

  async function generate() {
    setGenError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/manual/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          answers: INTERVIEW_QUESTIONS.map((item, i) => ({
            q: item.q,
            a: answers[i] ?? "",
          })),
        }),
      });
      const data = (await res.json()) as { sections?: Draft; error?: string };
      if (!res.ok || !data.sections) {
        setGenError(data.error ?? "Couldn't draft that. Try again.");
        return;
      }
      setDraft(data.sections);
    } catch {
      setGenError("Couldn't reach the writer. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  function save() {
    if (!draft) return;
    setSaveError(null);
    startSaving(async () => {
      const result = await saveManualDraft(workspaceId, draft);
      if (result?.error) setSaveError(result.error);
      else router.push(`/w/${workspaceId}/brain/manual`);
    });
  }

  // ---- Review -----------------------------------------------------------------
  if (draft) {
    return (
      <div className="flex flex-col gap-5" data-testid="manual-review">
        <div className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          Here&apos;s your manual, in your voice. Edit anything — nothing saves
          until you hit Save.
        </div>
        {MANUAL_SECTIONS.map((s) => (
          <div key={s.key} className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor={`rev-${s.key}`}>
              {s.heading}
            </label>
            <textarea
              id={`rev-${s.key}`}
              data-testid={`review-${s.key}`}
              rows={3}
              maxLength={3000}
              value={draft[s.key]}
              onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })}
              className={textareaClass}
            />
          </div>
        ))}
        {saveError ? (
          <p className="text-sm text-destructive" role="alert">
            {saveError}
          </p>
        ) : null}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            variant="ghost"
            onClick={() => setDraft(null)}
            disabled={saving}
          >
            <ArrowLeft /> Back to questions
          </Button>
          <Button data-testid="manual-save" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />} Save
            manual
          </Button>
        </div>
      </div>
    );
  }

  // ---- Interview --------------------------------------------------------------
  const question = INTERVIEW_QUESTIONS[step];
  const isLast = step === total - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${(step / total) * 100}%` }}
          />
        </div>
        <span
          className="shrink-0 text-sm tabular-nums text-muted-foreground"
          data-testid="interview-progress"
        >
          {step + 1} of {total}
        </span>
      </div>

      <Card data-testid="interview-question">
        <CardContent className="flex flex-col gap-3 p-6">
          <h2 className="text-lg font-medium leading-snug">{question.q}</h2>
          <textarea
            data-testid="interview-answer"
            rows={4}
            maxLength={2000}
            value={answers[step]}
            autoFocus
            placeholder="However it comes out — a sentence or two is plenty."
            onChange={(e) => {
              const next = [...answers];
              next[step] = e.target.value;
              setAnswers(next);
            }}
            className={textareaClass}
          />
        </CardContent>
      </Card>

      {genError ? (
        <div
          data-testid="interview-error"
          className="border-destructive/40 bg-destructive/5 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span className="text-foreground/90">{genError}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft /> Back
          </Button>
        ) : (
          <Button variant="ghost" asChild>
            <Link href={`/w/${workspaceId}/brain/manual`}>Write it myself</Link>
          </Button>
        )}

        {isLast ? (
          <Button
            data-testid="interview-generate"
            onClick={generate}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="animate-spin" /> Writing…
              </>
            ) : (
              <>
                <Sparkles /> {genError ? "Try again" : "Draft my manual"}
              </>
            )}
          </Button>
        ) : (
          <Button
            data-testid="interview-next"
            onClick={() => setStep((s) => s + 1)}
          >
            Next <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}
