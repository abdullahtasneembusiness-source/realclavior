-- The RLS policies (20260714092337) call helper functions that live in the `private`
-- schema — private.is_workspace_member / is_workspace_admin / my_membership_id — 44
-- times across the policy set. Those functions are SECURITY DEFINER, but a policy
-- expression is still *resolved* as the querying role (anon / authenticated): before
-- the definer context kicks in, Postgres checks that the caller has USAGE on the
-- schema and EXECUTE on the function. Postgres does NOT grant schema USAGE on a
-- freshly created schema to anyone but the owner.
--
-- The result: every read that goes through one of these policies (reading your own
-- membership, listing a workspace, an outsider's blocked read, an anon read) throws
-- "permission denied for schema private" and PostgREST returns 403 — not the intended
-- 200-with-filtered-rows. This surfaced as onboarding stranding users on /onboarding
-- (the workspace insert's RETURNING clause runs workspaces_select, which errored) and
-- as requireWorkspaceContext bouncing a brand-new founder back out of their workspace.
--
-- Granting USAGE on the schema does NOT expose it through the API — PostgREST only
-- serves the schemas in its db-schemas config (public). It only lets the policy
-- expressions resolve the helper functions. The functions themselves are scoped to
-- auth.uid() (null for anon), so anon executing them simply gets `false`.
grant usage on schema private to anon, authenticated;

grant execute on all functions in schema private to anon, authenticated;

-- Cover any helper added to `private` by a later migration, too.
alter default privileges in schema private
  grant execute on functions to anon, authenticated;
