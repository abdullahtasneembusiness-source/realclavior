import type { RunStatus } from "@/types/db";

type BadgeVariant =
  "default" | "secondary" | "destructive" | "outline" | "amber" | "mint";

/**
 * Run status → badge styling + label. Amber stays reserved for Feedback Memory, so
 * runs never use it: in-progress is the violet default, approved/done are mint,
 * changes-requested is destructive, and the waiting states are muted.
 */
export function runStatusBadge(status: RunStatus): {
  variant: BadgeVariant;
  label: string;
} {
  switch (status) {
    case "queued":
      return { variant: "outline", label: "Not started" };
    case "in_progress":
      return { variant: "default", label: "In progress" };
    case "submitted":
      return { variant: "secondary", label: "In review" };
    case "changes_requested":
      return { variant: "destructive", label: "Changes requested" };
    case "approved":
      return { variant: "mint", label: "Approved" };
    case "done":
      return { variant: "mint", label: "Done" };
  }
}

/** A short, human due-date like "due Jul 20" or "" when there's no due date. */
export function formatDue(dueAt: string | null): string {
  if (!dueAt) return "";
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return "";
  return `due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}
