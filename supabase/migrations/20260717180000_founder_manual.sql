-- Founder's Manual (Addition A). A singular, structured artifact per workspace that
-- captures HOW the founder thinks and expects to be worked with — distinct from Team
-- Brain entries (which hold the WHAT: SOPs, tools, contacts). Research names this the
-- single biggest driver of operator churn, so it's a first-class object here.
--
-- One row per section, keyed by a fixed set, uniquely per workspace — so the six
-- guided sections can be displayed cleanly and edited independently.

create table if not exists public.founder_manual_sections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  section_key text not null check (
    section_key in (
      'communication',
      'delivery',
      'response_time',
      'dealbreakers',
      'trust',
      'standard'
    )
  ),
  body text,
  updated_at timestamptz not null default now(),
  unique (workspace_id, section_key)
);

create index if not exists founder_manual_sections_workspace_idx
  on public.founder_manual_sections (workspace_id);

alter table public.founder_manual_sections enable row level security;

-- Explicit grants (RLS below is the row-level gate), consistent with the other
-- migration-created tables.
grant select, insert, update, delete
  on public.founder_manual_sections to authenticated;
grant select on public.founder_manual_sections to anon;

-- Every active member reads the manual — it's the onboarding surface, deliberately open.
-- Only founders/managers write it. Resolved through the same SECURITY DEFINER helpers
-- the rest of the schema uses, so there's no recursion or visibility dependency.
drop policy if exists "founder_manual_select" on public.founder_manual_sections;
create policy "founder_manual_select" on public.founder_manual_sections
  for select using (private.is_workspace_member(workspace_id));

drop policy if exists "founder_manual_admin_write" on public.founder_manual_sections;
create policy "founder_manual_admin_write" on public.founder_manual_sections
  for all
  using (private.is_workspace_admin(workspace_id))
  with check (private.is_workspace_admin(workspace_id));
