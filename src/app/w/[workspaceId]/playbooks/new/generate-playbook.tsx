"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Info,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPlaybookFromDraft } from "../actions";
import type { PlaybookDraft } from "@/types/db";

interface EditStep {
  key: string;
  title: string;
  detail: string;
  requiresProof: boolean;
}

let keySeq = 0;
function newKey() {
  keySeq += 1;
  return `s${keySeq}`;
}

function toEditSteps(draft: PlaybookDraft): EditStep[] {
  return draft.steps.map((s) => ({
    key: newKey(),
    title: s.title,
    detail: s.detail,
    requiresProof: s.requiresProof,
  }));
}

const textareaClass =
  "flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function GeneratePlaybook({
  workspaceId,
  aiAvailable,
}: {
  workspaceId: string;
  aiAvailable: boolean;
}) {
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [draft, setDraft] = useState<PlaybookDraft | null>(null);
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<EditStep[]>([]);

  const [saving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  async function generate() {
    setGenError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/playbooks/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, description }),
      });
      const data = (await res.json()) as {
        draft?: PlaybookDraft;
        error?: string;
      };
      if (!res.ok || !data.draft) {
        setGenError(data.error ?? "Couldn't generate that. Try again.");
        return;
      }
      setDraft(data.draft);
      setName(data.draft.name);
      setSteps(toEditSteps(data.draft));
    } catch {
      setGenError("Couldn't reach the generator. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  function patchStep(key: string, patch: Partial<EditStep>) {
    setSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    );
  }

  function removeStep(key: string) {
    setSteps((prev) => prev.filter((s) => s.key !== key));
  }

  function moveStep(index: number, dir: "up" | "down") {
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= steps.length) return;
    setSteps((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { key: newKey(), title: "", detail: "", requiresProof: false },
    ]);
  }

  function startOver() {
    setDraft(null);
    setSteps([]);
    setName("");
    setSaveError(null);
  }

  function save() {
    setSaveError(null);
    const cleaned = steps
      .map((s) => ({
        title: s.title.trim(),
        detail: s.detail.trim(),
        requiresProof: s.requiresProof,
      }))
      .filter((s) => s.title.length > 0);

    if (name.trim().length < 2) {
      setSaveError("Give the playbook a name.");
      return;
    }
    if (cleaned.length === 0) {
      setSaveError("Keep at least one step with a title.");
      return;
    }

    startSaving(async () => {
      const result = await createPlaybookFromDraft(workspaceId, {
        name: name.trim(),
        steps: cleaned,
      });
      // On success the action redirects into the new editor; only errors return here.
      if (result?.error) setSaveError(result.error);
    });
  }

  // ---- Draft review ----------------------------------------------------------
  if (draft) {
    return (
      <div className="flex flex-col gap-5" data-testid="draft-review">
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" />
          <span>
            This is a draft — nothing is saved until you hit{" "}
            <span className="font-medium text-foreground">Save playbook</span>.
            Edit anything below.
          </span>
        </div>

        {draft.confidence === "low" ? (
          <div
            data-testid="draft-low-confidence"
            className="flex items-start gap-2 rounded-lg border border-border bg-muted px-3 py-2.5 text-sm"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="font-medium">Not much to go on.</span>{" "}
              {draft.note ??
                "The description was a little thin, so this is a rough starting point — add the specifics your team needs."}
            </span>
          </div>
        ) : draft.note ? (
          <p className="text-sm text-muted-foreground">{draft.note}</p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="draft-name">Playbook name</Label>
          <Input
            id="draft-name"
            data-testid="draft-name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Steps</h2>
            <span className="text-sm text-muted-foreground">
              {steps.length} {steps.length === 1 ? "step" : "steps"}
            </span>
          </div>

          {steps.map((step, index) => (
            <Card key={step.key} data-testid={`draft-step-${index}`}>
              <CardContent className="flex gap-3 p-4">
                <div className="bg-primary/12 mt-1 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-primary">
                  {index + 1}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Input
                    aria-label={`Step ${index + 1} title`}
                    data-testid={`draft-step-title-${index}`}
                    value={step.title}
                    maxLength={140}
                    placeholder="Action-first title, e.g. Export video at 1080p"
                    onChange={(e) =>
                      patchStep(step.key, { title: e.target.value })
                    }
                  />
                  <textarea
                    aria-label={`Step ${index + 1} detail`}
                    rows={2}
                    maxLength={2000}
                    value={step.detail}
                    placeholder="Optional detail — anything the operator needs to get it right."
                    className={textareaClass}
                    onChange={(e) =>
                      patchStep(step.key, { detail: e.target.value })
                    }
                  />
                  <label className="flex items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={step.requiresProof}
                      className="size-4 rounded border-input accent-primary"
                      onChange={(e) =>
                        patchStep(step.key, { requiresProof: e.target.checked })
                      }
                    />
                    <span>
                      Require proof
                      <span className="ml-1 text-muted-foreground">
                        — must attach a link or file to complete
                      </span>
                    </span>
                  </label>
                </div>
                <div className="flex shrink-0 flex-col">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Move step up"
                    disabled={index === 0}
                    onClick={() => moveStep(index, "up")}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Move step down"
                    disabled={index === steps.length - 1}
                    onClick={() => moveStep(index, "down")}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete step"
                    data-testid={`draft-delete-${index}`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeStep(step.key)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outline"
            className="w-fit"
            data-testid="draft-add-step"
            onClick={addStep}
          >
            <Plus /> Add step
          </Button>
        </div>

        {saveError ? (
          <p className="text-sm text-destructive" role="alert">
            {saveError}
          </p>
        ) : null}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button variant="ghost" onClick={startOver} disabled={saving}>
            <RotateCcw /> Start over
          </Button>
          <Button data-testid="draft-save" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />} Save
            playbook
          </Button>
        </div>
      </div>
    );
  }

  // ---- Description input ------------------------------------------------------
  return (
    <div className="flex flex-col gap-4">
      {!aiAvailable ? (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted px-3 py-2.5 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            AI generation isn&apos;t set up on this workspace yet. You can still{" "}
            <Link
              href={`/w/${workspaceId}/playbooks`}
              className="font-medium text-primary hover:underline"
            >
              build a playbook manually
            </Link>
            .
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="generate-input">Describe the task</Label>
        <textarea
          id="generate-input"
          data-testid="generate-input"
          rows={7}
          maxLength={8000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Paste a Loom transcript, a voice-note dump, or just describe how this task should be done, in your own words. The messier the better — that's what the draft is for."
          className={textareaClass}
        />
      </div>

      {genError ? (
        <div
          data-testid="generate-error"
          className="border-destructive/40 bg-destructive/5 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span className="text-foreground/90">{genError}</span>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          data-testid="generate-submit"
          onClick={generate}
          disabled={generating || description.trim().length < 10}
        >
          {generating ? (
            <>
              <Loader2 className="animate-spin" /> Drafting…
            </>
          ) : (
            <>
              <Sparkles /> {genError ? "Try again" : "Generate draft"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
