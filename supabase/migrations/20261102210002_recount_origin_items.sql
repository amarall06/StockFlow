create or replace function private.submit_presentation_shelf_count(p_submission jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid(); source uuid; scenario jsonb; entry jsonb; expected numeric;
 stored public.presentation_shelf_counts; reference_row jsonb; location_code text; parent_id uuid; parent public.presentation_shelf_counts; parent_review public.presentation_count_reviews; parent_item jsonb;
begin
 if actor is null or private.current_user_role() not in ('administrator'::public.app_role,'stockkeeper'::public.app_role)
   or private.current_user_role() is null then raise exception 'Perfil sem permissão para enviar contagens.' using errcode='42501';end if;
 if p_submission is null or jsonb_typeof(p_submission)<>'object' or octet_length(p_submission::text)>196608 then
   raise exception 'Contagem inválida.' using errcode='22023';end if;
 source:=(p_submission->>'source_id')::uuid;
 if source is null then raise exception 'Identificação ausente.' using errcode='22023';end if;
 -- Serialização por pessoa/rascunho: confirmação perdida e envios simultâneos não duplicam o registro.
 perform pg_advisory_xact_lock(hashtextextended(actor::text||':'||source::text,17));
 select * into stored from public.presentation_shelf_counts where actor_id=actor and source_id=source;
 if found then
   if stored.submission<>p_submission then raise exception 'Esta contagem já foi enviada com outros valores. Inicie outra contagem para registrar uma recontagem.' using errcode='40001';end if;
   return to_jsonb(stored);
 end if;
 if p_submission ? 'recount_of' then
   if jsonb_typeof(p_submission->'recount_of') is distinct from 'string' then raise exception 'Origem da recontagem inválida.' using errcode='22023';end if;
   parent_id:=(p_submission->>'recount_of')::uuid;
   select * into parent from public.presentation_shelf_counts where id=parent_id for update;
   if not found then raise exception 'Contagem de origem não encontrada.' using errcode='22023';end if;
   if private.current_user_role() is null or private.current_user_role() not in ('administrator'::public.app_role,'stockkeeper'::public.app_role) then raise exception 'Perfil sem permissão ativa.' using errcode='42501';end if;
   select * into parent_review from public.presentation_count_reviews where count_id=parent_id;
   if not found or parent_review.decision<>'recount_requested' then raise exception 'A origem não tem recontagem solicitada.' using errcode='40001';end if;
   if parent.scenario_key<>'liber-presentation-v1' or parent.scenario_revision<>1 or parent.location is distinct from p_submission->>'location' then raise exception 'A recontagem precisa usar a mesma prateleira e cenário da origem.' using errcode='40001';end if;
   if exists(select 1 from public.presentation_recount_links where parent_count_id=parent_id) then raise exception 'Esta solicitação já possui uma recontagem enviada.' using errcode='40001';end if;
 end if;
 select payload into strict scenario from public.presentation_scenarios where scenario_key='liber-presentation-v1' and revision=1;
 location_code:=p_submission->>'location';
 if p_submission->'scenario_revision' is distinct from '1'::jsonb or location_code is null
   or not (scenario->'locations' ? location_code)
   or jsonb_typeof(p_submission->'rows') is distinct from 'array'
   or jsonb_typeof(p_submission->'notes') is distinct from 'string' or length(p_submission->>'notes')>2000
   or jsonb_array_length(p_submission->'rows')>1000
   or jsonb_typeof(p_submission->'consulted_at') is distinct from 'string'
   or jsonb_typeof(p_submission->'started_at') is distinct from 'string' then
   raise exception 'Campos da contagem inválidos.' using errcode='22023';end if;
 if not isfinite((p_submission->>'consulted_at')::timestamptz) or not isfinite((p_submission->>'started_at')::timestamptz) then
   raise exception 'Datas inválidas.' using errcode='22023';end if;
 if (select count(*) from jsonb_array_elements(p_submission->'rows'))<>
   (select count(distinct (r->>'code',r->>'status')) from jsonb_array_elements(p_submission->'rows') r) then
   raise exception 'Item repetido na contagem.' using errcode='22023';end if;
 if parent_id is not null then
   for parent_item in select * from jsonb_array_elements(parent.submission->'rows') loop
     if not exists(select 1 from jsonb_array_elements(p_submission->'rows') r where r->>'code'=parent_item->>'code' and r->>'status'=parent_item->>'status') then
       raise exception 'A recontagem precisa conferir todos os itens da origem, inclusive os encontrados sem saldo.' using errcode='22023';
     end if;
   end loop;
 end if;
 for entry in select * from jsonb_array_elements(p_submission->'rows') loop
   if jsonb_typeof(entry)<>'object' or jsonb_typeof(entry->'code') is distinct from 'string'
     or not exists(select 1 from jsonb_array_elements(scenario->'stock') s where s->>'code'=entry->>'code')
     or jsonb_typeof(entry->'status') is distinct from 'string'
     or (entry->>'code' like 'M%' and entry->>'status'<>'Em estoque')
     or (entry->>'code' not like 'M%' and entry->>'status' not in ('Aguardando testagem','Liberado para venda'))
     or jsonb_typeof(entry->'expected') is distinct from 'number'
     or jsonb_typeof(entry->'counted') is distinct from 'number'
     or (entry->>'expected')!~'^[0-9]+$' or (entry->>'counted')!~'^[0-9]+$'
     or (entry->>'expected')::numeric>2147483647 or (entry->>'counted')::numeric>2147483647 then
     raise exception 'Preencha caixas inteiras e situações compatíveis em todos os itens.' using errcode='22023';end if;
   select coalesce(sum((s->>'boxes')::numeric),0) into expected from jsonb_array_elements(scenario->'stock') s
     where s->>'location'=location_code and s->>'code'=entry->>'code' and s->>'status'=entry->>'status';
   if (entry->>'expected')::numeric<>expected then raise exception 'Referência divergente do cenário publicado.' using errcode='40001';end if;
 end loop;
 for reference_row in select * from jsonb_array_elements(scenario->'stock') s where s->>'location'=location_code loop
   if not exists(select 1 from jsonb_array_elements(p_submission->'rows') r where r->>'code'=reference_row->>'code' and r->>'status'=reference_row->>'status') then
     raise exception 'Faltam itens da referência na contagem.' using errcode='22023';end if;
 end loop;
 insert into public.presentation_shelf_counts(actor_id,actor_name,source_id,scenario_key,scenario_revision,location,submission)
 select actor,coalesce(nullif(btrim(display_name),''),'Nome não informado'),source,'liber-presentation-v1',1,location_code,p_submission
 from public.profiles where id=actor returning * into stored;
 if parent_id is not null then
   insert into public.presentation_recount_links(parent_count_id,child_count_id,parent_review_id,created_by) values(parent_id,stored.id,parent_review.id,actor);
 end if;
 return to_jsonb(stored);
end $$;

