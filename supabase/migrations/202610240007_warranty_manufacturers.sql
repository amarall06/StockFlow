-- Fabricantes/marcas das peças para garantia de amortecedores e molas.
-- Aplicar uma vez, depois de 202610240006_own_display_name.sql.
begin;

create table public.warranty_manufacturers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index warranty_manufacturers_unique_name on public.warranty_manufacturers (lower(name));

alter table public.warranty_manufacturers enable row level security;
revoke all on public.warranty_manufacturers from public, anon, authenticated;
grant select on public.warranty_manufacturers to authenticated;
create policy warranty_manufacturers_read_active_users
  on public.warranty_manufacturers for select to authenticated
  using ((select private.current_user_role()) is not null);

-- Referências fornecidas pelo usuário; não são montadoras de veículos nem itens em garantia.
insert into public.warranty_manufacturers (name) values ('Moripar'), ('Trebor'), ('New Parts');

create function public.save_warranty_manufacturer(
  p_name text,
  p_id uuid default null,
  p_expected_updated_at timestamptz default null
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_name text;
  v_record public.warranty_manufacturers%rowtype;
begin
  if private.current_user_role() is distinct from 'administrator'::public.app_role then
    raise exception 'Somente administradores gerenciam fabricantes.' using errcode = '42501';
  end if;
  v_name := regexp_replace(trim(coalesce(p_name, '')), '[[:space:]]+', ' ', 'g');
  if length(v_name) not between 1 and 100 then
    raise exception 'Informe um fabricante entre 1 e 100 caracteres.' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.warranty_manufacturers (name, created_by, updated_by)
    values (v_name, auth.uid(), auth.uid()) returning * into v_record;
  else
    select * into v_record from public.warranty_manufacturers where id = p_id for update;
    if not found then
      raise exception 'Fabricante não encontrado.' using errcode = 'P0002';
    end if;
    if p_expected_updated_at is null or v_record.updated_at is distinct from p_expected_updated_at then
      raise exception 'O cadastro mudou. Atualize a lista antes de editar.' using errcode = '40001';
    end if;
    update public.warranty_manufacturers
    set name = v_name, updated_by = auth.uid(), updated_at = clock_timestamp()
    where id = p_id returning * into v_record;
  end if;
  return to_jsonb(v_record);
end;
$$;

revoke all on function public.save_warranty_manufacturer(text, uuid, timestamptz) from public, anon;
grant execute on function public.save_warranty_manufacturer(text, uuid, timestamptz) to authenticated;

create or replace function public.inventory_api_version()
returns integer language sql immutable security definer set search_path = ''
as $$ select 6 $$;

commit;
