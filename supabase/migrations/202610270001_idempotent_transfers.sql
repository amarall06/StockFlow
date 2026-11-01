-- Transferências recuperáveis: aplicar em homologação após a API 14.
-- Mantém a função anterior para compatibilidade com a publicação anterior.
begin;
do $$ begin
  if public.inventory_api_version() < 14 then
    raise exception 'A migração exige a API 14.';
  end if;
end $$;

create table private.transfer_requests (
  id uuid primary key,
  performed_by uuid not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
alter table private.transfer_requests enable row level security;
revoke all on private.transfer_requests from public, anon, authenticated;

create function public.transfer_stock_once(
  p_product_code text, p_from_location_code text, p_to_location_code text,
  p_status_code text, p_quantity integer, p_request_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_role public.app_role := private.current_user_role();
  v_code text := upper(trim(p_product_code));
  v_from text := upper(trim(p_from_location_code));
  v_to text := upper(trim(p_to_location_code));
  v_payload jsonb;
  v_previous private.transfer_requests%rowtype;
begin
  if v_role is null or v_role not in ('administrator'::public.app_role,'stockkeeper'::public.app_role) then
    raise exception 'Sua função não permite transferências.' using errcode='42501';
  end if;
  if p_request_id is null or coalesce(v_code,'')='' or coalesce(v_from,'')='' or coalesce(v_to,'')=''
    or v_from=v_to or p_quantity is null or p_quantity<1 or p_status_code is null
    or p_status_code not in ('awaiting_test','released_for_sale','in_stock') then
    raise exception 'Confira produto, locais, situação e quantidade.' using errcode='22023';
  end if;
  v_payload := jsonb_build_object('code',v_code,'from',v_from,'to',v_to,'status',p_status_code,'quantity',p_quantity);
  perform pg_advisory_xact_lock(hashtextextended('transfer-request:'||p_request_id::text,0));
  select * into v_previous from private.transfer_requests where id=p_request_id;
  if found then
    if v_previous.performed_by is distinct from auth.uid() or v_previous.payload is distinct from v_payload then
      raise exception 'Identificador já utilizado para outra transferência.' using errcode='22023';
    end if;
    -- Confirma mesmo após o saldo de origem zerar ou o local ser desativado.
    return jsonb_build_object('id',p_request_id);
  end if;
  -- Serializa as novas transferências do mesmo produto para evitar bloqueios inversos.
  perform pg_advisory_xact_lock(hashtextextended('stock-transfer:'||v_code,0));
  perform public.transfer_stock(v_code,v_from,v_to,p_status_code,p_quantity);
  insert into private.transfer_requests(id,performed_by,payload) values(p_request_id,auth.uid(),v_payload);
  return jsonb_build_object('id',p_request_id);
end $$;
revoke all on function public.transfer_stock_once(text,text,text,text,integer,uuid) from public,anon;
grant execute on function public.transfer_stock_once(text,text,text,text,integer,uuid) to authenticated;

do $$ begin
  if public.inventory_api_version() < 15 then
    execute $version$create or replace function public.inventory_api_version()
      returns integer language sql immutable security definer set search_path='' as 'select 15'$version$;
  end if;
end $$;
commit;
