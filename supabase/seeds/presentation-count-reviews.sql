begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' order by id limit 1),true);
set local role authenticated;
do $$ declare plan jsonb; original public.presentation_shelf_counts;begin
 for plan in select * from jsonb_array_elements('[{"source_id":"14d08e01-bee6-4ee3-a651-eefb964e4d2f","request_id":"59e30063-b462-4824-950a-7766210dbd7b","decision":"recount_requested","note":"Diferença de uma caixa: solicitar nova conferência no roteiro de apresentação."},{"source_id":"d8f16693-afac-4b66-a35a-ca2545a3bbda","request_id":"bf4f42fe-c627-41e1-a0e9-dd0ae612215e","decision":"approved","note":"Conferência aprovada no roteiro de apresentação; excedente mantido para análise, sem ajustar saldo."}]'::jsonb) loop
  select * into strict original from public.presentation_shelf_counts where actor_id=auth.uid() and source_id=(plan->>'source_id')::uuid;
  perform public.review_presentation_count(original.id,original.submission,plan->>'decision',plan->>'note',(plan->>'request_id')::uuid);
 end loop;
end $$;
reset role;
commit;
select decision,count(*) as examples from public.presentation_count_reviews group by decision order by decision;
