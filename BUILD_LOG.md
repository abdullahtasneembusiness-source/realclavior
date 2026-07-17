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

## Hardening pass — GREEN (real-browser E2E, 15/15)

The CI pipeline above landed genuinely green: **`15 passed`**, both jobs (build/lint/typecheck and the real-Chromium E2E suite against a fresh local Supabase stack) succeeding on commit `8c3e6fd`. Watched via the GitHub Actions API and iterated on real failure output — not assumed. Getting there surfaced five real, foundational bugs that "it builds" had completely hidden. Documenting them because each was a genuine gap, and the whole point of this pass was to stop trusting green-by-assumption.

**1. Magic-link sign-in didn't actually work.** The E2E helper minted a signup-confirmation token for an unconfirmed user but verified it as `type=magiclink`, so `verifyOtp` rejected it ("Email link is invalid or has expired"). Fix: pre-create a *confirmed* auth user via the admin API, then verify with the exact `verification_type` GoTrue returns from `generateLink`. Also hardened `/auth/callback` to accept the SSR `token_hash` + `verifyOtp` flow (cross-device safe, no PKCE verifier cookie needed) and to bind refreshed session cookies to the response.

**2 & 3. Workspace creation was rejected at the database, silently.** Onboarding did two separate RLS-guarded client inserts (workspace, then a bootstrap-policy-permitted founder membership). The first insert's `RETURNING` clause runs the `workspaces_select` policy, which threw — so the action returned a generic error and never redirected, stranding every new user on `/onboarding`. Two root causes underneath:
   - **No table GRANTs.** Postgres checks table privileges *before* RLS. Tables created via raw SQL migrations (run as `postgres`) don't inherit the platform default privileges hosted Supabase configures for `supabase_admin`, so `authenticated`/`anon` had *no* access to the public tables at all — every request 403'd before RLS even ran. Fixed with an explicit `GRANT` migration (`20260716102500`); RLS stays the row-level gate.
   - **No `private` schema USAGE.** Every RLS policy calls SECURITY DEFINER helpers in the `private` schema. A policy expression is resolved as the querying role *before* the definer context applies, so `authenticated`/`anon` need `USAGE` on `private` + `EXECUTE` on the helpers — which a freshly created schema grants to no one but the owner. Fixed in `20260716102000`.

   Creation itself was also made **atomic and race-free**: a `create_workspace(name, color)` SECURITY DEFINER RPC (`20260716101500`) inserts the workspace and founder membership in one call and can't strand a half-created workspace. The onboarding action now calls it via `supabase.rpc`.

**4. Every workspace route 500'd on render.** `AppShell` was a Server Component, but the nav config it hands to the interactive nav (`MobileHeader` / `NavLink` / `BottomTabBar`) carries non-serializable values — an `href(id)` builder and Lucide `icon` components. Server Components may not pass functions across the server→client boundary (Next digest `2470322727`, "Functions cannot be passed directly to Client Components"), so the shell threw before any chrome rendered — no sidebar, no mobile header, no invite button. Fix: mark `AppShell` `"use client"` so nav-config only ever moves client→client; the server layout still passes the serializable `ctx` and the server-rendered `children` in the normal supported way, and the pages themselves stay Server Components.

**Infra fixes along the way:** removed the `devices["iPhone 13"]` preset (it forces a worker-level `webkit` browserType that Playwright rejects inside a describe-scoped `test.use()`; a plain viewport override is all the CSS breakpoint needs), and bumped both CI jobs to Node 22 (Supabase's client needs native WebSocket, Node 22+).

**Permanent regression guard.** `workspace-create-diagnostic.spec.ts` drives the `create_workspace` RPC over real HTTP with a real user token and asserts the founder membership is created *and readable* — so if the RPC or any of these grants ever regress, it fails fast with the exact PostgREST error, independent of browser flakiness.

**Live-DB follow-up (not yet done).** These migrations — `create_workspace` RPC, `grant_private_schema_access`, `grant_public_table_access`, and the earlier `self_service_avatar_color` — exist in the repo and are applied to CI's fresh stack every run, but still need applying to the **live hosted Supabase project**. Until then, onboarding against the live DB will hit the same 403s. To be done via the Supabase connector when reachable.

## Session 4 — AI-Assisted Playbook Creation (Phase 2b)

Built out of the original order — Sessions 5/6/7 shipped first, so this went back to fill the skipped Phase 2b. Adds an AI path to playbook creation *alongside* the manual builder (never replacing it).

- **Two-path entry, not a replacement.** The "New playbook" dialog now forks: "Generate from a description" (this session) or "Build manually" (Session 3's name form, unchanged). Existing E2E specs that opened the dialog and typed a name now click "Build manually" first.
- **Draft lives in the client until Save.** Generation returns a draft that's held entirely in React state on `/playbooks/new` and edited in a step editor that mirrors Session 3's controls (title/detail/require-proof, reorder, add, delete). `createPlaybookFromDraft` is the *only* point it touches the DB — so "nothing is saved until Save playbook" holds literally, and it inserts the playbook + all steps together, deleting the shell if the steps fail so no empty playbook is stranded.
- **Structured output via forced tool use.** `src/lib/ai-playbook.ts` calls the Messages API with a single `save_playbook_draft` tool and `tool_choice` forcing it, then re-validates everything the model returns with zod and hard length/count caps (untrusted input). Vague descriptions come back as `confidence: "low"` with a note instead of a hallucinated process; any failure (no key, timeout, non-200, malformed) collapses to one "try again" error state — never a hang.
- **Model + endpoint config.** Defaults to `claude-sonnet-4-5` (matching the existing feedback distiller — the build doc's `claude-sonnet-4-6` isn't a real id). `ANTHROPIC_MODEL` and `ANTHROPIC_BASE_URL` are overridable; the base-URL override is a genuine proxy/gateway seam that the E2E suite also uses.
- **Rate limiting is a real table, not in-memory.** New `ai_generations` migration (`20260717120000`) backs a per-workspace daily cap (25); the endpoint counts today's rows before spending a model call and records the attempt first, so serverless instances can't each keep their own count. RLS: workspace admins only, resolved through the existing `private.is_workspace_admin` helper; explicit grants like every other table.
- **Deterministic AI in CI.** `tests/e2e/mock-anthropic.mjs` is a tiny stand-in wired via `playwright.config.ts` (`ANTHROPIC_BASE_URL` → mock). It branches on the description — normal → a fixed multi-step draft, "vague" → low confidence, "boom" → HTTP 500 — so the full generate → edit → save flow, the low-confidence path, and the failure path all run in a real browser with no key or network. `ai-playbook.spec.ts` covers all four of the doc's smoke tests, plus the manual path still works.

**Live-DB follow-up (not yet done).** `20260717120000_ai_generations.sql` is applied to CI's fresh stack every run but still needs applying to the live hosted project (Supabase connector was disconnected at commit time). AI generation also stays dormant on live until `ANTHROPIC_API_KEY` is set in the Vercel env — the manual path is unaffected.

## Session 8 — Goals + Team Brain (Phase 4)

Shipped in two commits (Goals; then Brain + Corrections + Onboarding). The `goals` and `brain_entries` tables, their RLS, and grants all existed from the initial schema — most of this session was building the product surface, not the data layer.

- **Goals.** List (progress bar + target date + linked-playbook count), create dialog, detail page (progress ring, editable fields, 0-100 manual slider, mark-done/reopen/archive, connected playbooks with status). Progress is founder-set by hand in v1 as the doc specifies. Marking a goal done snaps progress to 100 so the two never disagree.
- **Playbook → goal linking.** The `goal_id` column existed but was never surfaced; added a "Goal this drives" picker to the playbook meta form and persisted it through `updatePlaybookMeta`. Command View gained a Goals rollup (label + progress), shown only when goals exist.
- **Team Brain.** Full CRUD (admin-only writes via RLS; all members read — it's the onboarding surface). Client-side category filter chips + search across title/body over the workspace's entries.
- **Corrections mirror.** A read-only category inside Brain that pulls live from `feedback_notes` across the workspace's playbooks (`playbooks!inner` join + workspace filter, RLS still applies per viewer), grouped by playbook. Source of truth stays the playbook's Feedback Memory; this is a view. Rendered in amber, consistent with Feedback Memory everywhere else.
- **Onboarding mode.** New `memberships.onboarded_at` column + a `mark_self_onboarded` SECURITY DEFINER function (same narrow self-write pattern as the avatar-colour helper — memberships_update is admin-only). A not-yet-onboarded non-founder is redirected from their workspace home to `/welcome`, a sequential walkthrough of Brain entries + their assigned playbooks with "X of N" progress and a "You're set up" completion that routes them home. Completion is awaited before navigating (home redirects back while `onboarded_at` is null, so the write must land first — that race was the one real trap here).
- **Test fallout from the onboarding gate.** Every operator-flow spec now passes through onboarding before reaching an operator home, via a new `completeOnboarding` helper. Founders are exempt (they bootstrap the workspace), so founder specs are untouched.

**Live-DB follow-up (not yet done).** `20260717140000_membership_onboarding.sql` (and the still-pending `ai_generations`) apply to CI's fresh stack every run but need applying to the live hosted project when the Supabase connector is reachable. On live, the onboarding redirect is inert until the column exists — apply this before onboarding real operators there.

## Session 9 — Launch Mode (Phase 5)

Verified before starting that Sessions 1–8 are all built as real routes (login, onboarding, team, playbooks + AI generator, runs, feedback memory, command view, goals, brain, welcome) — only `launches` was still a ComingSoon stub.

- **No new migration for the core.** `launches` and `launch_items` already had tables, RLS (admin-only), and grants from the initial schema, so the builder/timeline/templates are pure app code. The one addition: `runs.launch_id` (`20260717160000_launch_runs.sql`) — a nullable back-reference so the live dashboard can compute progress per launch without guessing which runs belong to it. Additive, existing runs RLS already covers the row.
- **Builder + timeline.** Create a launch (name/start date), add items (playbook + owner defaulting to the playbook's owner but overridable + day offset + optional due time), remove them. The timeline is owner-rows × day-columns, only rendering days that actually have items so it stays compact.
- **Arm + spawn.** Arming locks the structure. Spawn creates a real run per item — the same immutable snapshot as a hand-off (playbook name on the run, step content on run_steps), with `due_at = start + offset (+ time)` — and flips the launch to live. Idempotent (only acts on an armed launch). An armed launch whose start date is already here (today or past) spawns immediately, so arming a day late doesn't silently skip runs.
- **The cron gap, handled honestly.** The doc says "extend the existing cron infrastructure" — but the Phase 2a scheduler was never built, so there is none. Rather than fake it, spawn fires at arm-time when due, plus an opportunistic `checkDueLaunches` catch-up that runs when a founder opens the launches area (a small client effect). A real pg_cron calling the same path daily is the production trigger, deferred with the rest of scheduling. The smoke-test path ("arm for today → runs spawn now") is fully covered and tested.
- **Live dashboard + templates.** A live launch shows percent complete (runs done / total), what's overdue, and what's due in the next 24h — reusing Command View's run/badge vocabulary. "Save as template" stores the structure (playbooks + owners + offsets) without dates; "New launch from template" copies it forward with a fresh date.
- **E2E** (`launches.spec`): build a two-item launch, arm it for today, confirm the runs spawn into the live dashboard, complete one and confirm the percent updates; and the template round-trip (save → new-from-template carries the items). Real browser, as always.

**Additions doc (Session 8.5) — NOT built.** The uploaded `CLOVIOR_ADDITIONS.md` (Founder's Manual + Drift Signals) is acknowledged but deferred per instruction to build only Launch Mode now. It slots between Session 8 and 9 in the doc's ordering; revisit before Session 10.

**Live-DB follow-up.** `20260717160000_launch_runs.sql` needs applying to the live project alongside the run (it applies to CI's fresh stack automatically).

## Session 8.5 — Founder's Manual + Drift Signals (Additions)

Built from the uploaded `CLOVIOR_ADDITIONS.md`, after Launch Mode. The user's ask was explicitly to make the *foundation* strong, since neither had a data layer — so the migrations came first.

**Feature A — Founder's Manual.**
- **Foundation:** `founder_manual_sections` (`20260717180000`), one row per section keyed to a fixed six, unique per workspace. RLS: all active members read (it's the onboarding surface), founder/manager write — via the same `private.is_workspace_*` helpers, plus explicit grants.
- A pinned, visually-distinct (violet, NOT the reserved amber) "Founder's Manual" card at the top of Team Brain → the manual view: the six guided sections, each inline-editable by admins, read-only for operators.
- **AI interview** is the showcase creation path: a one-question-at-a-time flow (8 plain questions mapped to the six sections) → one forced tool-use Claude call synthesizes them into six clean sections in the founder's voice → the founder reviews and edits before anything saves (reusing the Session 4 draft-review pattern and the same `ANTHROPIC_BASE_URL` mock seam, extended to a `save_founder_manual` tool). "Write it myself" is just the section editor, blank.
- **Onboarding integration:** the manual leads the walkthrough as the first item (`label: "Start here"`), composed from whatever sections have content; skipped entirely if empty. No rebuild of onboarding — just prepended.

**Feature B — Drift Signals.**
- **Foundation:** no new core table (it reads `feedback_notes`), but two indexes (`20260717180100`) for the windowed/grouped access paths — `feedback_notes(run_id)` and `(playbook_id, created_at)`.
- **Attribution** (`src/lib/drift.ts`): a note is "about" the run's assignee when tied to a run, else the playbook's owner (standing note). Bulk queries, no N+1.
- **Recurring flag** on the playbook detail page: same operator, same playbook, ≥3 notes in 30 days → a warm "Worth a check-in" callout naming the operator and count.
- **Command View** gets a compact "Worth a check-in" section — only rendered when there's an actual signal, hidden otherwise.
- **Team page** gets a per-operator trend badge (up / steady / down over recent-vs-prior fortnight), shown only when there's signal.
- **Tone + gating:** every surface is admin-only (operators never see drift about themselves — enforced by the pages being `requireAdmin`), and the language is coaching ("worth a check-in", "might be worth a direct conversation"), never "underperforming".

**E2E:** `founder-manual.spec` (AI interview → review → save → display; operator read-only + manual as the first onboarding item) and `drift-signals.spec` (three review cycles on one run → recurring flag on playbook + Command View, up-trend on Team, and the operator's own home shows no drift). Both real-browser.

**Live-DB follow-up.** `20260717180000_founder_manual.sql` and `20260717180100_feedback_drift_indexes.sql` apply to CI automatically; both still need applying to the live project (Manual is inert on live until its table exists).
