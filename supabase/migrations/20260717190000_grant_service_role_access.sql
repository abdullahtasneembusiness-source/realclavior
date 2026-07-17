-- Service-role table access, for trusted server-only jobs (the launch cron).
--
-- The cron endpoint (/api/cron/launches) must spawn due launches across EVERY workspace
-- with no signed-in user, so it uses the service-role key, which bypasses RLS. But
-- Postgres still checks table GRANTs before RLS — and our public tables were created by
-- raw SQL migrations (applied as `postgres`), so on the local/CI stack the service_role
-- never inherited the grant and every service-role query came back "permission denied".
-- (grant_public_table_access fixed exactly this for authenticated/anon; this does the
-- same for service_role.)
--
-- On hosted Supabase the platform already pre-grants service_role via default
-- privileges, so re-granting here is a harmless no-op there and closes the gap locally.
-- RLS is irrelevant to service_role (it bypasses it); this only gets past the table
-- permission check. No function grants — the SECURITY DEFINER RPCs keep their own.

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
