import type { LaunchStatus } from "@/types/db";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

/** Status pill styling for a launch, consistent with the playbook/run badges. */
export function launchStatusBadge(status: LaunchStatus): {
  label: string;
  variant: BadgeVariant;
} {
  switch (status) {
    case "draft":
      return { label: "Draft", variant: "secondary" };
    case "armed":
      return { label: "Armed", variant: "outline" };
    case "live":
      return { label: "Live", variant: "default" };
    case "complete":
      return { label: "Complete", variant: "secondary" };
  }
}

/** "Day 0", "Day +2", "Day -3" from an offset relative to the launch start. */
export function dayLabel(offsetDays: number): string {
  if (offsetDays === 0) return "Day 0";
  return offsetDays > 0 ? `Day +${offsetDays}` : `Day ${offsetDays}`;
}
