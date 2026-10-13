-- Movies we saw together. Run in Supabase -> SQL Editor after 0002.

create table if not exists movies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  year int,
  watched_on date,
  poster_url text,
  note text,
  created_by person,
  created_at timestamptz not null default now()
);

alter table movies enable row level security;
drop policy if exists "open access" on movies;
create policy "open access" on movies for all to anon, authenticated using (true) with check (true);
