-- Us app: full schema. Run this once in Supabase -> SQL Editor -> New query -> Run.
-- There is no login: the app is protected only by nobody else knowing the link,
-- so every table allows the public "anon" key to read and write.

create extension if not exists "pgcrypto";

-- Who is who: 'tanzim' or 'azrina'
do $$ begin
  create type person as enum ('tanzim', 'azrina');
exception when duplicate_object then null; end $$;

-- Music --------------------------------------------------------------------
create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('sent', 'lately')),
  from_person person not null,
  to_person person,
  spotify_url text not null,
  title text,
  artist text,
  image_url text,
  note text,
  prompt text,
  seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists songs_created_idx on songs (created_at desc);

-- Major events + memories ---------------------------------------------------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  end_date date,
  type text not null default 'other',
  notes text,
  yearly boolean not null default false,
  image_path text,
  created_by person,
  created_at timestamptz not null default now()
);
create index if not exists events_date_idx on events (date);

-- Photobooth ------------------------------------------------------------------
create table if not exists photobooth (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  caption text,
  taken_on date,
  created_by person,
  created_at timestamptz not null default now()
);

-- Weekly picture (temporary: the app deletes picks older than 4 weeks) -------
create table if not exists weekly_picks (
  id uuid primary key default gen_random_uuid(),
  chooser person not null,
  for_person person not null,
  week_start date not null,
  image_path text not null,
  caption text,
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (chooser, week_start)
);

-- Daily games -----------------------------------------------------------------
create table if not exists game_scores (
  id uuid primary key default gen_random_uuid(),
  person person not null,
  game text not null,
  played_on date not null,
  score numeric not null,
  failed boolean not null default false,
  raw text,
  created_at timestamptz not null default now(),
  unique (person, game, played_on)
);

-- Thoughtboard ----------------------------------------------------------------
create table if not exists thoughts (
  id uuid primary key default gen_random_uuid(),
  person person not null,
  body text not null,
  reaction text,
  seen_at timestamptz,
  created_at timestamptz not null default now()
);

-- Restaurants (one row per visit) ----------------------------------------------
create table if not exists restaurant_visits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  visited_on date not null,
  cuisine text,
  area text,
  tanzim_rating numeric check (tanzim_rating between 0 and 10),
  azrina_rating numeric check (azrina_rating between 0 and 10),
  tanzim_review text,
  azrina_review text,
  created_by person,
  created_at timestamptz not null default now()
);
create index if not exists visits_date_idx on restaurant_visits (visited_on desc);

-- Login streaks (one row per person, nothing else stored) ---------------------
create table if not exists streaks (
  person person primary key,
  current integer not null default 0,
  best integer not null default 0,
  last_day date
);

-- Picture library for streak popups and surprise animations -----------------
create table if not exists library_images (
  id uuid primary key default gen_random_uuid(),
  slot text not null,
  image_path text not null,
  created_at timestamptz not null default now()
);

-- Open access for the anon key -------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['songs','events','photobooth','weekly_picks','game_scores','thoughts','restaurant_visits','streaks','library_images']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "open access" on %I', t);
    execute format('create policy "open access" on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Photo storage bucket ------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

drop policy if exists "photos read" on storage.objects;
drop policy if exists "photos write" on storage.objects;
drop policy if exists "photos delete" on storage.objects;
create policy "photos read" on storage.objects for select to anon, authenticated using (bucket_id = 'photos');
create policy "photos write" on storage.objects for insert to anon, authenticated with check (bucket_id = 'photos');
create policy "photos delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'photos');
