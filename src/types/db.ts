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
  onboarded_at: string | null;
  created_at: string;
}

export type BrainCategory =
  | "voice"
  | "standards"
  | "tools"
  | "contacts"
  | "preferences"
  | "other"
  | "corrections";

export interface BrainEntry {
  id: string;
  workspace_id: string;
  category: BrainCategory;
  title: string;
  body: string | null;
  author_membership_id: string | null;
  updated_at: string;
  created_at: string;
}

/** A membership joined with the display info the UI needs. */
export interface MembershipWithWorkspace extends Membership {
  workspace: Workspace;
}

export type GoalStatus = "active" | "done" | "archived";

export interface Goal {
  id: string;
  workspace_id: string;
  label: string;
  description: string | null;
  target_date: string | null;
  progress: number;
  status: GoalStatus;
  created_at: string;
}

/** A goal plus the count of playbooks linked to it, for the list view. */
export interface GoalSummary extends Goal {
  playbookCount: number;
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
  launch_id: string | null;
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

export type LaunchStatus = "draft" | "armed" | "live" | "complete";

export interface Launch {
  id: string;
  workspace_id: string;
  name: string;
  status: LaunchStatus;
  start_date: string | null;
  is_template: boolean;
  created_at: string;
}

export interface LaunchItem {
  id: string;
  launch_id: string;
  playbook_id: string;
  membership_id: string | null;
  offset_days: number;
  due_time: string | null;
}

/** A launch item joined with the display data the builder/timeline need. */
export interface LaunchItemView extends LaunchItem {
  playbookName: string;
  ownerName: string | null;
  ownerColor: string | null;
}

/** A launch plus its item count, for the list view. */
export interface LaunchSummary extends Launch {
  itemCount: number;
}

export type ActivityVerb =
  | "started"
  | "completed_step"
  | "submitted"
  | "approved"
  | "requested_changes"
  | "added_note"
  | "launched";

export interface Activity {
  id: string;
  workspace_id: string;
  membership_id: string | null;
  verb: ActivityVerb;
  target_type: string;
  target_id: string;
  created_at: string;
}

export interface FeedbackNote {
  id: string;
  playbook_id: string;
  /** null = a standing note shown on every run; set = tied to one run only. */
  run_id: string | null;
  author_membership_id: string;
  body: string;
  pinned: boolean;
  resolved: boolean;
  created_at: string;
}

/**
 * A single AI-drafted step, before anything is persisted. Mirrors the editable
 * fields of a real PlaybookStep (no id/position — those are assigned on save).
 */
export interface PlaybookDraftStep {
  title: string;
  detail: string;
  requiresProof: boolean;
}

/**
 * The result of AI playbook generation (Phase 2b), held only in client state until
 * the founder edits it and hits "Save playbook". `confidence: "low"` means the input
 * was too vague to draft confidently — the UI surfaces `note` rather than pretending
 * the steps are solid.
 */
export interface PlaybookDraft {
  name: string;
  confidence: "high" | "low";
  note: string | null;
  steps: PlaybookDraftStep[];
}
