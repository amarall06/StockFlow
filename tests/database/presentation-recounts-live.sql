begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' order by id limit 1),true);
set local role authenticated;
do $$
declare parent public.presentation_shelf_counts;approved public.presentation_shelf_counts;pending public.presentation_shelf_counts;payload jsonb;receipt jsonb;next_payload jsonb;review jsonb;baseline int;begin
 select * into strict parent from public.presentation_shelf_counts where location='NORTE' order by created_at limit 1;
 select * into strict approved from public.presentation_shelf_counts where location='SUL' order by created_at limit 1;
 select * into strict pending from public.presentation_shelf_counts where location='OESTE' order by created_at limit 1;
 select count(*) into baseline from public.presentation_shelf_counts;
 payload:=jsonb_set(jsonb_set(parent.submission,'{source_id}',to_jsonb(gen_random_uuid()::text)),'{recount_of}',to_jsonb(parent.id::text));
 begin perform public.submit_presentation_shelf_count(jsonb_set(payload,'{recount_of}',to_jsonb(approved.id::text)));raise exception 'Origem aprovada aceitou recontagem';exception when serialization_failure then null;end;
 begin perform public.submit_presentation_shelf_count(jsonb_set(payload,'{recount_of}',to_jsonb(pending.id::text)));raise exception 'Origem sem decisão aceitou recontagem';exception when serialization_failure then null;end;
 begin perform public.submit_presentation_shelf_count(jsonb_set(payload,'{recount_of}',to_jsonb(gen_random_uuid()::text)));raise exception 'Origem inexistente aceita';exception when invalid_parameter_value then null;end;
 begin perform public.submit_presentation_shelf_count(jsonb_set(payload,'{recount_of}','null'));raise exception 'Origem nula aceita';exception when invalid_parameter_value then null;end;
 begin perform public.submit_presentation_shelf_count(jsonb_set(payload,'{location}','"SUL"'));raise exception 'Outra prateleira aceita';exception when serialization_failure then null;end;
 begin perform public.submit_presentation_shelf_count(jsonb_set(payload,'{rows,0,counted}','null'));raise exception 'Contagem incompleta aceita';exception when invalid_parameter_value then null;end;
 if (select count(*) from public.presentation_shelf_counts)<>baseline or exists(select 1 from public.presentation_recount_links) then raise exception 'Validação deixou envio ou vínculo órfão';end if;
 receipt:=public.submit_presentation_shelf_count(payload);
 if not exists(select 1 from public.presentation_recount_links l join public.presentation_count_reviews r on r.id=l.parent_review_id where l.parent_count_id=parent.id and l.child_count_id=(receipt->>'id')::uuid and l.created_by=auth.uid() and r.decision='recount_requested') then raise exception 'Vínculo ou solicitação original incorretos';end if;
 if public.submit_presentation_shelf_count(payload)<>receipt then raise exception 'Recuperação duplicou envio';end if;
 begin perform public.submit_presentation_shelf_count(jsonb_set(payload,'{source_id}',to_jsonb(gen_random_uuid()::text)));raise exception 'Segunda recontagem direta aceita';exception when serialization_failure then null;end;
 begin perform public.submit_presentation_shelf_count(jsonb_set(payload,'{recount_of}',to_jsonb(approved.id::text)));raise exception 'Identidade reusada em outra origem';exception when serialization_failure then null;end;
 if (select submission from public.presentation_shelf_counts where id=parent.id)<>parent.submission then raise exception 'Origem foi alterada';end if;
 -- Uma nova solicitação sobre a filha cria a próxima etapa, sem reescrever a anterior.
 review:=public.review_presentation_count((receipt->>'id')::uuid,payload,'recount_requested','Conferir novamente esta recontagem de exemplo.',gen_random_uuid());
 next_payload:=jsonb_set(jsonb_set(payload,'{source_id}',to_jsonb(gen_random_uuid()::text)),'{recount_of}',receipt->'id');
 perform public.submit_presentation_shelf_count(next_payload);
 if (select count(*) from public.presentation_recount_links)<>2 then raise exception 'Sequência de recontagens incompleta';end if;
 begin update public.presentation_recount_links set created_by=gen_random_uuid();raise exception 'Update direto permitido';exception when insufficient_privilege then null;end;
 begin delete from public.presentation_recount_links;raise exception 'Delete direto permitido';exception when insufficient_privilege then null;end;
 begin insert into public.presentation_recount_links default values;raise exception 'Insert direto permitido';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='viewer' limit 1),true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.presentation_recount_links)<>2 then raise exception 'Consulta não leu sequência';end if;
 begin perform public.submit_presentation_shelf_count(jsonb_build_object('source_id',gen_random_uuid(),'recount_of',gen_random_uuid()));raise exception 'Consulta enviou recontagem';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
do $$ begin if exists(select 1 from public.presentation_recount_links) then raise exception 'Sem perfil leu vínculos';end if;end $$;
reset role;
set local role anon;
do $$ begin begin perform 1 from public.presentation_recount_links;raise exception 'Anônimo leu vínculos';exception when insufficient_privilege then null;end;end $$;
reset role;
rollback;
select 'Novos casos de vínculos, sequência, confirmação e permissões aprovados; alterações revertidas.' as result;
