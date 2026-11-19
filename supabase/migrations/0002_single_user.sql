-- Beta personal: solo andreslopezc98@gmail.com puede crear cuenta.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.only_owner_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if lower(coalesce(new.email, '')) <> 'andreslopezc98@gmail.com' then
    raise exception 'Registro no permitido';
  end if;
  return new;
end;
$$;

create trigger only_owner_signup
  before insert on auth.users
  for each row execute function private.only_owner_signup();
