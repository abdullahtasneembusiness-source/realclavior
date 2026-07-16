-- Phase 2b: operators run playbooks as live checklists (the runs side).
--
-- Two things make this correct and safe:
--
-- 1. A run is an immutable snapshot. When an admin hands a playbook off, we copy the
--    step content (position/title/detail/link/requires_proof) onto run_steps and the
--    playbook name onto the run. An in-flight checklist then never shifts under the
--    operator if the playbook is later edited, and — crucially — the operator only
--    ever needs to read their own runs / run_steps, never the playbooks table.
--
-- 2. Recursion-free, visibility-independent RLS. The original runs / run_steps
--    policies resolved access by selecting from `playbooks` *under RLS*. But
--    playbooks_select only exposes a playbook to its owner or an admin, so a
--    handed-off, non-owner operator couldn't even read their own run. We resolve the
--    workspace and assignee through SECURITY DEFINER helpers instead (which bypass
--    RLS on playbooks/runs), so there is no dependency on playbook visibility and no
--    policy cycle.

-- Snapshot columns.
alter table runs add column if not exists title text;

alter table run_steps
  add column if not exists position integer not null default 0;
alter table run_steps
  add column if not exists title text not null default '';
alter table run_steps add column if not exists detail text;
alter table run_steps add column if not exists link_url text;
alter table run_steps
  add column if not exists requires_proof boolean not null default false;

-- Helpers: resolve a run/playbook's workspace and a run's assignee without RLS.
create or replace function private.playbook_workspace(p_playbook_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select workspace_id from playbooks where id = p_playbook_id;
$$;

create or replace function private.run_workspace(p_run_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select private.playbook_workspace(playbook_id) from runs where id = p_run_id;
$$;

create or replace function private.run_membership(p_run_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select membership_id from runs where id = p_run_id;
$$;

grant execute on function private.playbook_workspace(uuid) to anon, authenticated;
grant execute on function private.run_workspace(uuid) to anon, authenticated;
grant execute on function private.run_membership(uuid) to anon, authenticated;

-- runs: admins have full access across the workspace; the assigned operator can read
-- and update (progress the status of) their own run, and can never reassign it away.
drop policy if exists "runs_select" on runs;
create policy "runs_select" on runs
  for select using (
    private.is_workspace_admin(private.playbook_workspace(playbook_id))
    or membership_id = private.my_membership_id(private.playbook_workspace(playbook_id))
  );

drop policy if exists "runs_admin_write" on runs;
create policy "runs_admin_write" on runs
  for all
  using (private.is_workspace_admin(private.playbook_workspace(playbook_id)))
  with check (private.is_workspace_admin(private.playbook_workspace(playbook_id)));

drop policy if exists "runs_operator_update" on runs;
create policy "runs_operator_update" on runs
  for update
  using (
    membership_id = private.my_membership_id(private.playbook_workspace(playbook_id))
  )
  with check (
    membership_id = private.my_membership_id(private.playbook_workspace(playbook_id))
  );

-- run_steps: same shape, resolved through the run. Operators only update (tick off /
-- attach proof) steps on their own run; admins have full access; nobody but an admin
-- inserts (run_steps are snapshotted at hand-off), so the old operator-insert policy
-- is dropped.
drop policy if exists "run_steps_select" on run_steps;
create policy "run_steps_select" on run_steps
  for select using (
    private.is_workspace_admin(private.run_workspace(run_id))
    or private.run_membership(run_id)
      = private.my_membership_id(private.run_workspace(run_id))
  );

drop policy if exists "run_steps_operator_insert" on run_steps;

drop policy if exists "run_steps_operator_update" on run_steps;
create policy "run_steps_operator_update" on run_steps
  for update
  using (
    private.run_membership(run_id)
      = private.my_membership_id(private.run_workspace(run_id))
  )
  with check (
    private.run_membership(run_id)
      = private.my_membership_id(private.run_workspace(run_id))
  );

drop policy if exists "run_steps_admin_write" on run_steps;
create policy "run_steps_admin_write" on run_steps
  for all
  using (private.is_workspace_admin(private.run_workspace(run_id)))
  with check (private.is_workspace_admin(private.run_workspace(run_id)));
