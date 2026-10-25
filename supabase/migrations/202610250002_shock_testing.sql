-- Aplicar uma vez depois de 202610250001_warranty_returns.sql (API 8).
-- Aprova caixas inteiras existentes; não cria etiqueta nem identidade física por caixa.
begin;
create table public.shock_test_approvals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  product_id uuid not null references public.products(id),
  product_code text not null,
  location_id uuid not null references public.locations(id),
  location_code text not null,
  boxes integer not null check (boxes > 0),
  performed_by uuid references auth.users(id) on delete set null,
  actor_display_name text not null,
  created_at timestamptz not null default clock_timestamp()
);
create index shock_test_approvals_product_date on public.shock_test_approvals(product_code, created_at desc, id desc);
alter table public.shock_test_approvals enable row level security;
revoke all on public.shock_test_approvals from public, anon, authenticated;
grant select on public.shock_test_approvals to authenticated;
create policy shock_test_approvals_read_active on public.shock_test_approvals for select to authenticated
  using ((select private.current_user_role()) is not null);

create function public.approve_shock_boxes(p_product_code text, p_location_code text, p_boxes integer, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_product_id uuid;
  v_location_id uuid;
  v_balance public.stock_balances%rowtype;
  v_event public.shock_test_approvals%rowtype;
  v_name text;
  v_code text := upper(trim(p_product_code));
  v_location text := upper(trim(p_location_code));
begin
  if private.current_user_role() is null or private.current_user_role() not in
    ('administrator'::public.app_role, 'tester'::public.app_role) then
    raise exception 'Somente Administrador ou Testador registra aprovação.' using errcode = '42501';
  end if;
  if p_boxes is null or p_boxes < 1 or p_request_id is null or coalesce(v_code,'') = '' or coalesce(v_location,'') = '' then
    raise exception 'Informe produto, local e quantidade inteira positiva.' using errcode = '22023';
  end if;
  if split_part(v_code,'-',1) in ('MGM','MFI','MRE','MFR') then
    raise exception 'Molas não passam por testagem.' using errcode = '22023';
  end if;
  -- O bloqueio do envio garante que duas tentativas simultâneas não aprovem duas vezes.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select * into v_event from public.shock_test_approvals where request_id=p_request_id;
  if found then
    if v_event.product_code <> v_code or v_event.location_code <> v_location or v_event.boxes <> p_boxes
       or v_event.performed_by is distinct from auth.uid() then
      raise exception 'Este envio já foi usado para outra aprovação.' using errcode = '22023';
    end if;
    return to_jsonb(v_event);
  end if;
  select id into v_product_id from public.products where code=v_code;
  select id into v_location_id from public.locations where code=v_location and is_active;
  if v_product_id is null or v_location_id is null then
    raise exception 'Produto ou localização não encontrado.' using errcode = 'P0002';
  end if;
  select trim(display_name) into v_name from public.profiles where id=auth.uid() and is_active;
  if coalesce(v_name,'') = '' then
    raise exception 'Preencha seu nome em Meu perfil antes de registrar o teste.' using errcode = 'P0003';
  end if;
  select * into v_balance from public.stock_balances
    where product_id=v_product_id and location_id=v_location_id and status_code='awaiting_test' and unit_type='box'
    for update;
  if not found or v_balance.quantity < p_boxes then
    raise exception 'Saldo aguardando teste insuficiente. Atualize o estoque.' using errcode = 'P0001';
  end if;
  -- A quantidade total se conserva: sai da espera e entra como liberada no mesmo local.
  if v_balance.quantity=p_boxes then
    delete from public.stock_balances where id=v_balance.id;
  else
    update public.stock_balances set quantity=quantity-p_boxes, updated_at=clock_timestamp() where id=v_balance.id;
  end if;
  insert into public.stock_balances(product_id,location_id,status_code,unit_type,quantity)
  values(v_product_id,v_location_id,'released_for_sale','box',p_boxes)
  on conflict(product_id,location_id,status_code,unit_type)
  do update set quantity=public.stock_balances.quantity+excluded.quantity, updated_at=clock_timestamp();
  insert into public.shock_test_approvals(request_id,product_id,product_code,location_id,location_code,boxes,performed_by,actor_display_name)
  values(p_request_id,v_product_id,v_code,v_location_id,v_location,p_boxes,auth.uid(),v_name) returning * into v_event;
  insert into public.stock_movements(product_id,movement_type,unit_type,quantity,status_before,status_after,to_location_id,performed_by,notes)
  values(v_product_id,'testing','box',p_boxes,'awaiting_test','released_for_sale',v_location_id,auth.uid(),
    'Aprovação de teste: ' || v_event.id::text || '. Responsável: ' || v_name);
  return to_jsonb(v_event);
end;
$$;
revoke all on function public.approve_shock_boxes(text,text,integer,uuid) from public,anon;
grant execute on function public.approve_shock_boxes(text,text,integer,uuid) to authenticated;
create or replace function public.inventory_api_version()
returns integer language sql immutable security definer set search_path = '' as $$ select 9 $$;
commit;
