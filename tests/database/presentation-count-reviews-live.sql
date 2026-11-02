begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' order by id limit 1),true);
set local role authenticated;
do $$
declare original public.presentation_shelf_counts;other public.presentation_shelf_counts;receipt jsonb;request uuid:=gen_random_uuid();begin
 select * into strict original from public.presentation_shelf_counts where location='NORTE' order by id limit 1;
 select * into strict other from public.presentation_shelf_counts where location='SUL' order by id limit 1;
 receipt:=public.review_presentation_count(original.id,original.submission,'approved','Conferência de exemplo aprovada sem ajuste.',request);
 if receipt->>'decision'<>'approved' or receipt->>'reviewer_id'<>auth.uid()::text or receipt->'submission_snapshot'<>original.submission then raise exception 'Decisão/autoria/referência inválidas';end if;
 if public.review_presentation_count(original.id,original.submission,'approved','Conferência de exemplo aprovada sem ajuste.',request)<>receipt then raise exception 'Confirmação perdida não recuperada';end if;
 begin perform public.review_presentation_count(original.id,original.submission,'recount_requested','Outro parecer para o mesmo envio.',gen_random_uuid());raise exception 'Decisão anterior sobrescrita';exception when serialization_failure then null;end;
 begin perform public.review_presentation_count(other.id,other.submission,'approved','Conferência de exemplo aprovada sem ajuste.',request);raise exception 'UUID reaproveitado em outra contagem';exception when invalid_parameter_value then null;end;
 begin perform public.review_presentation_count(other.id,jsonb_set(other.submission,'{notes}','"Outra referência"'),'approved','Referência revisada incorretamente.',gen_random_uuid());raise exception 'Referência divergente aceita';exception when serialization_failure then null;end;
 begin perform public.review_presentation_count(other.id,other.submission,'approved','  ',gen_random_uuid());raise exception 'Justificativa vazia aceita';exception when invalid_parameter_value then null;end;
 begin perform public.review_presentation_count(other.id,other.submission,'adjust_stock','Não permitido por esta revisão.',gen_random_uuid());raise exception 'Ajuste aceito como decisão';exception when invalid_parameter_value then null;end;
 begin perform public.review_presentation_count(gen_random_uuid(),other.submission,'approved','Contagem inexistente.',gen_random_uuid());raise exception 'Contagem inexistente aceita';exception when invalid_parameter_value then null;end;
 perform public.review_presentation_count(other.id,other.submission,'recount_requested','Necessária nova conferência do exemplo.',gen_random_uuid());
 if (select state from public.presentation_shelf_counts where id=original.id)<>'awaiting_review' or (select submission from public.presentation_shelf_counts where id=original.id)<>original.submission then raise exception 'Envio original foi alterado';end if;
 begin update public.presentation_count_reviews set note='Reescrita direta';raise exception 'Update direto permitido';exception when insufficient_privilege then null;end;
 begin delete from public.presentation_count_reviews;raise exception 'Delete direto permitido';exception when insufficient_privilege then null;end;
 begin insert into public.presentation_count_reviews default values;raise exception 'Insert direto permitido';exception when insufficient_privilege then null;end;
 if not exists(select 1 from realtime.messages where topic='inventory:changes' and event='inventory_changed' and private) then raise exception 'Revisão não emitiu aviso privado';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='viewer' limit 1),true);
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.presentation_count_reviews) then raise exception 'Consulta não leu decisões';end if;
 begin perform public.review_presentation_count(gen_random_uuid(),'{}','approved','Tentativa sem permissão.',gen_random_uuid());raise exception 'Consulta aprovou contagem';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' limit 1),true);
set local role authenticated;
select public.save_team_access(id,access_revision,'stockkeeper',true,coalesce(nullif(display_name,''),'Conta de validação'),gen_random_uuid()) is not null from public.profiles where role='viewer' limit 1;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='stockkeeper' limit 1),true);
set local role authenticated;
do $$ begin
 begin perform public.review_presentation_count(gen_random_uuid(),'{}','approved','Tentativa de Estoquista.',gen_random_uuid());raise exception 'Estoquista aprovou contagem';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' limit 1),true);
set local role authenticated;
select public.save_team_access(id,access_revision,'administrator',false,coalesce(nullif(display_name,''),'Conta de validação'),gen_random_uuid()) is not null from public.profiles where role='stockkeeper' limit 1;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where not is_active limit 1),true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.presentation_count_reviews) then raise exception 'Inativo leu decisões';end if;
 begin perform public.review_presentation_count(gen_random_uuid(),'{}','approved','Tentativa de conta inativa.',gen_random_uuid());raise exception 'Inativo aprovou contagem';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
do $$ begin
 if exists(select 1 from public.presentation_count_reviews) then raise exception 'Sem perfil leu decisões';end if;
 begin perform public.review_presentation_count(gen_random_uuid(),'{}','approved','Tentativa sem perfil.',gen_random_uuid());raise exception 'Sem perfil aprovou contagem';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform 1 from public.presentation_count_reviews;raise exception 'Anônimo leu decisões';exception when insufficient_privilege then null;end;
 begin perform public.review_presentation_count(gen_random_uuid(),'{}','approved','Tentativa anônima.',gen_random_uuid());raise exception 'Anônimo chamou aprovação';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'Novos casos de revisão, aprovação/recontagem, confirmação, concorrência lógica e permissões aprovados; alterações revertidas.' as result;
