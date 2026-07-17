"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  PartyPopper,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { markOnboarded } from "./actions";

export interface OnboardingItem {
  id: string;
  label: string;
  title: string;
  body: string | null;
}

export function OnboardingFlow({
  workspaceId,
  items,
  homeHref,
}: {
  workspaceId: string;
  items: OnboardingItem[];
  homeHref: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [finishing, startFinishing] = useTransition();
  const finished = step >= items.length;

  // Persist completion, THEN navigate — home redirects back here while onboarded_at is
  // still null, so the write must land before we leave (awaiting it closes that race).
  function finish() {
    startFinishing(async () => {
      await markOnboarded(workspaceId);
      router.replace(homeHref);
    });
  }

  if (finished) {
    return (
      <Card data-testid="onboarding-complete">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="bg-clovior-mint/15 flex size-12 items-center justify-center rounded-full text-clovior-mint">
            <PartyPopper className="size-6" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              You&apos;re set up
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You&apos;ve got the context you need. Your playbooks are waiting.
            </p>
          </div>
          <Button
            data-testid="onboarding-finish"
            onClick={finish}
            disabled={finishing}
          >
            {finishing ? <Loader2 className="animate-spin" /> : null} Go to my
            workspace <ArrowRight />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const item = items[step];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${(step / items.length) * 100}%` }}
          />
        </div>
        <span
          className="shrink-0 text-sm tabular-nums text-muted-foreground"
          data-testid="onboarding-progress"
        >
          {step + 1} of {items.length}
        </span>
      </div>

      <Card data-testid="onboarding-item">
        <CardContent className="flex min-h-[12rem] flex-col gap-3 p-6">
          <span className="bg-primary/10 w-fit rounded-full px-2.5 py-0.5 text-xs font-medium text-primary">
            {item.label}
          </span>
          <h2 className="text-lg font-semibold tracking-tight">{item.title}</h2>
          {item.body ? (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {item.body}
            </p>
          ) : (
            <p className="text-muted-foreground/70 text-sm italic">
              No extra detail — ask if anything&apos;s unclear.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ArrowLeft /> Back
        </Button>
        <Button
          data-testid="onboarding-next"
          onClick={() => setStep((s) => s + 1)}
        >
          <Check /> {step === items.length - 1 ? "Finish" : "Mark as read"}
        </Button>
      </div>
    </div>
  );
}
