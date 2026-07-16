-- Table-level privileges for the API roles.
--
-- Postgres checks table GRANTs *before* it evaluates RLS, so without an explicit
-- table grant the `authenticated`/`anon` roles get "permission denied for table ..."
-- (HTTP 403) on every request — RLS never even runs. On hosted Supabase the platform
-- pre-grants these via default privileges owned by supabase_admin, but tables created
-- through raw SQL migrations (applied as `postgres`) do NOT inherit that default, so
-- the grant is missing here. That is what made the create_workspace RPC (SECURITY
-- DEFINER, runs as owner) succeed while a plain authenticated read of the row it wrote
-- came back 403.
--
-- RLS (already enabled with policies on every table) remains the actual row-level
-- gate — these grants only get the request past the table permission check so the
-- policies can run. We deliberately do NOT touch function privileges here: the
-- SECURITY DEFINER RPCs (create_workspace, accept_pending_invites) have their own
-- explicit revokes from anon, and a blanket routine grant would undo them.
grant usage on schema public to anon, authenticated;

-- authenticated performs the full CRUD surface (RLS decides which rows).
grant select, insert, update, delete on all tables in schema public to authenticated;

-- anon only ever attempts reads (which RLS filters to nothing when signed out).
grant select on all tables in schema public to anon;

-- Keep future tables in this schema covered without another migration.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select on tables to anon;
