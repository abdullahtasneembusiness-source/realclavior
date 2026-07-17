-- AI usage log — backs the per-workspace daily rate limit on AI playbook generation
-- (Phase 2b). One row per generation attempt; the endpoint counts today's rows for
-- the workspace before calling the model, so a founder can't spam expensive calls.
-- Kept as a real table (not in-memory) because the app runs on serverless functions
-- where no single instance sees the full request stream.

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  membership_id uuid references public.memberships (id) on delete set null,
  kind text not null default 'playbook_draft',
  created_at timestamptz not null default now()
);

-- Counting is always "this workspace, since midnight" — index for exactly that.
create index if not exists ai_generations_workspace_created_idx
  on public.ai_generations (workspace_id, created_at desc);

alter table public.ai_generations enable row level security;

-- Tables created via raw SQL migrations don't inherit the platform's default
-- privileges, so grant table access explicitly (RLS below is the row-level gate).
grant select, insert on public.ai_generations to authenticated;

-- Only founders/managers generate playbooks, and only within their own workspace.
-- The workspace is resolved through the same SECURITY DEFINER helper the rest of the
-- schema uses, so there's no visibility dependency or policy recursion.
drop policy if exists "ai_generations_admin_read" on public.ai_generations;
create policy "ai_generations_admin_read" on public.ai_generations
  for select using (private.is_workspace_admin(workspace_id));

drop policy if exists "ai_generations_admin_insert" on public.ai_generations;
create policy "ai_generations_admin_insert" on public.ai_generations
  for insert with check (private.is_workspace_admin(workspace_id));
