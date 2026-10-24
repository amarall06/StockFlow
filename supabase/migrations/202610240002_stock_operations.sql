-- LIBER automotive: entradas e transferências atômicas para o estoque.
-- Execute depois de 202610240001_access_roles.sql no projeto de demonstração.

-- Sinaliza ao cliente que esta migração de operações foi instalada.
create or replace function public.inventory_api_version()
returns integer
language sql
immutable
security definer
set search_path = ''
as $$ select 1 $$;

-- Registra recebimentos em caixas e cria o respectivo evento de auditoria.
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
begin
  v_role := private.current_user_role();
  if v_role is null or v_role not in ('administrator'::public.app_role, 'receiving'::public.app_role) then
    raise exception 'A função do usuário não pode receber estoque.' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity < 1 then
    raise exception 'A quantidade deve ser um número positivo.' using errcode = '22023';
  end if;
  if v_role = 'receiving'::public.app_role and p_status_code <> 'awaiting_test' then
    raise exception 'Recebimentos começam aguardando testagem.' using errcode = '42501';
  end if;

  select product.id into v_product_id
  from public.products as product
  where product.code = upper(trim(p_product_code));
  if v_product_id is null then
    raise exception 'Produto não encontrado.' using errcode = 'P0002';
  end if;

  select location.id into v_location_id
  from public.locations as location
  where location.code = upper(trim(p_location_code)) and location.is_active = true;
  if v_location_id is null then
    raise exception 'Localização não encontrada ou inativa.' using errcode = 'P0002';
  end if;

  insert into public.stock_balances (product_id, location_id, status_code, unit_type, quantity)
  values (v_product_id, v_location_id, p_status_code, 'box', p_quantity)
  on conflict (product_id, location_id, status_code, unit_type)
  do update set quantity = public.stock_balances.quantity + excluded.quantity,
                updated_at = now();

  insert into public.stock_movements (
    product_id, movement_type, unit_type, quantity, status_after,
    to_location_id, performed_by
  ) values (
    v_product_id, 'receipt', 'box', p_quantity, p_status_code,
    v_location_id, auth.uid()
  );
end;
$$;

-- Cria cadastro novo e saldo inicial juntos; só administradores podem cadastrar produtos.
create or replace function public.register_product_and_receive(
  p_product_code text,
  p_application text,
  p_default_location_code text,
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
  v_location_id uuid;
begin
  v_role := private.current_user_role();
  if v_role is distinct from 'administrator'::public.app_role then
    raise exception 'Somente administradores cadastram produtos.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_application, ''))) = 0 then
    raise exception 'Informe a aplicação do produto.' using errcode = '22023';
  end if;

  select location.id into v_location_id
  from public.locations as location
  where location.code = upper(trim(p_default_location_code)) and location.is_active = true;
  if v_location_id is null then
    raise exception 'Localização padrão não encontrada ou inativa.' using errcode = 'P0002';
  end if;

  insert into public.products (code, application, default_location_id)
  values (upper(trim(p_product_code)), trim(p_application), v_location_id);

  perform public.receive_stock(
    p_product_code, p_default_location_code, p_quantity, p_status_code
  );
end;
$$;

-- Move caixas entre localizações e registra o movimento na mesma transação.
create or replace function public.transfer_stock(
  p_product_code text,
  p_from_location_code text,
  p_to_location_code text,
  p_status_code text,
  p_quantity integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_product_id uuid;
  v_from_location_id uuid;
  v_to_location_id uuid;
  v_balance_id uuid;
  v_available integer;
begin
  v_role := private.current_user_role();
  if v_role is null or v_role not in ('administrator'::public.app_role, 'stockkeeper'::public.app_role) then
    raise exception 'A função do usuário não pode transferir estoque.' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity < 1 then
    raise exception 'A quantidade deve ser um número positivo.' using errcode = '22023';
  end if;
  if upper(trim(p_from_location_code)) = upper(trim(p_to_location_code)) then
    raise exception 'Origem e destino devem ser diferentes.' using errcode = '22023';
  end if;

  select product.id into v_product_id
  from public.products as product
  where product.code = upper(trim(p_product_code));
  if v_product_id is null then
    raise exception 'Produto não encontrado.' using errcode = 'P0002';
  end if;

  select location.id into v_from_location_id
  from public.locations as location
  where location.code = upper(trim(p_from_location_code)) and location.is_active = true;
  select location.id into v_to_location_id
  from public.locations as location
  where location.code = upper(trim(p_to_location_code)) and location.is_active = true;
  if v_from_location_id is null or v_to_location_id is null then
    raise exception 'Origem ou destino não encontrado ou inativo.' using errcode = 'P0002';
  end if;

  select balance.id, balance.quantity into v_balance_id, v_available
  from public.stock_balances as balance
  where balance.product_id = v_product_id
    and balance.location_id = v_from_location_id
    and balance.status_code = p_status_code
    and balance.unit_type = 'box'
  for update;
  if v_balance_id is null or v_available < p_quantity then
    raise exception 'Saldo insuficiente para esta transferência.' using errcode = '22023';
  end if;

  if v_available = p_quantity then
    delete from public.stock_balances where id = v_balance_id;
  else
    update public.stock_balances
    set quantity = quantity - p_quantity, updated_at = now()
    where id = v_balance_id;
  end if;

  insert into public.stock_balances (product_id, location_id, status_code, unit_type, quantity)
  values (v_product_id, v_to_location_id, p_status_code, 'box', p_quantity)
  on conflict (product_id, location_id, status_code, unit_type)
  do update set quantity = public.stock_balances.quantity + excluded.quantity,
                updated_at = now();

  insert into public.stock_movements (
    product_id, movement_type, unit_type, quantity, status_before, status_after,
    from_location_id, to_location_id, performed_by
  ) values (
    v_product_id, 'transfer', 'box', p_quantity, p_status_code, p_status_code,
    v_from_location_id, v_to_location_id, auth.uid()
  );
end;
$$;

revoke all on function public.receive_stock(text, text, integer, text) from public, anon;
revoke all on function public.register_product_and_receive(text, text, text, integer, text) from public, anon;
revoke all on function public.transfer_stock(text, text, text, text, integer) from public, anon;
revoke all on function public.inventory_api_version() from public, anon;
grant execute on function public.receive_stock(text, text, integer, text) to authenticated;
grant execute on function public.register_product_and_receive(text, text, text, integer, text) to authenticated;
grant execute on function public.transfer_stock(text, text, text, text, integer) to authenticated;
grant execute on function public.inventory_api_version() to authenticated;
