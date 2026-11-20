-- Historial de tomas de agua del día (sincroniza junto con la fila diaria, funciona sin conexión)
alter table public.daily_logs
  add column if not exists water_events jsonb not null default '[]'::jsonb;

alter table public.daily_logs
  add constraint water_events_is_array check (jsonb_typeof(water_events) = 'array' and jsonb_array_length(water_events) <= 200);
