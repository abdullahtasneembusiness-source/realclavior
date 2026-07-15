import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  title,
  description,
  phase,
  accent = "violet",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  phase: string;
  accent?: "violet" | "amber" | "mint" | "coral";
}) {
  const accentClass = {
    violet: "bg-clovior-violet/10 text-clovior-violet",
    amber: "bg-clovior-amber/10 text-clovior-amber",
    mint: "bg-clovior-mint/10 text-clovior-mint",
    coral: "bg-clovior-coral/10 text-clovior-coral",
  }[accent];

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-20 text-center">
      <div
        className={`inline-flex size-12 items-center justify-center rounded-2xl ${accentClass}`}
      >
        <Icon className="size-6" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
        {phase}
      </span>
    </div>
  );
}
