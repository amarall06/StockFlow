begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' order by id limit 1),true);
set local role authenticated;
do $$
declare payload jsonb;receipt jsonb;source uuid:=gen_random_uuid();begin
 payload:=jsonb_build_object('source_id',source,'scenario_revision',1,'location','NORTE','notes','Teste transacional de contagem compartilhada','consulted_at','2026-11-02T14:30:00Z','started_at','2026-11-02T15:00:00Z','rows',jsonb_build_array(
 jsonb_build_object('code','AGM-35','status','Aguardando testagem','expected',20,'counted',19),
 jsonb_build_object('code','AGM-35','status','Liberado para venda','expected',20,'counted',20)));
 receipt:=public.submit_presentation_shelf_count(payload);
 if receipt->>'state'<>'awaiting_review' or receipt->>'actor_id'<>auth.uid()::text then raise exception 'Autoria/estado inválidos';end if;
 if public.submit_presentation_shelf_count(payload)<>receipt then raise exception 'Confirmação duplicada';end if;
 begin perform public.submit_presentation_shelf_count(jsonb_set(payload,'{notes}','"Alterado"'));raise exception 'Envio anterior sobrescrito';exception when serialization_failure then null;end;
 payload:=jsonb_set(payload,'{source_id}',to_jsonb(gen_random_uuid()));
 begin perform public.submit_presentation_shelf_count(jsonb_set(payload,'{rows,0,counted}','null'));raise exception 'Item em branco aceito';exception when invalid_parameter_value then null;end;
 begin perform public.submit_presentation_shelf_count(jsonb_set(payload,'{rows,0,counted}','1.5'));raise exception 'Fração aceita';exception when invalid_parameter_value then null;end;
 begin perform public.submit_presentation_shelf_count(jsonb_set(payload,'{rows,0,expected}','21'));raise exception 'Referência manipulada aceita';exception when serialization_failure then null;end;
 begin perform public.submit_presentation_shelf_count(jsonb_set(payload,'{rows}',payload->'rows'->0||'[]'::jsonb));raise exception 'Item ausente aceito';exception when invalid_parameter_value then null;end;
 begin perform public.submit_presentation_shelf_count(jsonb_set(payload,'{rows}',jsonb_build_array(payload#>'{rows,0}',payload#>'{rows,0}')));raise exception 'Duplicado aceito';exception when invalid_parameter_value then null;end;
 begin perform public.submit_presentation_shelf_count(jsonb_set(payload,'{location}','"LOCAL-INEXISTENTE"'));raise exception 'Local estranho aceito';exception when invalid_parameter_value then null;end;
 begin update public.presentation_shelf_counts set state='awaiting_review';raise exception 'Update direto permitido';exception when insufficient_privilege then null;end;
 begin delete from public.presentation_shelf_counts;raise exception 'Delete direto permitido';exception when insufficient_privilege then null;end;
 begin insert into public.presentation_shelf_counts default values;raise exception 'Insert direto permitido';exception when insufficient_privilege then null;end;
 if not exists(select 1 from realtime.messages where topic='inventory:changes' and event='inventory_changed') then raise exception 'Envio não emitiu invalidação';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='viewer' limit 1),true);
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.presentation_shelf_counts) then raise exception 'Consulta não leu histórico';end if;
 begin perform public.submit_presentation_shelf_count('{}');raise exception 'Consulta enviou contagem';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
do $$ begin
 if exists(select 1 from public.presentation_shelf_counts) then raise exception 'Sem perfil leu histórico';end if;
 begin perform public.submit_presentation_shelf_count('{}');raise exception 'Sem perfil enviou contagem';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' limit 1),true);
set local role authenticated;
select public.save_team_access(id,access_revision,'stockkeeper',true,coalesce(nullif(display_name,''),'Conta de validação'),gen_random_uuid()) is not null from public.profiles where role='viewer' limit 1;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='stockkeeper' limit 1),true);
set local role authenticated;
do $$ declare result jsonb;begin
 result:=public.submit_presentation_shelf_count(jsonb_build_object('source_id',gen_random_uuid(),'scenario_revision',1,'location','OESTE','rows','[]'::jsonb,'notes','Verificação de prateleira vazia','consulted_at','2026-11-02T14:30:00Z','started_at','2026-11-02T15:00:00Z'));
 if result->>'actor_id'<>auth.uid()::text then raise exception 'Estoquista não enviou contagem própria';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' limit 1),true);
set local role authenticated;
select public.save_team_access(id,access_revision,role,false,coalesce(nullif(display_name,''),'Conta de validação'),gen_random_uuid()) is not null from public.profiles where role='stockkeeper' limit 1;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='stockkeeper' limit 1),true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.presentation_shelf_counts) then raise exception 'Inativo leu histórico';end if;
 begin perform public.submit_presentation_shelf_count('{}');raise exception 'Inativo enviou contagem';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform 1 from public.presentation_shelf_counts;raise exception 'Anônimo leu histórico';exception when insufficient_privilege then null;end;
 begin perform public.submit_presentation_shelf_count('{}');raise exception 'Anônimo enviou contagem';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'Novos casos de contagens compartilhadas, referência, confirmação e permissões aprovados; dados de teste revertidos.' as result;
