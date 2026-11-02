begin;
do $$ begin
 if (select prosecdef from pg_proc where oid='public.update_own_display_name(text)'::regprocedure) then raise exception 'Privilégio elevado permaneceu exposto';end if;
 if not (select prosecdef from pg_proc where oid='private.update_own_display_name(text)'::regprocedure) then raise exception 'Implementação privada perdeu privilégio necessário';end if;
 if has_function_privilege('anon','public.update_own_display_name(text)','EXECUTE') or has_function_privilege('anon','private.update_own_display_name(text)','EXECUTE') then raise exception 'Anônimo pode executar função';end if;
end $$;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' limit 1),true);
set local role authenticated;
do $$ declare previous integer;begin
 select access_revision into strict previous from public.profiles where id=auth.uid();
 if public.update_own_display_name('Verificação da função isolada')<>'Verificação da função isolada' then raise exception 'Wrapper não encaminhou confirmação';end if;
 if (select access_revision from public.profiles where id=auth.uid())<>previous+1 then raise exception 'Wrapper não passou pelo controle de versão';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
set local role authenticated;
do $$ begin
 begin perform public.update_own_display_name('Tentativa');raise exception 'Wrapper permitiu conta sem perfil';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'Novos casos de isolamento da função de nome aprovados; alterações revertidas.' as result;
