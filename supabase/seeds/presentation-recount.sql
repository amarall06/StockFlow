begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' order by id limit 1),true);
set local role authenticated;
do $$ declare parent public.presentation_shelf_counts;begin
 select * into strict parent from public.presentation_shelf_counts where actor_id=auth.uid() and source_id='14d08e01-bee6-4ee3-a651-eefb964e4d2f'::uuid;
 perform public.submit_presentation_shelf_count(jsonb_set('{"source_id":"513b6298-6055-48e4-9194-59e470fcb9f3","scenario_revision":1,"location":"NORTE","rows":[{"code":"AGM-35","status":"Aguardando testagem","expected":20,"counted":20},{"code":"AGM-35","status":"Liberado para venda","expected":20,"counted":20}],"notes":"Nova conferência do roteiro vinculada à contagem original.","consulted_at":"2026-11-02T16:10:00Z","started_at":"2026-11-02T16:15:00Z"}'::jsonb,'{recount_of}',to_jsonb(parent.id::text)));
end $$;
reset role;
commit;
select count(*) as recount_links from public.presentation_recount_links;
