-- When an invited user signs in for the first time, their pending membership rows
-- (invited_email = their email, user_id still null) need to be linked to their new
-- auth user and flipped to 'active'. The invited user is NOT a workspace admin yet,
-- so normal RLS (memberships_update requires is_workspace_admin) can't do this.
--
-- This SECURITY DEFINER function is the narrow exception: it acts only on rows whose
-- invited_email matches the *caller's own* verified email, so a user can only ever
-- claim invites addressed to them. It links ALL matching pending invites (the master
-- doc's "join both" default when an email was invited to multiple workspaces).
--
-- Returns the number of invites accepted, so the callback can decide where to route.
create or replace function public.accept_pending_invites()
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_email text;
  v_count integer;
begin
  select email into v_email from auth.users where id = auth.uid();

  if v_email is null then
    return 0;
  end if;

  with linked as (
    update memberships
    set user_id = auth.uid(),
        status = 'active'
    where user_id is null
      and status = 'invited'
      and lower(invited_email) = lower(v_email)
    returning 1
  )
  select count(*) into v_count from linked;

  return v_count;
end;
$$;

-- Only signed-in users may call this, and only for their own email (enforced above).
-- Must revoke from PUBLIC explicitly, not just `anon` — Postgres grants EXECUTE to
-- the implicit PUBLIC pseudo-role by default on new functions, and `anon` inherits
-- PUBLIC's privileges, so revoking from anon alone leaves it callable unauthenticated
-- (caught by the Supabase security advisor after the first version of this migration).
revoke execute on function public.accept_pending_invites() from public;
revoke execute on function public.accept_pending_invites() from anon;
grant execute on function public.accept_pending_invites() to authenticated;
