-- Onboarding mode (Phase 4). A new team member walks through the Team Brain and
-- their assigned playbooks once; `onboarded_at` records completion so the walkthrough
-- auto-triggers only on their first visit, not forever.

alter table memberships
  add column if not exists onboarded_at timestamptz;

-- Members mark THEMSELVES onboarded, but memberships_update is admin-only (an operator
-- can't write their own row — same constraint the avatar-color helper works around).
-- Narrow SECURITY DEFINER function: sets exactly one column, only on the caller's own
-- active row, and only if not already set (idempotent, can't be back-dated by a replay).
create or replace function public.mark_self_onboarded(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  update memberships
  set onboarded_at = now()
  where workspace_id = p_workspace_id
    and user_id = auth.uid()
    and status = 'active'
    and onboarded_at is null;
end;
$$;

revoke execute on function public.mark_self_onboarded(uuid) from public;
revoke execute on function public.mark_self_onboarded(uuid) from anon;
grant execute on function public.mark_self_onboarded(uuid) to authenticated;
