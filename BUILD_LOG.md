# Clovior Build Log

Running record of deviations from `CLOVIOR_MASTER_BUILD.md` / `CLOVIOR_SESSION_PROMPTS.md` and why, so future sessions understand the as-built state.

## Session 1 — Foundation

- **shadcn/ui installed by hand, not via the CLI.** This environment's network policy blocks `ui.shadcn.com`, so the base primitives (Button, Input, Card, Badge, Avatar, Dialog, DropdownMenu, Separator, Tabs, Label) were written directly against Radix + CVA. Theme is overridden to the Clovior design system as specified, not shadcn defaults.
- **Migrations applied via the Supabase MCP connector**, not the Supabase CLI (`db push`) — the sandbox blocks direct HTTPS to `supabase.co`, but the MCP tool has its own path. Local migration filenames match the timestamps applied remotely.
- **`private` schema for RLS/trigger helpers.** RLS helper functions (`is_workspace_member`, `is_workspace_admin`, `my_membership_id`) are `SECURITY DEFINER` in a `private` schema so they can read `memberships` without triggering RLS self-recursion, and so PostgREST doesn't expose them as RPC. `private.set_updated_at` pins `search_path` (security-advisor fix).
- **Pending-invite linking via `public.accept_pending_invites()`** (SECURITY DEFINER), called from the auth callback. The invited user isn't an admin yet, so normal RLS can't flip their membership to active; the function acts only on rows matching the caller's own verified email. Chosen over using the service-role key (which wasn't provided to this session). Multiple pending invites across workspaces → all are joined (the doc's "join both" default).
- **Minimal `/app` shell for Session 1.** Just a top bar + team page, enough to test auth/invite. The real role-based sidebar, workspace switcher, and mobile nav are Session 2 per the plan — deliberately not built ahead.
- **Google OAuth + Resend need external config to function** (Google provider enabled with client ID/secret in the Supabase dashboard; Resend API key + verified domain). Code supports both; invites create the membership row and degrade gracefully when email isn't configured.
