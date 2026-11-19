-- Meal prep · schema Supabase
-- Incolla tutto in Supabase → SQL Editor → New query → Run.
--
-- Modello: ogni "casa" (household) ha un codice segreto lungo, condiviso con un link.
-- La tabella non è leggibile né scrivibile direttamente dal browser: si passa solo
-- dalle due funzioni qui sotto, che richiedono il codice.

create table if not exists public.mp_state (
  household  text   not null,
  key        text   not null,
  value      jsonb,
  updated_at bigint not null,          -- millisecondi epoch, usato per "last write wins"
  primary key (household, key)
);

alter table public.mp_state enable row level security;
revoke all on public.mp_state from anon, authenticated;

-- Legge tutto lo stato di una casa + l'ora del server (per correggere orologi sballati).
create or replace function public.mp_get(p_household text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'now',   (extract(epoch from clock_timestamp()) * 1000)::bigint,
    'items', coalesce(jsonb_object_agg(key, jsonb_build_object('v', value, 't', updated_at)), '{}'::jsonb)
  )
  from public.mp_state
  where household = p_household and length(p_household) >= 16;
$$;

-- Scrive più chiavi. Vince sempre la modifica più recente.
create or replace function public.mp_put(p_household text, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(p_household) < 16 or length(p_household) > 64 then
    raise exception 'codice casa non valido';
  end if;
  if jsonb_typeof(p_items) <> 'object' then
    raise exception 'formato non valido';
  end if;

  insert into public.mp_state (household, key, value, updated_at)
  select p_household, e.key, e.value -> 'v', (e.value ->> 't')::bigint
  from jsonb_each(p_items) as e
  where length(e.key) <= 80
  on conflict (household, key) do update
    set value = excluded.value, updated_at = excluded.updated_at
    where public.mp_state.updated_at < excluded.updated_at;
end;
$$;

revoke all on function public.mp_get(text) from public;
revoke all on function public.mp_put(text, jsonb) from public;
grant execute on function public.mp_get(text) to anon, authenticated;
grant execute on function public.mp_put(text, jsonb) to anon, authenticated;
