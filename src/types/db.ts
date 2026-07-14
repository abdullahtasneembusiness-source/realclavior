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
