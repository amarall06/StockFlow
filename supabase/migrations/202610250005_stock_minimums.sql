-- Aplicar uma vez depois de stock_outflows (API 11).
-- Limite em caixas por código; null = não configurado, zero = limite configurado em zero.
begin;
alter table public.products
  add column minimum_boxes integer check (minimum_boxes>=0),
  add column minimum_updated_at timestamptz not null default clock_timestamp();
create table public.product_minimum_events (
  request_id uuid primary key,
  product_id uuid not null references public.products(id),
  product_code text not null,
  minimum_before integer,
  minimum_after integer,
  performed_by uuid references auth.users(id) on delete set null,
  actor_display_name text,
  created_at timestamptz not null default clock_timestamp()
);
alter table public.product_minimum_events enable row level security;
revoke all on public.product_minimum_events from public,anon,authenticated;
grant select on public.product_minimum_events to authenticated;
create policy product_minimum_events_read_admin on public.product_minimum_events for select to authenticated
  using ((select private.current_user_role())='administrator'::public.app_role);

create function public.set_product_minimum(p_code text,p_minimum integer,p_expected_updated_at timestamptz,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_code text:=upper(trim(p_code));
  v_product public.products%rowtype;
  v_event public.product_minimum_events%rowtype;
  v_before integer;
begin
  if private.current_user_role() is distinct from 'administrator'::public.app_role then
    raise exception 'Somente Administrador altera limites.' using errcode='42501';
  end if;
  if coalesce(v_code,'')='' or p_minimum<0 or p_request_id is null then
    raise exception 'Informe um limite inteiro não negativo ou vazio.' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select * into v_event from public.product_minimum_events where request_id=p_request_id;
  if found then
    if v_event.product_code<>v_code or v_event.minimum_after is distinct from p_minimum
      or v_event.performed_by is distinct from auth.uid() then
      raise exception 'Envio já usado para outra alteração.' using errcode='22023';
    end if;
    select * into v_product from public.products where id=v_event.product_id;
    return jsonb_build_object('code',v_product.code,'minimum_boxes',v_product.minimum_boxes,'minimum_updated_at',v_product.minimum_updated_at);
  end if;
  select * into v_product from public.products where code=v_code for update;
  if not found then raise exception 'Produto não encontrado.' using errcode='P0002'; end if;
  if p_expected_updated_at is null or v_product.minimum_updated_at is distinct from p_expected_updated_at then
    raise exception 'Limite alterado. Atualize antes de editar.' using errcode='40001';
  end if;
  if v_product.minimum_boxes is distinct from p_minimum then
    v_before:=v_product.minimum_boxes;
    update public.products set minimum_boxes=p_minimum,minimum_updated_at=clock_timestamp()
      where id=v_product.id returning * into v_product;
    insert into public.product_minimum_events(request_id,product_id,product_code,minimum_before,minimum_after,performed_by,actor_display_name)
      values(p_request_id,v_product.id,v_product.code,v_before,p_minimum,auth.uid(),(select display_name from public.profiles where id=auth.uid()));
  end if;
  return jsonb_build_object('code',v_product.code,'minimum_boxes',v_product.minimum_boxes,'minimum_updated_at',v_product.minimum_updated_at);
end; $$;
revoke all on function public.set_product_minimum(text,integer,timestamptz,uuid) from public,anon;
grant execute on function public.set_product_minimum(text,integer,timestamptz,uuid) to authenticated;
create or replace function public.inventory_api_version()
returns integer language sql immutable security definer set search_path='' as $$ select 12 $$;
commit;
