create table if not exists public.player_stats (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  team_code text not null references public.teams(code),
  position text,
  games_played integer not null default 0,
  goals integer not null default 0,
  assists integer not null default 0,
  points integer not null default 0,
  plus_minus text,
  penalty_minutes integer,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_name, team_code)
);

alter table public.player_stats enable row level security;

drop policy if exists "player stats read authenticated" on public.player_stats;
create policy "player stats read authenticated" on public.player_stats
  for select to authenticated using (true);
