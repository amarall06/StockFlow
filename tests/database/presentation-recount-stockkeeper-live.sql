begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' order by id limit 1),true);
set local role authenticated;
do $$ declare payload jsonb;root jsonb;begin
 select submission into strict payload from public.presentation_shelf_counts where location='SUL' order by created_at limit 1;
 payload:=jsonb_set(payload,'{source_id}',to_jsonb(gen_random_uuid()::text));
 root:=public.submit_presentation_shelf_count(payload);
 perform public.review_presentation_count((root->>'id')::uuid,payload,'recount_requested','Solicitação para conferir autoria entre funções.',gen_random_uuid());
 perform set_config('liber.recount_test_parent',root->>'id',true);
end $$;
select public.save_team_access(id,access_revision,'stockkeeper',true,coalesce(nullif(display_name,''),'Conta de validação'),gen_random_uuid()) is not null from public.profiles where role='viewer' limit 1;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='stockkeeper' limit 1),true);
set local role authenticated;
do $$ declare parent public.presentation_shelf_counts;payload jsonb;child jsonb;begin
 select * into strict parent from public.presentation_shelf_counts where id=current_setting('liber.recount_test_parent')::uuid;
 payload:=jsonb_set(jsonb_set(parent.submission,'{source_id}',to_jsonb(gen_random_uuid()::text)),'{recount_of}',to_jsonb(parent.id::text));
 child:=public.submit_presentation_shelf_count(payload);
 if child->>'actor_id'<>auth.uid()::text or parent.actor_id=auth.uid() then raise exception 'Responsável pela recontagem incorreto';end if;
 if not exists(select 1 from public.presentation_recount_links where parent_count_id=parent.id and child_count_id=(child->>'id')::uuid and created_by=auth.uid()) then raise exception 'Estoquista não vinculou a recontagem';end if;
end $$;
reset role;
rollback;
select 'Novo caso de recontagem por Estoquista sobre solicitação do Administrador aprovado; alterações revertidas.' as result;
