-- Clovior initial schema (Phase 1 / Section 5 of the master build doc)

create extension if not exists "pgcrypto" with schema extensions;

-- Workspaces (one per founder's business)
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'trial' check (plan in ('trial','solo','team','scale')),
  created_at timestamptz not null default now()
);

-- Users belong to workspaces with roles.
-- user_id is nullable to support inviting someone by email before they have an account.
create table memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('founder','manager','operator')),
  title text,
  color text,
  status text not null default 'invited' check (status in ('active','invited','archived')),
  invited_email text,
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index memberships_workspace_id_idx on memberships(workspace_id);
create index memberships_user_id_idx on memberships(user_id);

-- Goals: founder's monthly/quarterly targets
create table goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  label text not null,
  description text,
  target_date date,
  progress smallint not null default 0 check (progress between 0 and 100),
  status text not null default 'active' check (status in ('active','done','archived')),
  created_at timestamptz not null default now()
);
create index goals_workspace_id_idx on goals(workspace_id);

-- Playbooks: the living workflow templates
create table playbooks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  owner_membership_id uuid references memberships(id) on delete set null,
  goal_id uuid references goals(id) on delete set null,
  schedule text not null default 'none' check (schedule in ('none','daily','weekly','monthly','custom_rrule')),
  schedule_rrule text,
  est_minutes integer,
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index playbooks_workspace_id_idx on playbooks(workspace_id);
create index playbooks_owner_membership_id_idx on playbooks(owner_membership_id);
create index playbooks_goal_id_idx on playbooks(goal_id);

-- Steps inside a playbook (the template)
create table playbook_steps (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references playbooks(id) on delete cascade,
  position integer not null,
  title text not null,
  detail text,
  link_url text,
  requires_proof boolean not null default false,
  created_at timestamptz not null default now()
);
create index playbook_steps_playbook_id_idx on playbook_steps(playbook_id);

-- Runs: each execution instance of a playbook
create table runs (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references playbooks(id) on delete cascade,
  membership_id uuid not null references memberships(id) on delete cascade,
  due_at timestamptz,
  status text not null default 'queued' check (status in ('queued','in_progress','submitted','approved','changes_requested','done')),
  started_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index runs_playbook_id_idx on runs(playbook_id);
create index runs_membership_id_idx on runs(membership_id);
create index runs_status_idx on runs(status);

-- Step completion within a run
create table run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references runs(id) on delete cascade,
  playbook_step_id uuid not null references playbook_steps(id) on delete cascade,
  done boolean not null default false,
  done_at timestamptz,
  proof_url text,
  note text
);
create index run_steps_run_id_idx on run_steps(run_id);

-- Feedback Memory: notes attach to the PLAYBOOK, not the run, and surface on every future run
create table feedback_notes (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references playbooks(id) on delete cascade,
  run_id uuid references runs(id) on delete set null,
  author_membership_id uuid not null references memberships(id) on delete cascade,
  body text not null,
  pinned boolean not null default false,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index feedback_notes_playbook_id_idx on feedback_notes(playbook_id);

-- Team Brain: workspace-level knowledge entries
create table brain_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  category text not null default 'other' check (category in ('voice','standards','tools','contacts','preferences','other','corrections')),
  title text not null,
  body text,
  author_membership_id uuid references memberships(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index brain_entries_workspace_id_idx on brain_entries(workspace_id);

-- Launch sequences: pre-built bundles of playbooks
create table launches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft','armed','live','complete')),
  start_date date,
  is_template boolean not null default false,
  created_at timestamptz not null default now()
);
create index launches_workspace_id_idx on launches(workspace_id);

create table launch_items (
  id uuid primary key default gen_random_uuid(),
  launch_id uuid not null references launches(id) on delete cascade,
  playbook_id uuid not null references playbooks(id) on delete cascade,
  membership_id uuid references memberships(id) on delete set null,
  offset_days integer not null default 0,
  due_time time
);
create index launch_items_launch_id_idx on launch_items(launch_id);

-- Activity feed
create table activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  membership_id uuid references memberships(id) on delete set null,
  verb text not null check (verb in ('started','completed_step','submitted','approved','requested_changes','added_note','launched')),
  target_type text not null,
  target_id uuid not null,
  created_at timestamptz not null default now()
);
create index activities_workspace_id_idx on activities(workspace_id);
create index activities_created_at_idx on activities(created_at desc);

-- Helper functions (RLS + triggers) live outside `public` so PostgREST never exposes them as RPC endpoints
create schema if not exists private;

-- Keep updated_at fresh
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger playbooks_set_updated_at
  before update on playbooks
  for each row execute function private.set_updated_at();

create trigger brain_entries_set_updated_at
  before update on brain_entries
  for each row execute function private.set_updated_at();
