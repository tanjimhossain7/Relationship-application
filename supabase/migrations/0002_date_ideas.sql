-- Date proposals: one person proposes what/where/when, the other answers.
-- Run in Supabase -> SQL Editor after 0001_init.sql.

create table if not exists date_ideas (
  id uuid primary key default gen_random_uuid(),
  from_person person not null,
  to_person person not null,
  what text not null,
  place text,
  on_date date,
  at_time text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'yes', 'maybe')),
  responded_at timestamptz,
  seen_answer_at timestamptz,
  event_id uuid,
  created_at timestamptz not null default now()
);

alter table date_ideas enable row level security;
drop policy if exists "open access" on date_ideas;
create policy "open access" on date_ideas for all to anon, authenticated using (true) with check (true);
