-- rot.lealclub.com · esquema inicial (Fase 1)
-- Un solo usuario. Cada fila pertenece a auth.uid() y RLS impide cualquier otro acceso.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Andrés',
  water_goal_ml integer not null default 3000 check (water_goal_ml between 500 and 6000),
  exercise_goal_min integer not null default 30 check (exercise_goal_min between 5 and 180),
  sleep_goal_h numeric(3,1) not null default 7.5 check (sleep_goal_h between 4 and 12),
  timezone text not null default 'America/Caracas',
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_logs (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  day date not null,
  water_ml integer not null default 0 check (water_ml between 0 and 10000),
  exercise_min integer not null default 0 check (exercise_min between 0 and 600),
  sleep_start time,
  sleep_end time,
  gratitude text not null default '' check (char_length(gratitude) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.profiles enable row level security;
alter table public.daily_logs enable row level security;

create policy "perfil propio" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "registros propios" on public.daily_logs
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Sin acceso anónimo
revoke all on public.profiles, public.daily_logs from anon;
