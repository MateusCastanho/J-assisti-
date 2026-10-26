begin;

-- Exactly one account is allowed. Populate from a trusted admin session only.
create table public.episodio_owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete cascade
);
alter table public.episodio_owner enable row level security;
revoke all on public.episodio_owner from public, anon, authenticated;
grant select on public.episodio_owner to authenticated;
create policy owner_reads_own_access on public.episodio_owner for select to authenticated
  using (user_id = (select auth.uid()));

create table public.episodio_library (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version bigint not null check(version > 0),
  payload jsonb not null check(jsonb_typeof(payload)='object'),
  updated_at timestamptz not null default now()
);
alter table public.episodio_library enable row level security;
revoke all on public.episodio_library from public, anon, authenticated;
grant select on public.episodio_library to authenticated;
create policy owner_reads_library on public.episodio_library for select to authenticated
  using (user_id=(select auth.uid()) and exists(select 1 from public.episodio_owner o where o.user_id=(select auth.uid())));

create schema if not exists episodio_private;
revoke all on schema episodio_private from public,anon;
grant usage on schema episodio_private to authenticated;

-- All writes go through optimistic concurrency control; never grant direct DML.
create function episodio_private.save_library(expected_version bigint, new_payload jsonb)
returns table(version bigint,payload jsonb)
language plpgsql security definer set search_path=''
as $$
declare
  caller uuid := auth.uid();
  prior_version bigint;
begin
  if caller is null or not exists(select 1 from public.episodio_owner o where o.singleton and o.user_id=caller) then
    raise exception 'Conta sem acesso' using errcode='42501';
  end if;
  if new_payload is null or jsonb_typeof(new_payload) is distinct from 'object'
    or new_payload->>'schemaVersion' is distinct from '1'
    or jsonb_typeof(new_payload->'items') is distinct from 'array'
    or octet_length(new_payload::text)>15000000 then
    raise exception 'Biblioteca inválida' using errcode='22023';
  end if;
  if jsonb_array_length(new_payload->'items')>20000 then
    raise exception 'Biblioteca muito grande' using errcode='22023';
  end if;
  -- Serializes both initial creation and updates without race on an absent row.
  perform pg_catalog.pg_advisory_xact_lock(481726,1);
  select l.version into prior_version from public.episodio_library l where l.user_id=caller;
  if coalesce(prior_version,0) is distinct from expected_version then
    raise exception 'Biblioteca alterada em outro aparelho' using errcode='40001';
  end if;
  insert into public.episodio_library(user_id,version,payload)
    values(caller,coalesce(prior_version,0)+1,new_payload)
  on conflict(user_id) do update set version=excluded.version,payload=excluded.payload,updated_at=now();
  return query select l.version,l.payload from public.episodio_library l where l.user_id=caller;
end;
$$;
revoke all on function episodio_private.save_library(bigint,jsonb) from public,anon;
grant execute on function episodio_private.save_library(bigint,jsonb) to authenticated;
create function public.episodio_save_library(expected_version bigint,new_payload jsonb)
returns table(version bigint,payload jsonb)
language sql security invoker set search_path=''
as $$ select * from episodio_private.save_library(expected_version,new_payload); $$;
revoke all on function public.episodio_save_library(bigint,jsonb) from public,anon;
grant execute on function public.episodio_save_library(bigint,jsonb) to authenticated;
commit;
