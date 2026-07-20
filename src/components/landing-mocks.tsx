import {
  CalendarDays,
  CheckCircle2,
  ListChecks,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Lightweight, on-brand UI mockups for the marketing landing page. These stand in
 * for real product screenshots — built from the same design tokens so they read as
 * the actual app. Swap any of these for a real <Image> when screenshots exist.
 */

export function Avatar({ initial, color }: { initial: string; color: string }) {
  return (
    <span
      className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {initial}
    </span>
  );
}

const pillTones: Record<string, string> = {
  review: "bg-clovior-mint/15 text-clovior-mint",
  warn: "bg-destructive/12 text-destructive",
  done: "bg-primary/10 text-primary",
  amber: "bg-clovior-amber/15 text-clovior-amber",
  muted: "bg-secondary text-muted-foreground",
};

export function Pill({
  tone = "muted",
  children,
}: {
  tone?: keyof typeof pillTones | string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 font-mono text-[0.625rem] font-medium leading-none",
        pillTones[tone] ?? pillTones.muted,
      )}
    >
      {children}
    </span>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "review" | "warn";
}) {
  const color =
    tone === "warn"
      ? "text-clovior-coral"
      : tone === "review"
        ? "text-clovior-mint"
        : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="section-label truncate">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-2xl font-bold leading-none tabular-nums sm:text-3xl",
          color,
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function CommandViewMock() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h4 className="font-display text-xl font-bold tracking-tight">
          Command View
        </h4>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Everything that needs you, in one place.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Active runs" value="3" tone="default" />
        <Stat label="Awaiting review" value="2" tone="review" />
        <Stat label="Overdue" value="0" tone="warn" />
      </div>
      <div>
        <p className="section-label mb-2">Needs your attention · 2</p>
        <div className="flex flex-col gap-2">
          {[
            { i: "M", c: "#2E7D52", n: "Maya", t: "Weekly newsletter" },
            { i: "J", c: "#1F3D2B", n: "Jordan", t: "Podcast publishing" },
          ].map((r) => (
            <div
              key={r.n}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2"
            >
              <Avatar initial={r.i} color={r.c} />
              <span className="min-w-0 flex-1 truncate text-sm">
                <span className="font-medium">{r.n}</span>{" "}
                <span className="text-muted-foreground">submitted {r.t}</span>
              </span>
              <Pill tone="review">In review</Pill>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LiveFeedMock() {
  const rows = [
    { i: "M", c: "#2E7D52", n: "Maya", t: "finished Weekly newsletter", ago: "2m" },
    { i: "R", c: "#c0442e", n: "Reza", t: "started Client onboarding", ago: "1h" },
    { i: "J", c: "#1F3D2B", n: "Jordan", t: "approved Podcast clips", ago: "3h" },
    { i: "S", c: "#2E7D52", n: "Sam", t: "finished Lead magnet funnel", ago: "5h" },
  ];
  return (
    <div className="flex flex-col gap-3">
      <p className="section-label">Live feed · today</p>
      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.n} className="flex items-center gap-2.5 text-sm">
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

export function FeedbackMemoryMock() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Sparkles className="text-clovior-amber size-4" />
        <span className="text-sm font-medium">Publish the newsletter</span>
        <Pill tone="amber">Feedback Memory</Pill>
      </div>
      <div className="border-clovior-amber/30 bg-clovior-amber/5 flex flex-col gap-2 rounded-lg border p-3">
        <p className="text-sm">
          <span className="text-clovior-amber">•</span> Double-check every link
          before sending. Broken links went out twice.
        </p>
        <p className="section-label">Shows first, every run · saved once</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="text-clovior-mint size-3.5" />
        Correction stuck. It hasn&apos;t come back since.
      </div>
    </div>
  );
}

function PlaybookCard({
  name,
  meta,
  owner,
  color,
  status,
  tone,
}: {
  name: string;
  meta: string;
  owner: string;
  color: string;
  status: string;
  tone: string;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-tight">{name}</span>
        <Pill tone={tone}>{status}</Pill>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ListChecks className="size-3.5" />
          {meta}
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <Avatar initial={owner[0]} color={color} />
          {owner}
        </span>
      </div>
    </div>
  );
}

export function PlaybooksMock() {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="section-label">Playbooks</p>
      <PlaybookCard
        name="Publish a weekly video"
        meta="6 steps · 45 min"
        owner="Maya"
        color="#2E7D52"
        status="Active"
        tone="done"
      />
      <PlaybookCard
        name="Onboard a new client"
        meta="9 steps · weekly"
        owner="Reza"
        color="#c0442e"
        status="Active"
        tone="done"
      />
    </div>
  );
}

export function BrainMock() {
  const items = [
    {
      t: "Brand voice in 3 words",
      c: "Voice",
      b: "Punchy, plain, confident. Short sentences, no corporate filler.",
    },
    {
      t: "New hire onboarding doc",
      c: "Standards",
      b: "Week one: the tools, the rhythm, and how we actually ship.",
    },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      <p className="section-label">Team Brain</p>
      {items.map((it) => (
        <div
          key={it.t}
          className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3"
        >
          <span className="text-sm font-medium leading-tight">{it.t}</span>
          <span className="text-xs text-muted-foreground">{it.c}</span>
          <p className="line-clamp-2 text-xs text-muted-foreground">{it.b}</p>
        </div>
      ))}
    </div>
  );
}

export function LaunchesMock() {
  const items = [
    { t: "Warm-up email sequence", d: "Mon", pill: "Done", tone: "done" },
    { t: "Cart opens", d: "Wed", pill: "Live", tone: "review" },
    { t: "Webinar replay push", d: "Fri", pill: "Queued", tone: "muted" },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <p className="section-label">Q3 course launch</p>
        <Pill tone="review">Live</Pill>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {items.map((it, idx) => (
          <div
            key={it.t}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 text-sm",
              idx > 0 && "border-t border-border",
            )}
          >
            <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{it.t}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {it.d}
            </span>
            <Pill tone={it.tone}>{it.pill}</Pill>
          </div>
        ))}
      </div>
    </div>
  );
}

function Goal({
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
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function GoalsMock() {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="section-label">Goals · this quarter</p>
      <Goal name="Hit 10k subscribers" pct={62} color="#1F3D2B" />
      <Goal name="Ship 12 videos" pct={75} color="#2E7D52" />
      <Goal name="Launch the cohort" pct={40} color="#e8a317" />
    </div>
  );
}
