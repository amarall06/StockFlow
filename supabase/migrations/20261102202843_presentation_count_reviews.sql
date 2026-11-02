-- Decisão da apresentação: não altera o envio original nem qualquer saldo.
create table public.presentation_count_reviews (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 count_id uuid not null unique references public.presentation_shelf_counts(id),
 reviewer_id uuid not null, reviewer_name text not null,
 decision text not null check(decision in ('approved','recount_requested')),
 note text not null check(length(note) between 5 and 1000),
 submission_snapshot jsonb not null,
 reviewed_at timestamptz not null default clock_timestamp()
);
comment on table public.presentation_count_reviews is 'Decisões imutáveis do cenário de apresentação; aprovação não autoriza nem executa ajuste de estoque.';
alter table public.presentation_count_reviews enable row level security;
revoke all on public.presentation_count_reviews from public,anon,authenticated;
grant select on public.presentation_count_reviews to authenticated;
create policy presentation_reviews_company_read on public.presentation_count_reviews for select to authenticated
 using((select private.current_user_role()) is not null);

create function private.review_presentation_count(p_count_id uuid,p_expected_submission jsonb,p_decision text,p_note text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid(); normalized text:=btrim(p_note);
 original public.presentation_shelf_counts; receipt public.presentation_count_reviews;
begin
 if actor is null or private.current_user_role() is distinct from 'administrator'::public.app_role then
   raise exception 'Somente Administrador ativo revisa contagens da apresentação.' using errcode='42501';end if;
 if p_count_id is null or p_request_id is null or p_decision is null or p_decision not in ('approved','recount_requested')
   or normalized is null or length(normalized) not between 5 and 1000
   or p_expected_submission is null or jsonb_typeof(p_expected_submission)<>'object'
   or octet_length(p_expected_submission::text)>196608 then
   raise exception 'Informe decisão, justificativa e referência válidas.' using errcode='22023';end if;
 -- Bloqueio da tentativa antes da contagem: impede reaproveitar UUID em outra revisão concorrente.
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,171));
 if private.current_user_role() is distinct from 'administrator'::public.app_role then raise exception 'O acesso administrativo não está mais ativo.' using errcode='42501';end if;
 select * into receipt from public.presentation_count_reviews where request_id=p_request_id;
 if found then
   if receipt.reviewer_id<>actor or receipt.count_id<>p_count_id or receipt.decision<>p_decision
     or receipt.note<>normalized or receipt.submission_snapshot<>p_expected_submission then
     raise exception 'Identificação de confirmação já utilizada com outros dados.' using errcode='22023';end if;
   return to_jsonb(receipt);
 end if;
 select * into original from public.presentation_shelf_counts where id=p_count_id for update;
 if not found then raise exception 'Contagem não encontrada.' using errcode='22023';end if;
 if private.current_user_role() is distinct from 'administrator'::public.app_role then raise exception 'O acesso administrativo não está mais ativo.' using errcode='42501';end if;
 if original.scenario_key<>'liber-presentation-v1' or original.scenario_revision<>1 or original.submission<>p_expected_submission then
   raise exception 'A referência revisada não corresponde ao envio. Consulte novamente.' using errcode='40001';end if;
 if exists(select 1 from public.presentation_count_reviews where count_id=p_count_id) then
   raise exception 'Esta contagem já recebeu uma decisão. Nenhuma revisão foi substituída.' using errcode='40001';end if;
 -- Política somente deste cenário: Administrador pode revisar inclusive o próprio exemplo.
 insert into public.presentation_count_reviews(request_id,count_id,reviewer_id,reviewer_name,decision,note,submission_snapshot)
 select p_request_id,original.id,actor,coalesce(nullif(btrim(display_name),''),'Nome não informado'),p_decision,normalized,original.submission
 from public.profiles where id=actor returning * into receipt;
 return to_jsonb(receipt);
end $$;
revoke all on function private.review_presentation_count(uuid,jsonb,text,text,uuid) from public,anon,authenticated;
grant execute on function private.review_presentation_count(uuid,jsonb,text,text,uuid) to authenticated;
create function public.review_presentation_count(p_count_id uuid,p_expected_submission jsonb,p_decision text,p_note text,p_request_id uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select private.review_presentation_count(p_count_id,p_expected_submission,p_decision,p_note,p_request_id)
$$;
revoke all on function public.review_presentation_count(uuid,jsonb,text,text,uuid) from public,anon,authenticated;
grant execute on function public.review_presentation_count(uuid,jsonb,text,text,uuid) to authenticated;
create trigger inventory_private_broadcast after insert on public.presentation_count_reviews
for each statement execute function private.notify_inventory_changed();
