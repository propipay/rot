-- Paso 5 · Recordatorios que se envían a Google Calendar o Google Tasks.
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  due_at timestamptz not null,
  target text not null default 'calendar' check (target in ('calendar', 'tasks')),
  notes text not null default '' check (char_length(notes) <= 2000),
  google_external_id text,
  sync_status text not null default 'pending' check (sync_status in ('pending', 'synced', 'error')),
  sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminders_user_due_idx on public.reminders (user_id, due_at);

alter table public.reminders enable row level security;

create policy "recordatorios propios" on public.reminders for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.reminders from anon;
