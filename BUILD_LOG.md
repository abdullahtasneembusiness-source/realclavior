# Clovior Build Log

Running record of deviations from `CLOVIOR_MASTER_BUILD.md` / `CLOVIOR_SESSION_PROMPTS.md` and why, so future sessions understand the as-built state.

## Session 1 — Foundation

- **shadcn/ui installed by hand, not via the CLI.** This environment's network policy blocks `ui.shadcn.com`, so the base primitives (Button, Input, Card, Badge, Avatar, Dialog, DropdownMenu, Separator, Tabs, Label) were written directly against Radix + CVA. Theme is overridden to the Clovior design system as specified, not shadcn defaults.
- **Migrations applied via the Supabase MCP connector**, not the Supabase CLI (`db push`) — the sandbox blocks direct HTTPS to `supabase.co`, but the MCP tool has its own path. Local migration filenames match the timestamps applied remotely.
- **`private` schema for RLS/trigger helpers.** RLS helper functions (`is_workspace_member`, `is_workspace_admin`, `my_membership_id`) are `SECURITY DEFINER` in a `private` schema so they can read `memberships` without triggering RLS self-recursion, and so PostgREST doesn't expose them as RPC. `private.set_updated_at` pins `search_path` (security-advisor fix).
- **Pending-invite linking via `public.accept_pending_invites()`** (SECURITY DEFINER), called from the auth callback. The invited user isn't an admin yet, so normal RLS can't flip their membership to active; the function acts only on rows matching the caller's own verified email. Chosen over using the service-role key (which wasn't provided to this session). Multiple pending invites across workspaces → all are joined (the doc's "join both" default).
- **Minimal `/app` shell for Session 1.** Just a top bar + team page, enough to test auth/invite. The real role-based sidebar, workspace switcher, and mobile nav are Session 2 per the plan — deliberately not built ahead.
- **Google OAuth + Resend need external config to function** (Google provider enabled with client ID/secret in the Supabase dashboard; Resend API key + verified domain). Code supports both; invites create the membership row and degrade gracefully when email isn't configured.

### Session 1 smoke test (2026-07-15)

This sandbox's egress policy blocks direct HTTPS from this session to `supabase.co` — including the Auth Admin API, so a real Playwright-driven browser test (magic link → click → session cookie) wasn't possible from here. Ran the doc's smoke-test checklist at the database level instead, via the Supabase MCP connector: created throwaway `auth.users` rows directly, then impersonated each one's JWT (`set local role authenticated; set local request.jwt.claims ...`) to run the exact INSERT/SELECT/UPDATE statements the app issues — this exercises the real RLS policies PostgREST would enforce, not a superuser bypass. All test data was deleted after.

Results — all passed:
- Founder creates workspace + bootstrap founder membership through RLS (not superuser)
- Founder invites an operator by email → membership row `status='invited'`, `user_id=null`
- Unrelated user reads zero rows from `workspaces`, `memberships`, `brain_entries` for that workspace
- Unrelated user's attempt to insert themselves as `founder` on that workspace → rejected (`42501 insufficient_privilege`)
- Fully unauthenticated (`anon` role) reads zero rows
- `accept_pending_invites()` correctly links a matching pending invite on first call (status flips to `active`, `user_id` set) — this also caught a real bug: the function was still callable by `anon` because Postgres grants `EXECUTE` to the implicit `PUBLIC` pseudo-role by default and `anon` inherits it, so revoking from `anon` alone wasn't enough. Fixed by also revoking from `public` (see `20260715075238_accept_pending_invites.sql`). Caught by the Supabase security advisor, not manual review.
- Newly-active operator sees their own workspace + own membership, but not the founder's membership row (matches the "operators see only their own row" RLS design)

Not tested from this session (needs a real browser + real email or Google account): the actual UI click-through (login page → magic link email → onboarding form → team page dialog), and Google OAuth end-to-end. Recommend a manual pass through those once you have a moment.
