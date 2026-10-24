-- Histórico de alterações feitas pelo cadastro de aplicações do site.
-- Aplicar uma vez, depois de 202610240004_product_applications.sql.
begin;

lock table public.products, public.product_applications in share row exclusive mode;

create table public.product_application_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_code text not null,
  change_kind text not null check (change_kind in ('baseline', 'updated')),
  details_before jsonb,
  details_after jsonb not null,
  performed_by uuid references auth.users(id) on delete set null,
  actor_display_name text,
  created_at timestamptz not null default clock_timestamp()
);

create index product_application_history_product_date
  on public.product_application_history (product_code, created_at desc, id desc);

alter table public.product_application_history enable row level security;
revoke all on public.product_application_history from public, anon, authenticated;
grant select on public.product_application_history to authenticated;
create policy product_application_history_read_active_users
  on public.product_application_history for select to authenticated
  using ((select private.current_user_role()) is not null);

-- VOLATILE permite enxergar as alterações feitas antes da chamada nesta transação.
create function private.product_application_snapshot(p_product_id uuid)
returns jsonb language sql volatile security definer set search_path = ''
as $$
  select jsonb_build_object(
    'shockType', product.shock_type,
    'applications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'vehicleModel', application.vehicle_model,
        'yearFrom', application.year_from,
        'yearTo', application.year_to
      ) order by application.position)
      from public.product_applications as application
      where application.product_id = product.id
    ), '[]'::jsonb)
  )
  from public.products as product where product.id = p_product_id
$$;
revoke all on function private.product_application_snapshot(uuid) from public, anon, authenticated;

-- A situação existente é um ponto de partida; não inventamos datas ou autores de edições passadas.
insert into public.product_application_history (product_id, product_code, change_kind, details_after)
select product.id, product.code, 'baseline', private.product_application_snapshot(product.id)
from public.products as product
where split_part(product.code, '-', 1) not in ('MGM', 'MFI', 'MRE', 'MFR')
  and (product.shock_type is not null or exists (
    select 1 from public.product_applications as application where application.product_id = product.id
  ));

-- Preserva toda a validação existente dentro de uma função interna, fora da API pública.
alter function public.update_product_details(text, text, jsonb, timestamptz) set schema private;
alter function private.update_product_details(text, text, jsonb, timestamptz) rename to update_product_details_core;
revoke all on function private.update_product_details_core(text, text, jsonb, timestamptz) from public, anon, authenticated;

-- Cadastro e auditoria são gravados juntos: se o histórico falhar, a edição é cancelada.
create function public.update_product_details(
  p_product_code text,
  p_shock_type text,
  p_applications jsonb,
  p_expected_updated_at timestamptz
)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  v_product_id uuid;
  v_product_code text;
  v_before jsonb;
  v_after jsonb;
  v_updated_at timestamptz;
  v_actor_name text;
begin
  if private.current_user_role() is distinct from 'administrator'::public.app_role then
    raise exception 'Somente administradores alteram o cadastro de aplicações.' using errcode = '42501';
  end if;

  select id, code into v_product_id, v_product_code from public.products
  where code = upper(trim(p_product_code)) for update;
  if not found then
    raise exception 'Produto não encontrado.' using errcode = 'P0002';
  end if;

  v_before := private.product_application_snapshot(v_product_id);
  v_updated_at := private.update_product_details_core(
    p_product_code, p_shock_type, p_applications, p_expected_updated_at
  );
  v_after := private.product_application_snapshot(v_product_id);

  -- Clicar em Salvar sem mudar os valores não gera uma alteração fictícia.
  if v_before is distinct from v_after then
    select display_name into v_actor_name from public.profiles where id = auth.uid();
    insert into public.product_application_history (
      product_id, product_code, change_kind, details_before, details_after,
      performed_by, actor_display_name
    ) values (
      v_product_id, v_product_code, 'updated', v_before, v_after,
      auth.uid(), nullif(trim(v_actor_name), '')
    );
  end if;
  return v_updated_at;
end;
$$;

revoke all on function public.update_product_details(text, text, jsonb, timestamptz) from public, anon;
grant execute on function public.update_product_details(text, text, jsonb, timestamptz) to authenticated;

create or replace function public.inventory_api_version()
returns integer language sql immutable security definer set search_path = ''
as $$ select 4 $$;

commit;
