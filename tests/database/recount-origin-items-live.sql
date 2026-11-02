begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' order by id limit 1),true);
set local role authenticated;
do $$ declare payload jsonb;root jsonb;next_payload jsonb;child jsonb;begin
 select submission into strict payload from public.presentation_shelf_counts where location='NORTE' and not submission ? 'recount_of' order by created_at limit 1;
 payload:=jsonb_set(jsonb_set(payload,'{source_id}',to_jsonb(gen_random_uuid()::text)),'{rows}',(payload->'rows')||jsonb_build_array(jsonb_build_object('code','MGM-35','status','Em estoque','expected',0,'counted',1)));
 root:=public.submit_presentation_shelf_count(payload);
 perform public.review_presentation_count((root->>'id')::uuid,payload,'recount_requested','Conferir item encontrado sem saldo na origem.',gen_random_uuid());
 next_payload:=jsonb_set(jsonb_set(payload,'{source_id}',to_jsonb(gen_random_uuid()::text)),'{recount_of}',root->'id');
 begin perform public.submit_presentation_shelf_count(jsonb_set(next_payload,'{rows}',(next_payload->'rows')-2));raise exception 'Item encontrado foi omitido';exception when invalid_parameter_value then null;end;
 if exists(select 1 from public.presentation_recount_links where parent_count_id=(root->>'id')::uuid) then raise exception 'Recusa deixou vínculo órfão';end if;
 child:=public.submit_presentation_shelf_count(jsonb_set(next_payload,'{rows,2,counted}','0'));
 if child#>>'{submission,rows,2,counted}'<>'0' then raise exception 'Zero conferido não foi registrado';end if;
 if (select submission#>>'{rows,2,counted}' from public.presentation_shelf_counts where id=(root->>'id')::uuid)<>'1' then raise exception 'Contagem de origem foi alterada';end if;
end $$;
reset role;
rollback;
select 'Novo caso de item encontrado sem saldo preservado/exigido na recontagem aprovado; alterações revertidas.' as result;
