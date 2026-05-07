create table if not exists public.group_standings (
  id uuid primary key default gen_random_uuid(),
  group_name text not null,
  rank integer not null,
  team_code text not null references public.teams(code),
  games_played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  goals_for integer not null default 0,
  goals_against integer not null default 0,
  goal_difference integer not null default 0,
  points integer not null default 0,
  source text not null default 'fallback',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_name, team_code)
);

alter table public.group_standings enable row level security;

drop policy if exists "group standings read authenticated" on public.group_standings;
create policy "group standings read authenticated" on public.group_standings
  for select to authenticated using (true);
