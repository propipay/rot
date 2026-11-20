-- Paso 3: nutrición consciente, hábitos y rachas. RLS: solo el dueño.
create table if not exists public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  logged_at timestamptz not null default now(),
  meal_type text not null check (meal_type in ('desayuno','almuerzo','cena','snack')),
  screen_free boolean not null default false,
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
  energy_after text check (energy_after in ('alta','estable','pesada')),
  notes text not null default '' check (char_length(notes) <= 500),
  unique (user_id, day, meal_type)
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  type text not null check (type in ('quit_streak','daily_check')),
  started_at timestamptz,
  best_streak_days integer not null default 0 check (best_streak_days >= 0),
  active boolean not null default true,
  icon text,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  logged_date date not null,
  completed boolean not null default true,
  event_type text not null check (event_type in ('check','reset')),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create unique index if not exists habit_logs_one_check_per_day on public.habit_logs (habit_id, logged_date) where event_type = 'check';
create index if not exists habit_logs_user_date on public.habit_logs (user_id, logged_date);
create index if not exists habit_logs_habit on public.habit_logs (habit_id);
create index if not exists habits_user on public.habits (user_id);
create index if not exists nutrition_logs_user_day on public.nutrition_logs (user_id, day);

alter table public.nutrition_logs enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "nutricion propia" on public.nutrition_logs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "habitos propios" on public.habits for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "registros de habitos propios" on public.habit_logs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.nutrition_logs, public.habits, public.habit_logs from anon;
