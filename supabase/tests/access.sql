-- Run after provisioning the owner's UUID. Transaction rolls all checks back.
begin;
do $$ begin
  if not exists(select 1 from public.episodio_owner) then raise exception 'Configure o proprietário antes do teste'; end if;
  if has_table_privilege('anon','public.episodio_library','select') then raise exception 'Anon pode ler'; end if;
  if has_table_privilege('authenticated','public.episodio_library','update') then raise exception 'Escrita sem versão permitida'; end if;
  if has_function_privilege('anon','public.episodio_save_library(bigint,jsonb)','execute') then raise exception 'Anon pode gravar'; end if;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',user_id::text,'role','authenticated')::text,true) from public.episodio_owner;
set local role authenticated;
do $$ begin
  if (select count(*) from public.episodio_owner)<>1 then raise exception 'Proprietário não reconhecido'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.episodio_owner)<>0 then raise exception 'Outra conta vê proprietário'; end if;
  if (select count(*) from public.episodio_library)<>0 then raise exception 'Outra conta vê biblioteca'; end if;
  begin
    perform public.episodio_save_library(0,'{"schemaVersion":1,"items":[]}'::jsonb);
    raise exception 'Outra conta gravou';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
