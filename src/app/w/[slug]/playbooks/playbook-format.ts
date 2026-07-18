import type { PlaybookSchedule, PlaybookStatus } from "@/types/db";

type BadgeVariant =
  "default" | "secondary" | "destructive" | "outline" | "amber" | "mint";

/**
 * Status → badge styling. Amber is reserved product-wide for Feedback Memory, so
 * playbook status deliberately never uses it: active is mint (it's live and good),
 * paused is a muted outline.
 */
export function statusBadge(status: PlaybookStatus): {
  variant: BadgeVariant;
  label: string;
} {
  switch (status) {
    case "active":
      return { variant: "mint", label: "Active" };
    case "paused":
      return { variant: "outline", label: "Paused" };
    case "archived":
      return { variant: "secondary", label: "Archived" };
  }
}

export function scheduleLabel(schedule: PlaybookSchedule): string {
  switch (schedule) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "custom_rrule":
      return "Custom";
    case "none":
      return "No cadence";
  }
}
