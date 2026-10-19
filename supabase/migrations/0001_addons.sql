-- Eboncraft.dev: the whole data model is one table. Users live in Supabase Auth (GitHub OAuth).

create table public.addons (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references auth.users (id) on delete cascade,
  owner_login           text not null,
  owner_avatar_url      text,

  -- "owner/repo" exactly as GitHub returns it; slug is the lowercase form used in URLs.
  repo_full_name        text not null,
  slug                  text not null unique,
  default_branch        text not null default 'main',

  -- Synced from GitHub
  name                  text not null,
  description           text,
  readme                text,
  homepage              text,
  stars                 integer not null default 0,
  topics                text[] not null default '{}',

  -- Latest release
  latest_version        text,
  release_name          text,
  release_notes         text,
  release_published_at  timestamptz,
  download_url          text,
  download_name         text,
  download_size         bigint,
  download_is_source    boolean not null default false,

  -- Parsed from .toc files
  interface_versions    integer[] not null default '{}',
  flavors               text[] not null default '{}',  -- retail | classic | tbc | wrath | cata | mists

  -- Set by the developer
  categories            text[] not null default '{}',
  images                text[] not null default '{}',

  -- VirusTotal
  vt_status             text not null default 'unscanned', -- unscanned | pending | clean | flagged | error | too_large
  vt_sha256             text,
  vt_malicious          integer,
  vt_suspicious         integer,
  vt_checked_at         timestamptz,

  last_synced_at        timestamptz,
  sync_error            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index addons_owner_idx on public.addons (owner_id);
create index addons_flavors_idx on public.addons using gin (flavors);
create index addons_categories_idx on public.addons using gin (categories);
create index addons_release_idx on public.addons (release_published_at desc nulls last);
create index addons_search_idx on public.addons
  using gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || repo_full_name));

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger addons_touch before update on public.addons
  for each row execute function public.touch_updated_at();

alter table public.addons enable row level security;

create policy "Addons are public" on public.addons
  for select using (true);

-- No insert/update/delete policies on purpose. Every write goes through a server action that
-- checks the signed-in developer owns the repository, then writes with the service role. This keeps
-- synced fields (release, scan result) from being edited directly with the public anon key.
