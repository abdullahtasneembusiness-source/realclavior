-- Human-readable workspace slugs for clean URLs (/w/abdullahs-team instead of a UUID).
-- Routing resolves a workspace by slug; old /w/<uuid> links 301-redirect to the slug.
-- Column + helper-function change only. No RLS, permission, or feature change: RLS still
-- gates every row, and the slug is only a second lookup key for the same workspace row.

-- Slugify a name: lowercase, drop apostrophes/quotes, collapse any run of non-alphanumeric
-- characters to a single hyphen, then trim hyphens. "Abdullah's team" -> "abdullahs-team".
create or replace function public.slugify(p_text text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(coalesce(p_text, '')), '[''’‘`"]', '', 'g'),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

-- Add the column nullable first so we can backfill, then lock it to NOT NULL + unique.
alter table workspaces add column if not exists slug text;

-- A unique, never-empty slug for a name. Empty results (e.g. an all-emoji name) fall back
-- to a short readable random slug; collisions get a numeric suffix (-2, -3, ...).
create or replace function public.unique_workspace_slug(p_name text, p_exclude uuid default null)
returns text
language plpgsql
as $$
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
$$;

-- Backfill existing workspaces, oldest first so earlier workspaces keep the cleanest slug.
do $$
declare
  r record;
begin
  for r in select id, name from workspaces where slug is null order by created_at loop
    update workspaces set slug = public.unique_workspace_slug(r.name, r.id) where id = r.id;
  end loop;
end $$;

alter table workspaces alter column slug set not null;
create unique index if not exists workspaces_slug_key on workspaces (slug);

-- New workspaces get a unique slug at insert time. Retry on the (rare) race where two
-- same-named workspaces are created concurrently and compute the same base slug.
create or replace function public.create_workspace(p_name text, p_color text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
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
$$;
