begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' limit 1),true);
set local role authenticated;
do $$ declare h public.presentation_recurrence_rules%rowtype;r jsonb;attempt uuid:=gen_random_uuid();begin
 select * into strict h from public.presentation_recurrence_rules;
 r:=public.save_presentation_recurrence_rule(h.revision,4,45,attempt);
 if (r->>'revision')::int<>h.revision+1 or (r->>'occurrences')::int<>4 then raise exception 'Regra não confirmada';end if;
 if public.save_presentation_recurrence_rule(h.revision,4,45,attempt)<>r then raise exception 'Confirmação duplicada';end if;
 perform public.save_presentation_recurrence_rule(h.revision+1,5,60,gen_random_uuid());
 if public.save_presentation_recurrence_rule(h.revision,4,45,attempt)<>r or (select revision from public.presentation_recurrence_rules)<>h.revision+2 then raise exception 'Repetição antiga restaurou regra';end if;
 begin perform public.save_presentation_recurrence_rule(h.revision,4,45,gen_random_uuid());raise exception 'Versão antiga aceita';exception when serialization_failure then null;end;
 begin perform public.save_presentation_recurrence_rule(h.revision,5,45,attempt);raise exception 'UUID reutilizado';exception when invalid_parameter_value then null;end;
 begin perform public.save_presentation_recurrence_rule(h.revision+2,1,30,gen_random_uuid());raise exception 'Limite inválido aceito';exception when invalid_parameter_value then null;end;
 begin perform public.save_presentation_recurrence_rule(h.revision+2,3,0,gen_random_uuid());raise exception 'Prazo inválido aceito';exception when invalid_parameter_value then null;end;
 begin update public.presentation_recurrence_rules set days=9;raise exception 'Escrita direta permitida';exception when insufficient_privilege then null;end;
 begin perform 1 from private.presentation_recurrence_requests;raise exception 'Auditoria exposta';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='viewer' limit 1),true);
set local role authenticated;
do $$ declare h public.presentation_recurrence_rules%rowtype;begin
 select * into strict h from public.presentation_recurrence_rules;
 begin perform public.save_presentation_recurrence_rule(h.revision,4,45,gen_random_uuid());raise exception 'Consulta gravou';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.presentation_recurrence_rules) then raise exception 'Perfil não autorizado leu';end if;
 begin perform public.save_presentation_recurrence_rule(1,4,45,gen_random_uuid());raise exception 'Perfil não autorizado gravou';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ begin
 begin perform 1 from public.presentation_recurrence_rules;raise exception 'Anônimo leu';exception when insufficient_privilege then null;end;
 begin perform public.save_presentation_recurrence_rule(1,4,45,gen_random_uuid());raise exception 'Anônimo gravou';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'recurrence_permissions_version_recovery_ok' as result;
