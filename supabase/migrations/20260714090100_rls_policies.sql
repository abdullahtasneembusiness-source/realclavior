-- RLS: founders/managers get full workspace read; operators are scoped to their own
-- runs/playbooks; nobody reads across workspaces. See Section 5 of the master build doc.
--
-- Helper functions live in `private` (not exposed via PostgREST) and are SECURITY DEFINER
-- so they can read `memberships` without triggering RLS recursion on that same table.

create or replace function private.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function private.is_workspace_admin(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and role in ('founder','manager')
      and status = 'active'
  );
$$;

create or replace function private.my_membership_id(p_workspace_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from memberships
  where workspace_id = p_workspace_id
    and user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

alter table workspaces enable row level security;
alter table memberships enable row level security;
alter table goals enable row level security;
alter table playbooks enable row level security;
alter table playbook_steps enable row level security;
alter table runs enable row level security;
alter table run_steps enable row level security;
alter table feedback_notes enable row level security;
alter table brain_entries enable row level security;
alter table launches enable row level security;
alter table launch_items enable row level security;
alter table activities enable row level security;

-- workspaces
create policy "workspaces_select" on workspaces
  for select using (private.is_workspace_member(id) or owner_id = auth.uid());

create policy "workspaces_insert" on workspaces
  for insert with check (owner_id = auth.uid());

create policy "workspaces_update" on workspaces
  for update using (private.is_workspace_admin(id));

create policy "workspaces_delete" on workspaces
  for delete using (owner_id = auth.uid());

-- memberships
create policy "memberships_select" on memberships
  for select using (
    private.is_workspace_admin(workspace_id)
    or user_id = auth.uid()
  );

-- Bootstrap case: a founder inserting their own first membership row right after
-- creating the workspace (before any membership exists, is_workspace_admin is false).
create policy "memberships_insert" on memberships
  for insert with check (
    private.is_workspace_admin(workspace_id)
    or (
      user_id = auth.uid()
      and role = 'founder'
      and exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
    )
  );

create policy "memberships_update" on memberships
  for update using (private.is_workspace_admin(workspace_id));

create policy "memberships_delete" on memberships
  for delete using (private.is_workspace_admin(workspace_id));

-- goals
create policy "goals_select" on goals
  for select using (private.is_workspace_member(workspace_id));

create policy "goals_admin_write" on goals
  for all using (private.is_workspace_admin(workspace_id))
  with check (private.is_workspace_admin(workspace_id));

-- playbooks: admins see all; operators see only playbooks they own
create policy "playbooks_select" on playbooks
  for select using (
    private.is_workspace_admin(workspace_id)
    or owner_membership_id = private.my_membership_id(workspace_id)
  );

create policy "playbooks_admin_write" on playbooks
  for all using (private.is_workspace_admin(workspace_id))
  with check (private.is_workspace_admin(workspace_id));

-- playbook_steps: access follows the parent playbook
create policy "playbook_steps_select" on playbook_steps
  for select using (
    exists (
      select 1 from playbooks p
      where p.id = playbook_steps.playbook_id
        and (
          private.is_workspace_admin(p.workspace_id)
          or p.owner_membership_id = private.my_membership_id(p.workspace_id)
        )
    )
  );

create policy "playbook_steps_admin_write" on playbook_steps
  for all using (
    exists (
      select 1 from playbooks p
      where p.id = playbook_steps.playbook_id
        and private.is_workspace_admin(p.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from playbooks p
      where p.id = playbook_steps.playbook_id
        and private.is_workspace_admin(p.workspace_id)
    )
  );

-- runs: operators read/write only their own runs; admins have full access
create policy "runs_select" on runs
  for select using (
    exists (
      select 1 from playbooks p
      where p.id = runs.playbook_id
        and (
          private.is_workspace_admin(p.workspace_id)
          or runs.membership_id = private.my_membership_id(p.workspace_id)
        )
    )
  );

create policy "runs_admin_write" on runs
  for all using (
    exists (
      select 1 from playbooks p
      where p.id = runs.playbook_id
        and private.is_workspace_admin(p.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from playbooks p
      where p.id = runs.playbook_id
        and private.is_workspace_admin(p.workspace_id)
    )
  );

create policy "runs_operator_update" on runs
  for update using (
    exists (
      select 1 from playbooks p
      where p.id = runs.playbook_id
        and runs.membership_id = private.my_membership_id(p.workspace_id)
    )
  );

-- run_steps: operators read/write only steps on their own runs; admins have full access
create policy "run_steps_select" on run_steps
  for select using (
    exists (
      select 1 from runs r
      join playbooks p on p.id = r.playbook_id
      where r.id = run_steps.run_id
        and (
          private.is_workspace_admin(p.workspace_id)
          or r.membership_id = private.my_membership_id(p.workspace_id)
        )
    )
  );

create policy "run_steps_operator_insert" on run_steps
  for insert with check (
    exists (
      select 1 from runs r
      join playbooks p on p.id = r.playbook_id
      where r.id = run_steps.run_id
        and r.membership_id = private.my_membership_id(p.workspace_id)
    )
  );

create policy "run_steps_operator_update" on run_steps
  for update using (
    exists (
      select 1 from runs r
      join playbooks p on p.id = r.playbook_id
      where r.id = run_steps.run_id
        and r.membership_id = private.my_membership_id(p.workspace_id)
    )
  );

create policy "run_steps_admin_write" on run_steps
  for all using (
    exists (
      select 1 from runs r
      join playbooks p on p.id = r.playbook_id
      where r.id = run_steps.run_id
        and private.is_workspace_admin(p.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from runs r
      join playbooks p on p.id = r.playbook_id
      where r.id = run_steps.run_id
        and private.is_workspace_admin(p.workspace_id)
    )
  );

-- feedback_notes: operators read notes on playbooks they own; only admins write
create policy "feedback_notes_select" on feedback_notes
  for select using (
    exists (
      select 1 from playbooks p
      where p.id = feedback_notes.playbook_id
        and (
          private.is_workspace_admin(p.workspace_id)
          or p.owner_membership_id = private.my_membership_id(p.workspace_id)
        )
    )
  );

create policy "feedback_notes_admin_write" on feedback_notes
  for all using (
    exists (
      select 1 from playbooks p
      where p.id = feedback_notes.playbook_id
        and private.is_workspace_admin(p.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from playbooks p
      where p.id = feedback_notes.playbook_id
        and private.is_workspace_admin(p.workspace_id)
    )
  );

-- brain_entries: readable by every active member (Brain is for onboarding); admins write
create policy "brain_entries_select" on brain_entries
  for select using (private.is_workspace_member(workspace_id));

create policy "brain_entries_admin_write" on brain_entries
  for all using (private.is_workspace_admin(workspace_id))
  with check (private.is_workspace_admin(workspace_id));

-- launches / launch_items: admin-only, operators only ever see the runs a launch spawns
create policy "launches_admin_all" on launches
  for all using (private.is_workspace_admin(workspace_id))
  with check (private.is_workspace_admin(workspace_id));

create policy "launch_items_admin_all" on launch_items
  for all using (
    exists (select 1 from launches l where l.id = launch_items.launch_id and private.is_workspace_admin(l.workspace_id))
  )
  with check (
    exists (select 1 from launches l where l.id = launch_items.launch_id and private.is_workspace_admin(l.workspace_id))
  );

-- activities: Live Feed is a founder/manager view; any active member can log an activity
create policy "activities_admin_select" on activities
  for select using (private.is_workspace_admin(workspace_id));

create policy "activities_insert" on activities
  for insert with check (private.is_workspace_member(workspace_id));
