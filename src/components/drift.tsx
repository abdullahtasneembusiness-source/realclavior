import Link from "next/link";
import { LifeBuoy, Minus, TrendingDown, TrendingUp } from "lucide-react";

import type { Trend } from "@/lib/drift";

export interface CheckInSignal {
  operatorName: string;
  playbookId: string;
  playbookName: string;
  count: number;
}

/**
 * "Worth a check-in" — the coaching surface for recurring feedback. Deliberately warm:
 * it points at a pattern to talk about, never labels anyone. Renders nothing when
 * there's no signal, so it never clutters a clean screen.
 */
export function CheckInCallout({
  workspaceId,
  signals,
  showPlaybook = true,
}: {
  workspaceId: string;
  signals: CheckInSignal[];
  showPlaybook?: boolean;
}) {
  if (signals.length === 0) return null;

  return (
    <section
      data-testid="drift-checkin"
      className="bg-muted/40 flex flex-col gap-2 rounded-xl border border-border p-4"
    >
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <LifeBuoy className="size-4 text-primary" /> Worth a check-in
      </h2>
      <ul className="flex flex-col gap-2">
        {signals.map((s) => (
          <li key={`${s.playbookId}:${s.operatorName}`} className="text-sm">
            <span className="font-medium">{s.operatorName}</span>{" "}
            <span className="text-muted-foreground">
              has had similar feedback
            </span>
            {showPlaybook ? (
              <>
                {" "}
                <span className="text-muted-foreground">on</span>{" "}
                <Link
                  href={`/w/${workspaceId}/playbooks/${s.playbookId}`}
                  className="font-medium text-primary hover:underline"
                >
                  {s.playbookName}
                </Link>
              </>
            ) : (
              <span className="text-muted-foreground"> here</span>
            )}{" "}
            <span className="text-muted-foreground">
              {s.count} times this month — might be worth a direct conversation.
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A single clear direction from feedback volume. Muted and non-judgemental by design. */
export function TrendBadge({
  trend,
  recent,
}: {
  trend: Trend;
  recent: number;
}) {
  // Only surface something when there's actual signal — no badge for "steady & quiet".
  if (trend === "steady" && recent === 0) return null;

  if (trend === "up") {
    return (
      <span
        data-testid="trend-up"
        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
        title="More feedback lately — worth a check-in"
      >
        <TrendingUp className="size-3.5 text-clovior-coral" /> Worth a check-in
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span
        data-testid="trend-down"
        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
        title="Less feedback lately — trending better"
      >
        <TrendingDown className="size-3.5 text-clovior-mint" /> Trending better
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      <Minus className="size-3.5" /> Steady
    </span>
  );
}
