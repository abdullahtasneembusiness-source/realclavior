-- Feedback Memory — the product's core differentiator. A correction attaches to the
-- playbook and resurfaces on every future run in the "Before you start" panel.
--
-- The one hard part is read access: an operator must see a playbook's unresolved notes
-- on any run they've been handed, even if they don't own the playbook. Resolve this the
-- same visibility-independent way as the run policies — through SECURITY DEFINER
-- helpers — so there's no dependency on playbook visibility and no policy recursion.

create or replace function private.playbook_owner(p_playbook_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select owner_membership_id from playbooks where id = p_playbook_id;
$$;

create or replace function private.has_run_for_playbook(p_playbook_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from runs r
    where r.playbook_id = p_playbook_id
      and r.membership_id
        = private.my_membership_id(private.playbook_workspace(p_playbook_id))
  );
$$;

grant execute on function private.playbook_owner(uuid) to anon, authenticated;
grant execute on function private.has_run_for_playbook(uuid) to anon, authenticated;

-- Admins see every note in their workspace; the playbook's owner sees its notes; and
-- an operator handed a run of the playbook sees them too (so the amber panel works for
-- a non-owner assignee).
drop policy if exists "feedback_notes_select" on feedback_notes;
create policy "feedback_notes_select" on feedback_notes
  for select using (
    private.is_workspace_admin(private.playbook_workspace(playbook_id))
    or private.playbook_owner(playbook_id)
      = private.my_membership_id(private.playbook_workspace(playbook_id))
    or private.has_run_for_playbook(playbook_id)
  );

-- Only founders/managers write feedback (create the standing note, edit it, resolve
-- it). Rewritten to resolve the workspace via the definer helper rather than a
-- playbooks subquery under RLS.
drop policy if exists "feedback_notes_admin_write" on feedback_notes;
create policy "feedback_notes_admin_write" on feedback_notes
  for all
  using (private.is_workspace_admin(private.playbook_workspace(playbook_id)))
  with check (private.is_workspace_admin(private.playbook_workspace(playbook_id)));
