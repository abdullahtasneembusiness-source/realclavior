import type { LucideIcon } from "lucide-react";
import {
  Brain,
  LayoutDashboard,
  ListChecks,
  Rocket,
  Target,
  Users,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: (workspaceId: string) => string;
  icon: LucideIcon;
  /** Matches the current pathname against this segment, "" means the workspace root. */
  segment: string;
  /** Sidebar section this item sits under (admin nav only; operator nav is flat). */
  group?: string;
}

/**
 * Live workspace data the admin sidebar decorates its nav with: count chips on a
 * few rows and a short list of recently-touched playbooks nested under Playbooks.
 * Fetched server-side in the workspace layout; purely presentational.
 */
export interface SidebarExtras {
  recentPlaybooks: { id: string; name: string }[];
  counts: {
    playbooks: number;
    team: number;
    launches: number;
  };
}

/**
 * Founder/manager nav: the full 6-section product surface (Section 6, Phase 1-5).
 * Operator nav: deliberately 2 items — this isn't the admin shell with things hidden,
 * it's a genuinely simpler shell built for a different job (Section 3 of the doc).
 */
export const ADMIN_NAV: NavItem[] = [
  {
    label: "Command View",
    href: (id) => `/w/${id}`,
    icon: LayoutDashboard,
    segment: "",
    group: "Workspace",
  },
  {
    label: "Playbooks",
    href: (id) => `/w/${id}/playbooks`,
    icon: ListChecks,
    segment: "playbooks",
    group: "Workspace",
  },
  {
    label: "Team",
    href: (id) => `/w/${id}/team`,
    icon: Users,
    segment: "team",
    group: "Workspace",
  },
  {
    label: "Goals",
    href: (id) => `/w/${id}/goals`,
    icon: Target,
    segment: "goals",
    group: "Growth",
  },
  {
    label: "Launches",
    href: (id) => `/w/${id}/launches`,
    icon: Rocket,
    segment: "launches",
    group: "Growth",
  },
  {
    label: "Brain",
    href: (id) => `/w/${id}/brain`,
    icon: Brain,
    segment: "brain",
    group: "Growth",
  },
];

export const OPERATOR_NAV: NavItem[] = [
  {
    label: "My Playbooks",
    href: (id) => `/w/${id}`,
    icon: ListChecks,
    segment: "",
  },
  {
    label: "Brain",
    href: (id) => `/w/${id}/brain`,
    icon: Brain,
    segment: "brain",
  },
];
