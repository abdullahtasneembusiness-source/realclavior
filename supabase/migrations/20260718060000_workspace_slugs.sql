-- Human-readable workspace slugs for clean URLs (/w/abdullahs-team instead of a UUID).
-- Routing resolves a workspace by slug; old /w/<uuid> links 301-redirect to the slug.
-- Column + helper-function change only. No RLS, permission, or feature change: RLS still
-- gates every row, and the slug is only a second lookup key for the same workspace row.
--
-- Uses named dollar-quote tags and set-based backfill (no anonymous DO block) so the whole
-- script runs cleanly in the Supabase SQL editor as well as the CLI.

-- Slugify a name: lowercase, drop apostrophes/quotes (built from chr() codes so the source
-- stays plain ASCII), collapse non-alphanumeric runs to a single hyphen, trim hyphens.
-- "Abdullah's team" -> "abdullahs-team".
create or replace function public.slugify(p_text text)
returns text
language sql
immutable
as $slugify$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(coalesce(p_text, '')),
        '[' || chr(39) || chr(96) || chr(34) || chr(8216) || chr(8217) || ']',
        '',
        'g'
      ),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$slugify$;

-- Add the column nullable first so we can backfill, then lock it to NOT NULL + unique.
alter table workspaces add column if not exists slug text;

-- A unique, never-empty slug for a name. Empty results (e.g. an all-emoji name) fall back
-- to a short readable random slug; collisions get a numeric suffix (-2, -3, ...).
create or replace function public.unique_workspace_slug(p_name text, p_exclude uuid default null)
returns text
language plpgsql
as $uniq$
declare
  v_base text := public.slugify(p_name);
  v_slug text;
  v_n int := 1;
begin
  if v_base is null or v_base = '' then
    v_base := 'team-' || substr(md5(gen_random_uuid()::text), 1, 6);
  end if;
  v_slug := v_base;
  while exists (
    select 1 from workspaces
    where slug = v_slug and (p_exclude is null or id <> p_exclude)
  ) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  return v_slug;
end;
$uniq$;

-- Backfill (set-based, no procedural block). First give every workspace a base slug, with
-- the random fallback for empty ones.
update workspaces
set slug = coalesce(
  nullif(public.slugify(name), ''),
  'team-' || substr(md5(gen_random_uuid()::text), 1, 6)
)
where slug is null;

-- Then de-duplicate: keep the oldest workspace's slug, suffix later collisions (-2, -3, ...).
with ranked as (
  select id, slug, row_number() over (partition by slug order by created_at, id) as rn
  from workspaces
)
update workspaces w
set slug = w.slug || '-' || r.rn
from ranked r
where w.id = r.id and r.rn > 1;

alter table workspaces alter column slug set not null;
create unique index if not exists workspaces_slug_key on workspaces (slug);

-- New workspaces get a unique slug at insert time. Retry on the (rare) race where two
-- same-named workspaces are created concurrently and compute the same base slug.
create or replace function public.create_workspace(p_name text, p_color text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $cw$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(p_name);
  v_workspace_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'workspace name must be between 2 and 80 characters'
      using errcode = '22023';
  end if;

  loop
    begin
      insert into workspaces (name, owner_id, slug)
      values (v_name, v_uid, public.unique_workspace_slug(v_name))
      returning id into v_workspace_id;
      exit;
    exception when unique_violation then
      -- Another workspace claimed this slug between compute and insert; recompute + retry.
    end;
  end loop;

  insert into memberships (workspace_id, user_id, role, title, color, status)
  values (v_workspace_id, v_uid, 'founder', 'Founder', p_color, 'active');

  return v_workspace_id;
end;
$cw$;
