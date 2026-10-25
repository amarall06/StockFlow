-- Aplicar UMA vez depois de 202610240008_warranty_boxes.sql.
-- Devoluções recebidas não viram estoque para venda automaticamente.
begin;

create table public.warranty_returns (
  id uuid primary key,
  manufacturer_id uuid references public.warranty_manufacturers(id),
  product_kind text not null check (product_kind in ('shock', 'spring', 'unknown')),
  product_code text not null check (length(product_code) <= 60),
  description text not null check (length(trim(description)) between 1 and 300),
  boxes integer not null check (boxes > 0),
  reason text not null check (length(trim(reason)) between 1 and 500),
  location text not null check (length(trim(location)) between 1 and 100),
  ownership text not null check (ownership in ('unknown', 'ours', 'other')),
  status text not null check (status in ('received', 'awaiting_test', 'identification', 'warranty', 'closed')),
  destination text not null check (length(destination) <= 300),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (status not in ('awaiting_test', 'identification') or (product_kind = 'shock' and ownership = 'ours')),
  check (status <> 'warranty' or (manufacturer_id is not null and product_kind <> 'unknown' and ownership = 'ours')),
  check (status <> 'closed' or length(trim(destination)) > 0)
);
create index warranty_returns_recent on public.warranty_returns (created_at desc);

-- Guarda antes/depois e o responsável. Não cria outro botão de histórico na Garantia.
create table public.warranty_return_events (
  request_id uuid primary key,
  return_id uuid not null references public.warranty_returns(id),
  before_data jsonb,
  after_data jsonb not null,
  performed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default clock_timestamp()
);
alter table public.warranty_returns enable row level security;
alter table public.warranty_return_events enable row level security;
revoke all on public.warranty_returns, public.warranty_return_events from public, anon, authenticated;
grant select on public.warranty_returns, public.warranty_return_events to authenticated;
create policy warranty_returns_read_active on public.warranty_returns for select to authenticated
  using ((select private.current_user_role()) is not null);
create policy warranty_return_events_read_admin on public.warranty_return_events for select to authenticated
  using ((select private.current_user_role()) = 'administrator'::public.app_role);

create function public.save_warranty_return(p_id uuid, p_input jsonb, p_expected_updated_at timestamptz, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_old public.warranty_returns%rowtype;
  v_new public.warranty_returns%rowtype;
  v_event public.warranty_return_events%rowtype;
  v_before jsonb;
  v_existing boolean;
begin
  if private.current_user_role() is distinct from 'administrator'::public.app_role then
    raise exception 'Somente administradores gerenciam devoluções nesta etapa.' using errcode = '42501';
  end if;
  if p_id is null or p_request_id is null or p_input is null or jsonb_typeof(p_input) <> 'object' then
    raise exception 'Identificação e dados obrigatórios.' using errcode = '22023';
  end if;
  -- Serializa inclusive a criação do registro; o identificador vem do cliente.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into v_event from public.warranty_return_events where request_id = p_request_id;
  if found then
    if v_event.return_id <> p_id or v_event.performed_by is distinct from auth.uid()
       or (v_event.after_data - array['id','created_by','updated_by','created_at','updated_at']) is distinct from p_input then
      raise exception 'Identificação de envio já utilizada.' using errcode = '22023';
    end if;
    return v_event.after_data;
  end if;
  select * into v_old from public.warranty_returns where id = p_id for update;
  v_existing := found;
  if v_existing then
    if p_expected_updated_at is null or v_old.updated_at is distinct from p_expected_updated_at then
      raise exception 'Registro alterado. Atualize a lista.' using errcode = '40001';
    end if;
    if v_old.status = 'closed' then
      raise exception 'Registro encerrado não pode ser alterado.' using errcode = '22023';
    end if;
    v_before := to_jsonb(v_old);
  elsif p_expected_updated_at is not null then
    raise exception 'Registro não encontrado.' using errcode = '40001';
  end if;
  v_new := jsonb_populate_record(null::public.warranty_returns, p_input);
  -- A quantidade é JSON numérico inteiro, evitando arredondar números decimais no cast.
  if jsonb_typeof(p_input->'boxes') is distinct from 'number'
     or (p_input->>'boxes')::numeric <> trunc((p_input->>'boxes')::numeric)
     or v_new.boxes is null or v_new.boxes < 1
     or v_new.product_kind is null or v_new.product_kind not in ('shock','spring','unknown')
     or v_new.ownership is null or v_new.ownership not in ('unknown','ours','other')
     or v_new.status is null or v_new.status not in ('received','awaiting_test','identification','warranty','closed')
     or coalesce(length(trim(v_new.description)),0) not between 1 and 300
     or coalesce(length(trim(v_new.reason)),0) not between 1 and 500
     or coalesce(length(trim(v_new.location)),0) not between 1 and 100
     or v_new.product_code is null or length(v_new.product_code) > 60
     or v_new.destination is null or length(v_new.destination) > 300
     or (v_new.status in ('awaiting_test','identification') and (v_new.product_kind <> 'shock' or v_new.ownership <> 'ours'))
     or (v_new.status = 'warranty' and (v_new.manufacturer_id is null or v_new.product_kind = 'unknown' or v_new.ownership <> 'ours'))
     or (v_new.status = 'closed' and length(trim(v_new.destination)) = 0) then
    raise exception 'Confira os campos e o andamento da devolução.' using errcode = '22023';
  end if;
  -- Já em garantia: identidade/quantidade ficam fixas para manter o vínculo com o saldo.
  if v_existing and v_old.status = 'warranty' and (
    v_new.manufacturer_id is distinct from v_old.manufacturer_id or v_new.product_kind <> v_old.product_kind
    or v_new.boxes <> v_old.boxes or v_new.product_code <> v_old.product_code or v_new.ownership <> v_old.ownership
    or v_new.status not in ('warranty','closed')) then
    raise exception 'Encerre a garantia antes de mudar sua identificação.' using errcode = '22023';
  end if;
  if v_new.status = 'warranty' and (not v_existing or v_old.status <> 'warranty') then
    perform public.change_warranty_boxes(v_new.manufacturer_id, v_new.product_kind, 'in', v_new.boxes,
      'Entrada vinculada à devolução ' || p_id::text, p_request_id);
  elsif v_existing and v_old.status = 'warranty' and v_new.status = 'closed' then
    perform public.change_warranty_boxes(v_old.manufacturer_id, v_old.product_kind, 'out', v_old.boxes,
      'Encerramento da devolução ' || p_id::text || ': ' || v_new.destination, p_request_id);
  end if;
  if v_existing then
    update public.warranty_returns set manufacturer_id=v_new.manufacturer_id, product_kind=v_new.product_kind,
      product_code=v_new.product_code, description=v_new.description, boxes=v_new.boxes, reason=v_new.reason,
      location=v_new.location, ownership=v_new.ownership, status=v_new.status, destination=v_new.destination,
      updated_by=auth.uid(), updated_at=clock_timestamp() where id=p_id returning * into v_new;
  else
    insert into public.warranty_returns (id, manufacturer_id, product_kind, product_code, description, boxes,
      reason, location, ownership, status, destination, created_by, updated_by)
    values (p_id,v_new.manufacturer_id,v_new.product_kind,v_new.product_code,v_new.description,v_new.boxes,
      v_new.reason,v_new.location,v_new.ownership,v_new.status,v_new.destination,auth.uid(),auth.uid()) returning * into v_new;
  end if;
  insert into public.warranty_return_events(request_id,return_id,before_data,after_data,performed_by)
  values(p_request_id,p_id,v_before,to_jsonb(v_new),auth.uid());
  return to_jsonb(v_new);
end;
$$;
revoke all on function public.save_warranty_return(uuid,jsonb,timestamptz,uuid) from public,anon;
grant execute on function public.save_warranty_return(uuid,jsonb,timestamptz,uuid) to authenticated;
create or replace function public.inventory_api_version()
returns integer language sql immutable security definer set search_path = '' as $$ select 8 $$;
commit;
