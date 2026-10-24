-- Cadastro de veículos/anos para amortecedores e molas; tipo apenas para amortecedores.
-- Aplicar uma vez, depois de 202610240003_springs_without_testing.sql.
begin;

alter table public.products add column shock_type text
  check (shock_type is null or (
    shock_type in ('gas_pressurized', 'conventional_hydraulic', 'adjustable')
    and split_part(code, '-', 1) not in ('MGM', 'MFI', 'MRE', 'MFR')
  ));

create table public.product_applications (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  vehicle_model text not null check (length(trim(vehicle_model)) between 1 and 120),
  year_from integer check (year_from between 1 and 9999),
  year_to integer check (year_to between 1 and 9999),
  position integer not null check (position >= 0),
  check (year_from is null or year_to is null or year_from <= year_to),
  unique (product_id, position)
);

create unique index product_applications_no_duplicates
  on public.product_applications (product_id, lower(trim(vehicle_model)), coalesce(year_from, 0), coalesce(year_to, 0));

alter table public.product_applications enable row level security;
revoke all on public.product_applications from anon, authenticated;
grant select on public.product_applications to authenticated;
create policy product_applications_read_active_users
  on public.product_applications for select to authenticated
  using ((select private.current_user_role()) is not null);

-- Atualiza o conjunto de aplicações de uma vez. Somente administradores podem salvar.
create or replace function public.update_product_details(
  p_product_code text,
  p_shock_type text,
  p_applications jsonb,
  p_expected_updated_at timestamptz
)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  v_product public.products%rowtype;
  v_updated_at timestamptz;
begin
  if private.current_user_role() is distinct from 'administrator'::public.app_role then
    raise exception 'Somente administradores alteram o cadastro de aplicações.' using errcode = '42501';
  end if;

  select * into v_product from public.products
  where code = upper(trim(p_product_code)) for update;
  if not found then
    raise exception 'Produto não encontrado.' using errcode = 'P0002';
  end if;
  if p_expected_updated_at is null or v_product.updated_at is distinct from p_expected_updated_at then
    raise exception 'O cadastro mudou desde a abertura. Atualize a página antes de salvar.' using errcode = '40001';
  end if;
  if p_shock_type is not null and (
    p_shock_type not in ('gas_pressurized', 'conventional_hydraulic', 'adjustable')
    or split_part(v_product.code, '-', 1) in ('MGM', 'MFI', 'MRE', 'MFR')
  ) then
    raise exception 'Tipo de amortecedor inválido para este produto.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_applications) is distinct from 'array' then
    raise exception 'As aplicações devem ser uma lista.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_applications) > 50 then
    raise exception 'Informe até 50 aplicações por produto.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_applications) as item
    where jsonb_typeof(item) is distinct from 'object'
       or jsonb_typeof(item -> 'vehicle_model') is distinct from 'string'
  ) then
    raise exception 'Cada aplicação precisa conter o nome do veículo.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_applications) as item(vehicle_model text, year_from integer, year_to integer)
    where length(trim(coalesce(item.vehicle_model, ''))) not between 1 and 120
       or (item.year_from is not null and item.year_from not between 1 and 9999)
       or (item.year_to is not null and item.year_to not between 1 and 9999)
       or item.year_from > item.year_to
  ) then
    raise exception 'Confira o veículo e o intervalo de anos.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_applications) as item(vehicle_model text, year_from integer, year_to integer)
    group by lower(trim(item.vehicle_model)), item.year_from, item.year_to having count(*) > 1
  ) then
    raise exception 'Há aplicações repetidas na lista.' using errcode = '22023';
  end if;

  delete from public.product_applications where product_id = v_product.id;
  insert into public.product_applications (product_id, vehicle_model, year_from, year_to, position)
  select v_product.id, trim(item.value ->> 'vehicle_model'),
         (item.value ->> 'year_from')::integer, (item.value ->> 'year_to')::integer,
         (item.ordinality - 1)::integer
  from jsonb_array_elements(p_applications) with ordinality as item(value, ordinality);

  v_updated_at := clock_timestamp();
  update public.products set shock_type = p_shock_type, updated_at = v_updated_at where id = v_product.id;
  return v_updated_at;
end;
$$;

revoke all on function public.update_product_details(text, text, jsonb, timestamptz) from public, anon;
grant execute on function public.update_product_details(text, text, jsonb, timestamptz) to authenticated;

create or replace function public.inventory_api_version()
returns integer language sql immutable security definer set search_path = ''
as $$ select 3 $$;

commit;
