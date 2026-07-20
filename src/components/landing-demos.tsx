import { CalendarDays, Check, CheckCircle2, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, Pill } from "@/components/landing-mocks";

/**
 * Animated product demos for the landing page: looping, choreographed pure-CSS
 * scenes (keyframes live in globals.css) that show the product doing its job in
 * real time — a cursor checking off a run, a correction pinning to a playbook,
 * the live feed streaming in. No video files, no client JS, crisp at any size.
 *
 * The base DOM is the COMPLETED scene; every bit of motion sits behind
 * prefers-reduced-motion, so non-animated contexts render a full screenshot.
 */

/** The demo pointer: a small cursor arrow with a click-pulse ring. */
function Cursor({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("demo-cursor", className)}>
      <span className="demo-cursor-ring" />
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        className="drop-shadow-sm"
      >
        <path
          d="M2.5 1.5v11.2l3-2.7 1.9 4.5 2.2-.9-1.9-4.5h4z"
          fill="#16150F"
          stroke="#FFFFFF"
          strokeWidth="1.1"
        />
      </svg>
    </span>
  );
}

/* ---- Playbook run: cursor checks three steps, run gets submitted. ---------- */

function StepRow({
  label,
  checkClass,
}: {
  label: string;
  checkClass: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
      <span className="relative flex size-4 shrink-0 items-center justify-center rounded border border-border bg-background">
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded bg-primary",
            checkClass,
          )}
        >
          <Check className="size-3 text-primary-foreground" strokeWidth={3} />
        </span>
      </span>
      <span className="truncate text-sm">{label}</span>
    </div>
  );
}

export function PlaybookRunDemo() {
  return (
    <div className="relative flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="section-label">Publish a weekly video · run</p>
        <span className="demo-pb-submitted">
          <Pill tone="review">Submitted for review</Pill>
        </span>
      </div>
      <StepRow label="Export the final cut at 1080p" checkClass="demo-check-1" />
      <StepRow label="Write title and description" checkClass="demo-check-2" />
      <StepRow label="Schedule and attach the link" checkClass="demo-check-3" />
      <Cursor className="demo-pb-cursor" />
    </div>
  );
}

/* ---- Feedback Memory: a correction gets pinned, amber, permanent. ---------- */

export function FeedbackMemoryDemo() {
  return (
    <div className="relative flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Sparkles className="text-clovior-amber size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          Publish the newsletter
        </span>
        <span className="demo-fm-press rounded-md border border-border px-2 py-1 text-xs font-medium">
          Request changes
        </span>
      </div>
      <div className="demo-fm-note border-clovior-amber/30 bg-clovior-amber/5 flex flex-col gap-2 rounded-lg border p-3">
        <p className="text-sm">
          <span className="text-clovior-amber">•</span> Double-check every link
          before sending. Broken links went out twice.
        </p>
        <span className="demo-fm-chip self-start">
          <Pill tone="amber">Saved to Feedback Memory</Pill>
        </span>
      </div>
      <div className="demo-fm-line flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="text-clovior-mint size-3.5 shrink-0" />
        Shows first on every future run. It doesn&apos;t come back.
      </div>
      <Cursor className="demo-fm-cursor" />
    </div>
  );
}

/* ---- Live feed: activity streams in, row by row. --------------------------- */

const FEED = [
  { i: "M", c: "#2E7D52", n: "Maya", t: "finished Weekly newsletter", ago: "2m" },
  { i: "R", c: "#c0442e", n: "Reza", t: "started Client onboarding", ago: "1h" },
  { i: "J", c: "#1F3D2B", n: "Jordan", t: "approved Podcast clips", ago: "3h" },
  { i: "S", c: "#2E7D52", n: "Sam", t: "finished Lead magnet funnel", ago: "5h" },
];

export function LiveFeedDemo() {
  return (
    <div className="flex flex-col gap-3">
      <p className="section-label">Live feed · today</p>
      <div className="flex flex-col gap-2">
        {FEED.map((r, idx) => (
          <div
            key={r.n}
            className="demo-rise flex items-center gap-2.5 text-sm"
            style={{ animationDelay: `${idx * 1.1}s` }}
          >
            <Avatar initial={r.i} color={r.c} />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium">{r.n}</span>{" "}
              <span className="text-muted-foreground">{r.t}</span>
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {r.ago}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Team Brain: a standard gets written down, once. ------------------------ */

export function BrainDemo() {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="section-label">Team Brain</p>
      <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
        <span className="text-sm font-medium leading-tight">
          Brand voice in 3 words
        </span>
        <span className="text-xs text-muted-foreground">Voice</span>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          Punchy, plain, confident. Short sentences, no corporate filler.
        </p>
      </div>
      <div
        className="demo-rise flex flex-col gap-1 rounded-lg border border-border bg-card p-3"
        style={{ animationDelay: "1.6s" }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium leading-tight">
            New hire onboarding doc
          </span>
          <Pill tone="done">Saved</Pill>
        </div>
        <span className="text-xs text-muted-foreground">Standards</span>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          Week one: the tools, the rhythm, and how we actually ship.
        </p>
      </div>
    </div>
  );
}

/* ---- Launch: items land on the timeline, cart flips to Live. --------------- */

const LAUNCH = [
  { t: "Warm-up email sequence", d: "Mon", pill: "Done", tone: "done" },
  { t: "Cart opens", d: "Wed", pill: "flip", tone: "review" },
  { t: "Webinar replay push", d: "Fri", pill: "Queued", tone: "muted" },
];

export function LaunchDemo() {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <p className="section-label">Q3 course launch</p>
        <Pill tone="review">Live</Pill>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {LAUNCH.map((it, idx) => (
          <div
            key={it.t}
            className={cn(
              "demo-rise flex items-center gap-2.5 px-3 py-2.5 text-sm",
              idx > 0 && "border-t border-border",
            )}
            style={{ animationDelay: `${idx * 0.9}s` }}
          >
            <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{it.t}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {it.d}
            </span>
            {it.pill === "flip" ? (
              <span className="relative inline-grid">
                <span className="demo-flip-out [grid-area:1/1]">
                  <Pill tone="muted">Queued</Pill>
                </span>
                <span className="demo-flip-in [grid-area:1/1]">
                  <Pill tone="review">Live</Pill>
                </span>
              </span>
            ) : (
              <Pill tone={it.tone}>{it.pill}</Pill>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Goals: progress bars fill toward the quarter's targets. ---------------- */

function GoalRow({
  name,
  pct,
  color,
}: {
  name: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{name}</span>
        <span className="font-mono text-sm font-semibold tabular-nums">
          {pct}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="demo-goal-bar h-full rounded-full"
          style={
            {
              width: `${pct}%`,
              backgroundColor: color,
              "--fill": `${pct}%`,
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}

export function GoalsDemo() {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="section-label">Goals · this quarter</p>
      <GoalRow name="Hit 10k subscribers" pct={62} color="#1F3D2B" />
      <GoalRow name="Ship 12 videos" pct={75} color="#2E7D52" />
      <GoalRow name="Launch the cohort" pct={40} color="#e8a317" />
    </div>
  );
}
