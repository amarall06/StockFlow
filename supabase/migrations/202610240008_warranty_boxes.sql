-- Caixas em garantia por fabricante e categoria, separadas do estoque normal.
-- Aplicar uma vez depois da migração 007.
begin;

create table public.warranty_box_balances (
  manufacturer_id uuid not null references public.warranty_manufacturers(id),
  product_kind text not null check (product_kind in ('shock', 'spring')),
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (manufacturer_id, product_kind)
);
create table public.warranty_box_movements (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  manufacturer_id uuid not null references public.warranty_manufacturers(id),
  product_kind text not null check (product_kind in ('shock', 'spring')),
  direction text not null check (direction in ('in', 'out')),
  quantity integer not null check (quantity > 0),
  quantity_after integer not null check (quantity_after >= 0),
  note text check (length(note) <= 500),
  performed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default clock_timestamp()
);
create index warranty_box_movements_manufacturer_date
  on public.warranty_box_movements (manufacturer_id, created_at desc);

alter table public.warranty_box_balances enable row level security;
alter table public.warranty_box_movements enable row level security;
revoke all on public.warranty_box_balances, public.warranty_box_movements from public, anon, authenticated;
grant select on public.warranty_box_balances, public.warranty_box_movements to authenticated;
create policy warranty_box_balances_read_active on public.warranty_box_balances
  for select to authenticated using ((select private.current_user_role()) is not null);
create policy warranty_box_movements_read_admin on public.warranty_box_movements
  for select to authenticated using ((select private.current_user_role()) = 'administrator'::public.app_role);

create function public.change_warranty_boxes(
  p_manufacturer_id uuid, p_product_kind text, p_direction text,
  p_quantity integer, p_note text, p_request_id uuid
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_current integer;
  v_after integer;
  v_note text;
  v_movement public.warranty_box_movements%rowtype;
begin
  if private.current_user_role() is distinct from 'administrator'::public.app_role then
    raise exception 'Somente administradores movimentam caixas em garantia nesta etapa.' using errcode = '42501';
  end if;
  if p_product_kind is null or p_product_kind not in ('shock', 'spring')
     or p_direction is null or p_direction not in ('in', 'out')
     or p_quantity is null or p_quantity < 1 or p_request_id is null then
    raise exception 'Confira a categoria, operação e quantidade inteira de caixas.' using errcode = '22023';
  end if;
  v_note := nullif(trim(coalesce(p_note, '')), '');
  if length(v_note) > 500 then
    raise exception 'A observação deve ter até 500 caracteres.' using errcode = '22023';
  end if;

  -- Serializa operações do mesmo fabricante, inclusive quando o saldo ainda não existe.
  perform 1 from public.warranty_manufacturers where id = p_manufacturer_id for update;
  if not found then
    raise exception 'Fabricante não encontrado.' using errcode = 'P0002';
  end if;

  -- Uma repetição da mesma requisição não soma ou desconta caixas duas vezes.
  select * into v_movement from public.warranty_box_movements where request_id = p_request_id;
  if found then
    if v_movement.manufacturer_id is distinct from p_manufacturer_id
       or v_movement.product_kind is distinct from p_product_kind
       or v_movement.direction is distinct from p_direction
       or v_movement.quantity is distinct from p_quantity
       or v_movement.note is distinct from v_note
       or v_movement.performed_by is distinct from auth.uid() then
      raise exception 'Esta identificação já foi usada em outra operação.' using errcode = '22023';
    end if;
    return to_jsonb(v_movement);
  end if;

  insert into public.warranty_box_balances (manufacturer_id, product_kind)
  values (p_manufacturer_id, p_product_kind) on conflict do nothing;
  select quantity into v_current from public.warranty_box_balances
  where manufacturer_id = p_manufacturer_id and product_kind = p_product_kind for update;
  if p_direction = 'out' and p_quantity > v_current then
    raise exception 'Saldo insuficiente para retirar essa quantidade.' using errcode = 'P0001';
  end if;
  v_after := v_current + case when p_direction = 'in' then p_quantity else -p_quantity end;
  update public.warranty_box_balances set quantity = v_after, updated_at = clock_timestamp()
  where manufacturer_id = p_manufacturer_id and product_kind = p_product_kind;
  insert into public.warranty_box_movements (
    request_id, manufacturer_id, product_kind, direction, quantity, quantity_after, note, performed_by
  ) values (
    p_request_id, p_manufacturer_id, p_product_kind, p_direction, p_quantity, v_after, v_note, auth.uid()
  ) returning * into v_movement;
  return to_jsonb(v_movement);
end;
$$;
revoke all on function public.change_warranty_boxes(uuid, text, text, integer, text, uuid) from public, anon;
grant execute on function public.change_warranty_boxes(uuid, text, text, integer, text, uuid) to authenticated;

create or replace function public.inventory_api_version()
returns integer language sql immutable security definer set search_path = ''
as $$ select 7 $$;
commit;
