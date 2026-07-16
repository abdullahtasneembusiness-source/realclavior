/**
 * Shared domain types. These mirror the Supabase schema (Section 5 of the build
 * doc). When the schema grows, prefer regenerating types via the Supabase CLI
 * (`supabase gen types typescript`) — these hand-written types cover what Phase 1
 * needs without pulling the full generated file in yet.
 */

export type Role = "founder" | "manager" | "operator";
export type MembershipStatus = "active" | "invited" | "archived";
export type WorkspacePlan = "trial" | "solo" | "team" | "scale";

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  plan: WorkspacePlan;
  created_at: string;
}

export interface Membership {
  id: string;
  workspace_id: string;
  user_id: string | null;
  role: Role;
  title: string | null;
  color: string | null;
  status: MembershipStatus;
  invited_email: string | null;
  invited_at: string | null;
  created_at: string;
}

/** A membership joined with the display info the UI needs. */
export interface MembershipWithWorkspace extends Membership {
  workspace: Workspace;
}

export type PlaybookStatus = "active" | "paused" | "archived";
export type PlaybookSchedule =
  "none" | "daily" | "weekly" | "monthly" | "custom_rrule";

export interface Playbook {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  owner_membership_id: string | null;
  goal_id: string | null;
  schedule: PlaybookSchedule;
  schedule_rrule: string | null;
  est_minutes: number | null;
  status: PlaybookStatus;
  created_at: string;
  updated_at: string;
}

export interface PlaybookStep {
  id: string;
  playbook_id: string;
  position: number;
  title: string;
  detail: string | null;
  link_url: string | null;
  requires_proof: boolean;
  created_at: string;
}

/** A playbook plus the derived display data the list view needs. */
export interface PlaybookSummary extends Playbook {
  stepCount: number;
  ownerName: string | null;
  ownerColor: string | null;
}

export type RunStatus =
  | "queued"
  | "in_progress"
  | "submitted"
  | "approved"
  | "changes_requested"
  | "done";

export interface Run {
  id: string;
  playbook_id: string;
  membership_id: string;
  title: string | null;
  due_at: string | null;
  status: RunStatus;
  started_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface RunStep {
  id: string;
  run_id: string;
  playbook_step_id: string;
  position: number;
  title: string;
  detail: string | null;
  link_url: string | null;
  requires_proof: boolean;
  done: boolean;
  done_at: string | null;
  proof_url: string | null;
  note: string | null;
}

/** A run plus derived display data for the operator's list. */
export interface RunSummary extends Run {
  playbookName: string;
  totalSteps: number;
  doneSteps: number;
  assigneeName: string | null;
  assigneeColor: string | null;
}
