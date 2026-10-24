-- Molas não passam por testagem: estoque normal usa a situação Em estoque.
-- Aplicar depois de 202610240002_stock_operations.sql.
begin;

lock table public.products, public.stock_balances in share row exclusive mode;

insert into public.stock_statuses (code, label, is_available_for_sale)
values ('in_stock', 'Em estoque', false)
on conflict (code) do nothing;

-- Registra a correção sem apagar ou reescrever os movimentos anteriores.
insert into public.stock_movements (
  product_id, movement_type, unit_type, quantity, status_before, status_after,
  to_location_id, notes
)
select balance.product_id, 'inventory_adjustment', balance.unit_type,
       balance.quantity, balance.status_code, 'in_stock', balance.location_id,
       'Adequação da situação de molas: não passam por testagem'
from public.stock_balances as balance
join public.products as product on product.id = balance.product_id
where split_part(product.code, '-', 1) in ('MGM', 'MFI', 'MRE', 'MFR')
  and balance.status_code in ('awaiting_test', 'released_for_sale');

-- Agrupa os saldos antigos por produto, local e unidade, conservando o total.
insert into public.stock_balances (product_id, location_id, status_code, unit_type, quantity)
select balance.product_id, balance.location_id, 'in_stock', balance.unit_type, sum(balance.quantity)::integer
from public.stock_balances as balance
join public.products as product on product.id = balance.product_id
where split_part(product.code, '-', 1) in ('MGM', 'MFI', 'MRE', 'MFR')
  and balance.status_code in ('awaiting_test', 'released_for_sale')
group by balance.product_id, balance.location_id, balance.unit_type
on conflict (product_id, location_id, status_code, unit_type)
do update set quantity = public.stock_balances.quantity + excluded.quantity, updated_at = now();

delete from public.stock_balances as balance
using public.products as product
where product.id = balance.product_id
  and split_part(product.code, '-', 1) in ('MGM', 'MFI', 'MRE', 'MFR')
  and balance.status_code in ('awaiting_test', 'released_for_sale');

-- A regra também vale no servidor para entradas, inclusive cadastros com saldo inicial.
create or replace function public.receive_stock(
  p_product_code text,
  p_location_code text,
  p_quantity integer,
  p_status_code text default 'awaiting_test'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_product_id uuid;
  v_location_id uuid;
  v_is_spring boolean;
  v_status_code text;
begin
  v_role := private.current_user_role();
  if v_role is null or v_role not in ('administrator'::public.app_role, 'receiving'::public.app_role) then
    raise exception 'A função do usuário não pode receber estoque.' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity < 1 then
    raise exception 'A quantidade deve ser um número positivo.' using errcode = '22023';
  end if;

  select product.id into v_product_id
  from public.products as product where product.code = upper(trim(p_product_code));
  if v_product_id is null then
    raise exception 'Produto não encontrado.' using errcode = 'P0002';
  end if;

  v_is_spring := split_part(upper(trim(p_product_code)), '-', 1) in ('MGM', 'MFI', 'MRE', 'MFR');
  v_status_code := case when v_is_spring then 'in_stock' else p_status_code end;
  if not v_is_spring then
    if v_status_code is null or v_status_code not in ('awaiting_test', 'released_for_sale') then
      raise exception 'Situação inválida para amortecedor.' using errcode = '22023';
    end if;
    if v_role = 'receiving'::public.app_role and v_status_code <> 'awaiting_test' then
      raise exception 'Amortecedores recebidos começam aguardando testagem.' using errcode = '42501';
    end if;
  end if;

  select location.id into v_location_id
  from public.locations as location
  where location.code = upper(trim(p_location_code)) and location.is_active = true;
  if v_location_id is null then
    raise exception 'Localização não encontrada ou inativa.' using errcode = 'P0002';
  end if;

  insert into public.stock_balances (product_id, location_id, status_code, unit_type, quantity)
  values (v_product_id, v_location_id, v_status_code, 'box', p_quantity)
  on conflict (product_id, location_id, status_code, unit_type)
  do update set quantity = public.stock_balances.quantity + excluded.quantity, updated_at = now();

  insert into public.stock_movements (
    product_id, movement_type, unit_type, quantity, status_after, to_location_id, performed_by
  ) values (
    v_product_id, 'receipt', 'box', p_quantity, v_status_code, v_location_id, auth.uid()
  );
end;
$$;

revoke all on function public.receive_stock(text, text, integer, text) from public, anon;
grant execute on function public.receive_stock(text, text, integer, text) to authenticated;

create or replace function public.inventory_api_version()
returns integer language sql immutable security definer set search_path = ''
as $$ select 2 $$;

commit;
