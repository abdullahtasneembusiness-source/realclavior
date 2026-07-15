-- memberships_update (20260714092337_rls_policies.sql) only allows workspace admins
-- to update ANY membership row — correct for role/status/title changes, but it means
-- an operator can never update their OWN row, not even their own avatar color from
-- Settings. A broad "user_id = auth.uid() can update their own row" policy would fix
-- that but reopens a privilege-escalation hole: RLS policies gate which ROWS can be
-- touched, not which COLUMNS change within them, so a self-update policy alone would
-- let a member freely rewrite their own role/status too.
--
-- Narrow SECURITY DEFINER function instead (same shape as accept_pending_invites):
-- touches exactly one column, only on the caller's own active membership row.
create or replace function public.update_my_membership_color(
  p_workspace_id uuid,
  p_color text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  update memberships
  set color = p_color
  where workspace_id = p_workspace_id
    and user_id = auth.uid()
    and status = 'active';
end;
$$;

revoke execute on function public.update_my_membership_color(uuid, text) from public;
revoke execute on function public.update_my_membership_color(uuid, text) from anon;
grant execute on function public.update_my_membership_color(uuid, text) to authenticated;
