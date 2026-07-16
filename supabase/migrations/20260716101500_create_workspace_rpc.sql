-- Atomic workspace creation.
--
-- Onboarding previously did this as two separate RLS-guarded inserts from the client:
-- first a workspaces row, then a founder memberships row permitted by a "bootstrap"
-- policy (owner may insert their own founder row before any membership exists). That
-- bootstrap policy is fragile — it depends on the just-created workspace being visible
-- to a policy subquery within the same session — and it leaves a window where a
-- workspace can exist with no founder membership if the second insert fails.
--
-- This SECURITY DEFINER function replaces both inserts with one atomic call. It always
-- acts as the *caller* (auth.uid() is used for both owner_id and the membership
-- user_id), so a user can only ever create a workspace owned by themselves — there is
-- no way to forge another owner. Running as definer means it no longer relies on the
-- membership bootstrap RLS path at all.
create or replace function public.create_workspace(p_name text, p_color text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(p_name);
  v_workspace_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'workspace name must be between 2 and 80 characters'
      using errcode = '22023';
  end if;

  insert into workspaces (name, owner_id)
  values (v_name, v_uid)
  returning id into v_workspace_id;

  insert into memberships (workspace_id, user_id, role, title, color, status)
  values (v_workspace_id, v_uid, 'founder', 'Founder', p_color, 'active');

  return v_workspace_id;
end;
$$;

-- Signed-in users only. Revoke from PUBLIC explicitly (anon inherits PUBLIC), then
-- grant to authenticated — same hardening as accept_pending_invites().
revoke execute on function public.create_workspace(text, text) from public;
revoke execute on function public.create_workspace(text, text) from anon;
grant execute on function public.create_workspace(text, text) to authenticated;
