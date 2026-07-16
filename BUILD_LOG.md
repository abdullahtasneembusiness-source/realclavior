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

## Session 2 — App Shell + Role-Based Routing

- **Workspace-scoped URLs (`/w/[workspaceId]/...`), not a cookie.** The session prompt explicitly allows either "a simple cookie or the URL path... pick whichever is cleaner" — URL-based is the standard multi-tenant SaaS pattern (Linear, Vercel): deep links carry workspace context, back/forward works, no cookie/URL desync. `/app` becomes a pure entry-point resolver (find the user's default workspace, redirect into it) rather than a real screen. This meant restructuring Session 1's `/app/*` routes onto `/w/[workspaceId]/*` — the right time to do it, before more got built on top.
- **Operator shell is a genuinely different component tree, not the admin shell with items hidden.** Desktop: both roles get a sidebar, but operators get 2 nav items instead of 6. Mobile: admins get a hamburger → drawer (their nav is too big for a tab bar); operators get a fixed bottom tab bar and no drawer at all — matches the doc's explicit instruction not to just shrink the desktop layout.
- **Every admin-only route (`Team`, `Goals`, `Launches`) is gated at the page level** (`requireAdmin()` redirects an operator straight to their workspace home), not just hidden from the nav — a typed URL doesn't get you further than the nav would.
- **`loading.tsx` lives at `/w/loading.tsx`, not inside `/w/[workspaceId]/`.** Next's `loading.tsx` only wraps a segment's *children*, not that segment's own `layout.tsx` — and the membership/workspace lookup (the thing that actually needs a loading state) happens inside `[workspaceId]/layout.tsx`. Placing it one level up at `/w/` wraps that layout correctly, giving the full-shell skeleton the doc asks for instead of a blank pause.
- **Settings' "name" field writes to Supabase Auth user metadata (`auth.updateUser`), not a new schema column.** The schema has no per-person display-name field (`memberships.title` is a job title, e.g. "Content Operator"), and the session prompt's schema is authoritative. This is the standard Supabase pattern for "the user's own profile name" and doesn't require a migration. Scope note: this makes a user's own name show correctly in their own sidebar/settings, but the Team roster still shows `title` for *other* members, since `auth.users` isn't queryable cross-user via PostgREST — a full team-wide "real names" roster would need a `public.profiles` mirror table, which is out of scope for this session.
- **Caught a real RLS gap while wiring the avatar color picker**: `memberships_update` (Session 1) only allows workspace admins to write — correct for role/status changes, but it silently blocked an operator from ever updating their *own* row (no error surfaces from a 0-row RLS-filtered UPDATE, so the UI would have shown "success" while nothing saved). Fixed with a narrow `SECURITY DEFINER` function, `update_my_membership_color()`, that touches exactly one column on exactly the caller's own row — same shape as `accept_pending_invites()`. A broad "user can update their own membership row" policy was deliberately avoided: RLS policies gate rows, not columns, so that alone would have let a member rewrite their own `role` too.
- **Amber correction**: Session 1's invite-dialog used amber for a non-Feedback-Memory warning banner, violating this project's own design rule ("amber is reserved ONLY for Feedback Memory, never decorative"). Fixed to neutral/muted styling while rebuilding this page.
- **`changeRole` guardrails are application-level, not RLS**, layered on top of the existing `memberships_update` admin-only policy: a user can't change their own role here, only a founder can touch the founder tier (promote to it or change an existing founder's role), and the workspace must always keep at least one active founder. RLS enforces *who* can write; these rules enforce *what* a valid write looks like.

### Session 2 verification

No new auth/RLS surface beyond the avatar-color fix above (verified the same way as Session 1: SQL-level JWT impersonation via the Supabase MCP connector once it's reachable — pending as of this commit, connector was intermittently disconnected during this session). Verified directly in this sandbox: production build is clean (`npm run build`, strict TS, zero `any`), `next lint` clean, Prettier formatted, and middleware correctly redirects unauthenticated requests to `/login` for every new `/w/[workspaceId]/*` route including nonexistent workspace ids. Also confirmed the dynamically-selected Tailwind accent classes in `ComingSoon` actually compile into the CSS output (a common gotcha with lookup-object class patterns).

Not verified from this session (same network-policy constraint as Session 1 — needs a real browser session): the actual sidebar/drawer/bottom-tab-bar rendering, the workspace switcher with 2+ workspaces, and the full invite → change-role → resend-invite click-through. Worth a manual pass once you're testing locally or the network policy is open.

## Hardening pass — CI + real browser E2E tests

Prompted by a direct question: are the foundations actually strong, or does this have the usual vibecoded gaps (no tests, nothing verified beyond "it compiles")? Honest answer at the time: RLS was genuinely verified via JWT impersonation, but every UI claim rested on "it builds and returns the right status code" — nobody, including me, had ever seen it render in a real browser with a real logged-in user.

**The blocker and the fix.** This dev sandbox's network policy blocks direct HTTPS to `supabase.co` (confirmed repeatedly across both sessions) and, it turns out, also blocks Docker image pulls (`docker pull hello-world` → 403 from the same egress policy) — so neither "hit the real cloud project" nor "run a local Supabase stack via Docker" works *from inside this sandbox*. GitHub Actions runners are a completely different environment with unrestricted internet access. So: a CI pipeline that spins up a disposable local Supabase stack (Postgres + GoTrue + PostgREST via `supabase start`) and drives it with a real Chromium browser via Playwright works there, even though it's unrunnable here. This also fixes a foundational gap flagged separately — dev and prod had been the same database; now every test run gets a fresh, disposable one, torn down after.

**What `.github/workflows/ci.yml` does:**
- `checks` job: build + lint on every push, fast, no backend needed (nothing renders at build time that touches Supabase).
- `e2e` job: `supabase start` (auto-applies every file in `supabase/migrations/` to a fresh local DB), exports its credentials, builds and starts the real Next.js production server, then runs the Playwright suite against it with a real Chromium instance.

**What the E2E suite (`tests/e2e/`) actually proves, in a real browser, not simulated:**
- Every protected route redirects a signed-out visitor to `/login` (`auth-and-onboarding.spec.ts`)
- Magic-link sign-in → onboarding → workspace creation → lands on Command View with all 6 admin nav items actually rendered and clickable
- Revisiting `/app` with an existing workspace redirects straight in (`getDefaultWorkspaceId` path)
- An invited operator, signing in for the first time, gets auto-linked via `accept_pending_invites()` and sees the *2-item* sidebar, not the 6-item one — and typing `/team`, `/goals`, `/launches` directly bounces them home instead of erroring (`team-and-roles.spec.ts`)
- Promoting an operator to manager takes effect on their next session — the sidebar grows the admin items
- RLS isolation over the real HTTP path (anon key + PostgREST, not just SQL impersonation): an unrelated signed-in user reads zero rows from another workspace; a fully unauthenticated request reads zero rows (`rls-isolation.spec.ts`)
- **The actual responsive behavior**, viewport-driven: desktop shows the sidebar and hides the mobile header; mobile shows a hamburger that opens a real drawer, lists real nav links, navigates, and closes; a mobile operator gets a bottom tab bar with no hamburger at all (`responsive-shell.spec.ts`)

Added `data-testid` attributes to shell chrome (`desktop-sidebar`, `mobile-header`, `mobile-drawer`, `bottom-tab-bar`, `operator-mobile-header`, `member-row-{email}`) purely for test stability — the same nav links exist in both the desktop sidebar and mobile drawer DOM simultaneously (CSS-hidden, not removed), so text-only selectors would be ambiguous.

**Honesty check on this pass itself:** I have not personally watched this CI run succeed yet — the sandbox that block direct network access is the same reason I can't run it here. The plan is to push, then use the GitHub API to watch the Actions run and iterate on any real failures until it's genuinely green, not just written and assumed correct. If the field names Supabase's `-o json` status output uses don't match what I assumed, that step will fail loudly and get fixed from real output, not guessed twice.
