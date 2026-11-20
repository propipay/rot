-- Paso 4 · Cielo: perfil astral privado, lectura diaria en caché y eventos astronómicos curados.
-- Los datos natales NO se guardan en este repositorio: se cargan directo en la base de datos.

create table if not exists public.astro_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  profile_json jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_sky_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  insight_date date not null,
  astronomy_json jsonb not null,
  horoscope_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, insight_date)
);

create table if not exists public.astronomical_events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  kind text not null default 'meteoros',
  title text not null,
  description text not null default ''
);

alter table public.astro_profile enable row level security;
alter table public.daily_sky_insights enable row level security;
alter table public.astronomical_events enable row level security;

create policy "perfil astral propio" on public.astro_profile for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "cielo propio" on public.daily_sky_insights for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "eventos visibles" on public.astronomical_events for select to authenticated using (true);

revoke all on public.astro_profile, public.daily_sky_insights, public.astronomical_events from anon;

insert into public.astronomical_events (event_date, kind, title, description) values
  ('2026-12-14', 'meteoros', 'Lluvia de meteoros Gemínidas', 'Pico aproximado. Mira hacia Géminis después de medianoche, lejos de las luces.'),
  ('2026-12-22', 'meteoros', 'Lluvia de meteoros Úrsidas', 'Pico aproximado. Actividad baja, cerca del solsticio.'),
  ('2027-01-03', 'meteoros', 'Lluvia de meteoros Cuadrántidas', 'Pico aproximado, breve e intenso antes del amanecer.'),
  ('2027-04-22', 'meteoros', 'Lluvia de meteoros Líridas', 'Pico aproximado, mejor de madrugada.'),
  ('2027-05-06', 'meteoros', 'Lluvia de meteoros Eta Acuáridas', 'Pico aproximado; favorable desde latitudes tropicales antes del amanecer.'),
  ('2027-08-12', 'meteoros', 'Lluvia de meteoros Perseidas', 'Pico aproximado, una de las más activas del año.'),
  ('2027-10-21', 'meteoros', 'Lluvia de meteoros Oriónidas', 'Pico aproximado, restos del cometa Halley.'),
  ('2027-11-17', 'meteoros', 'Lluvia de meteoros Leónidas', 'Pico aproximado, mejor de madrugada.'),
  ('2027-12-14', 'meteoros', 'Lluvia de meteoros Gemínidas', 'Pico aproximado. Mira hacia Géminis después de medianoche.');
