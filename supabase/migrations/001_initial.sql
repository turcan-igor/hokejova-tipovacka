create extension if not exists pgcrypto;

create type public.user_role as enum ('USER', 'ADMIN');
create type public.match_status as enum ('scheduled', 'live', 'final', 'postponed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role public.user_role not null default 'USER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  is_active boolean not null default true,
  max_uses integer,
  used_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.teams (
  code text primary key,
  name_cs text not null,
  name_en text not null
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  iihf_game_id text unique,
  phase text not null,
  starts_at timestamptz not null,
  venue text,
  group_name text,
  home_team_code text references public.teams(code),
  away_team_code text references public.teams(code),
  home_score integer,
  away_score integer,
  status public.match_status not null default 'scheduled',
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_draw_final check (
    status <> 'final'
    or home_score is null
    or away_score is null
    or home_score <> away_score
  )
);

create table public.match_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  home_score integer not null check (home_score >= 0),
  away_score integer not null check (away_score >= 0),
  points integer,
  is_exact boolean not null default false,
  scored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id),
  constraint prediction_no_draw check (home_score <> away_score)
);

create table public.medal_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  gold_team_code text not null references public.teams(code),
  silver_team_code text not null references public.teams(code),
  bronze_team_code text not null references public.teams(code),
  points integer,
  scored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint distinct_medal_teams check (
    gold_team_code <> silver_team_code
    and gold_team_code <> bronze_team_code
    and silver_team_code <> bronze_team_code
  )
);

create table public.final_medals (
  id integer primary key default 1 check (id = 1),
  gold_team_code text references public.teams(code),
  silver_team_code text references public.teams(code),
  bronze_team_code text references public.teams(code),
  updated_at timestamptz not null default now(),
  constraint distinct_final_medals check (
    gold_team_code is null
    or silver_team_code is null
    or bronze_team_code is null
    or (
      gold_team_code <> silver_team_code
      and gold_team_code <> bronze_team_code
      and silver_team_code <> bronze_team_code
    )
  )
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  teams_enabled boolean not null default false,
  teams_webhook_url text,
  reminder_hours_before integer not null default 24,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  matches_seen integer,
  error_message text
);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index matches_starts_at_idx on public.matches(starts_at);
create index match_predictions_user_idx on public.match_predictions(user_id);
create index match_predictions_match_idx on public.match_predictions(match_id);

insert into public.teams (code, name_cs, name_en) values
  ('AUT', 'Rakousko', 'Austria'),
  ('CAN', 'Kanada', 'Canada'),
  ('CZE', 'Česko', 'Czechia'),
  ('DEN', 'Dánsko', 'Denmark'),
  ('FIN', 'Finsko', 'Finland'),
  ('GBR', 'Velká Británie', 'Great Britain'),
  ('GER', 'Německo', 'Germany'),
  ('HUN', 'Maďarsko', 'Hungary'),
  ('ITA', 'Itálie', 'Italy'),
  ('LAT', 'Lotyšsko', 'Latvia'),
  ('NOR', 'Norsko', 'Norway'),
  ('SLO', 'Slovinsko', 'Slovenia'),
  ('SUI', 'Švýcarsko', 'Switzerland'),
  ('SVK', 'Slovensko', 'Slovakia'),
  ('SWE', 'Švédsko', 'Sweden'),
  ('USA', 'Spojené státy', 'United States')
on conflict (code) do nothing;

insert into public.invite_codes (code, max_uses)
values ('IIHF2026', null)
on conflict (code) do nothing;

insert into public.final_medals (id) values (1)
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.match_predictions enable row level security;
alter table public.medal_predictions enable row level security;
alter table public.final_medals enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.sync_runs enable row level security;
alter table public.admin_audit_log enable row level security;

create policy "profiles read authenticated" on public.profiles
  for select to authenticated using (true);

create policy "invite codes read admin" on public.invite_codes
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
  );

create policy "profiles update self" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "teams read authenticated" on public.teams
  for select to authenticated using (true);

create policy "matches read authenticated" on public.matches
  for select to authenticated using (true);

create policy "own match predictions read" on public.match_predictions
  for select to authenticated using (
    auth.uid() = user_id
    or exists (select 1 from public.matches m where m.id = match_id and m.starts_at <= now())
  );

create policy "own match predictions insert" on public.match_predictions
  for insert to authenticated with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.starts_at > now()
        and m.home_team_code is not null
        and m.away_team_code is not null
    )
  );

create policy "own match predictions update" on public.match_predictions
  for update to authenticated using (
    auth.uid() = user_id
    and exists (select 1 from public.matches m where m.id = match_id and m.starts_at > now())
  ) with check (auth.uid() = user_id);

create policy "own medal predictions read" on public.medal_predictions
  for select to authenticated using (
    auth.uid() = user_id
    or now() >= '2026-05-15 14:20:00+00'::timestamptz
  );

create policy "own medal predictions insert" on public.medal_predictions
  for insert to authenticated with check (
    auth.uid() = user_id and now() < '2026-05-15 14:20:00+00'::timestamptz
  );

create policy "own medal predictions update" on public.medal_predictions
  for update to authenticated using (
    auth.uid() = user_id and now() < '2026-05-15 14:20:00+00'::timestamptz
  ) with check (auth.uid() = user_id);

create policy "final medals read authenticated" on public.final_medals
  for select to authenticated using (true);

create policy "notification prefs own read" on public.notification_preferences
  for select to authenticated using (auth.uid() = user_id);

create policy "notification prefs own update" on public.notification_preferences
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sync read admin" on public.sync_runs
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
  );

create policy "audit read admin" on public.admin_audit_log
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
  );

create or replace function public.recompute_scores()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.match_predictions mp
  set
    points = case
      when m.status <> 'final' or m.home_score is null or m.away_score is null then null
      when mp.home_score = m.home_score and mp.away_score = m.away_score then 3
      when (mp.home_score > mp.away_score and m.home_score > m.away_score)
        or (mp.home_score < mp.away_score and m.home_score < m.away_score) then 1
      else 0
    end,
    is_exact = (
      m.status = 'final'
      and mp.home_score = m.home_score
      and mp.away_score = m.away_score
    ),
    scored_at = case
      when m.status = 'final' and m.home_score is not null and m.away_score is not null then now()
      else null
    end,
    updated_at = now()
  from public.matches m
  where m.id = mp.match_id;

  update public.medal_predictions mp
  set
    points = case
      when fm.gold_team_code is null or fm.silver_team_code is null or fm.bronze_team_code is null then null
      else
        case when mp.gold_team_code = fm.gold_team_code then 5 else 0 end
        + case when mp.silver_team_code = fm.silver_team_code then 5 else 0 end
        + case when mp.bronze_team_code = fm.bronze_team_code then 5 else 0 end
    end,
    scored_at = case
      when fm.gold_team_code is null or fm.silver_team_code is null or fm.bronze_team_code is null then null
      else now()
    end,
    updated_at = now()
  from public.final_medals fm
  where fm.id = 1;
end;
$$;
