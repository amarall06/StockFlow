-- Aplicar uma vez depois de receipt_suppliers (API 10).
-- Primeira versão: somente Administrador registra saídas do estoque normal.
begin;
insert into public.movement_types(code,label) values
  ('sale','Venda'),('discard','Descarte'),('supplier_return','Devolução ao fornecedor');
alter table public.stock_movements
  add column outflow_request_id uuid unique,
  add column outflow_reference text check (length(outflow_reference)<=100),
  add column outflow_actor_name text,
  add column outflow_payload jsonb;

create function public.register_stock_outflow(
  p_code text, p_location text, p_status text, p_boxes integer,
  p_reason text, p_notes text, p_reference text, p_request_id uuid
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_code text := upper(trim(p_code));
  v_location text := upper(trim(p_location));
  v_notes text := nullif(trim(coalesce(p_notes,'')),'');
  v_reference text := nullif(trim(coalesce(p_reference,'')),'');
  v_product uuid;
  v_location_id uuid;
  v_spring boolean;
  v_name text;
  v_payload jsonb;
  v_balance public.stock_balances%rowtype;
  v_movement public.stock_movements%rowtype;
begin
  if private.current_user_role() is distinct from 'administrator'::public.app_role then
    raise exception 'Somente administradores registram saídas nesta etapa.' using errcode='42501';
  end if;
  if coalesce(v_code,'')='' or coalesce(v_location,'')='' or p_boxes is null or p_boxes<1 or p_request_id is null
    or p_reason is null or p_reason not in ('sale','discard','supplier_return')
    or length(v_notes)>500 or length(v_reference)>100 or (p_reason<>'sale' and v_notes is null) then
    raise exception 'Confira produto, local, caixas, motivo e observação.' using errcode='22023';
  end if;
  v_spring := split_part(v_code,'-',1) in ('MGM','MFI','MRE','MFR');
  if p_status is null or (v_spring and p_status<>'in_stock')
    or (not v_spring and p_status not in ('awaiting_test','released_for_sale'))
    or (p_reason='sale' and not v_spring and p_status<>'released_for_sale') then
    raise exception 'Venda de amortecedor exige caixas liberadas; molas usam Em estoque.' using errcode='22023';
  end if;
  v_payload := jsonb_build_object('code',v_code,'location',v_location,'status',p_status,'boxes',p_boxes,
    'reason',p_reason,'notes',v_notes,'reference',v_reference);
  -- Um mesmo envio repetido não retira duas vezes, inclusive se o saldo já zerou.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select * into v_movement from public.stock_movements where outflow_request_id=p_request_id;
  if found then
    if v_movement.outflow_payload is distinct from v_payload or v_movement.performed_by is distinct from auth.uid() then
      raise exception 'Envio já utilizado para outra saída.' using errcode='22023';
    end if;
    return to_jsonb(v_movement);
  end if;
  select id into v_product from public.products where code=v_code;
  select id into v_location_id from public.locations where code=v_location and is_active;
  if v_product is null or v_location_id is null then
    raise exception 'Produto ou localização inexistente/inativa.' using errcode='P0002';
  end if;
  select trim(display_name) into v_name from public.profiles where id=auth.uid() and is_active;
  if coalesce(v_name,'')='' then raise exception 'Preencha seu nome em Meu perfil.' using errcode='P0003'; end if;
  select * into v_balance from public.stock_balances
    where product_id=v_product and location_id=v_location_id and status_code=p_status and unit_type='box' for update;
  if not found or v_balance.quantity<p_boxes then
    raise exception 'Saldo insuficiente. Atualize a consulta.' using errcode='P0001';
  end if;
  if v_balance.quantity=p_boxes then
    delete from public.stock_balances where id=v_balance.id;
  else
    update public.stock_balances set quantity=quantity-p_boxes,updated_at=clock_timestamp() where id=v_balance.id;
  end if;
  insert into public.stock_movements(product_id,movement_type,unit_type,quantity,status_before,from_location_id,
    performed_by,notes,outflow_request_id,outflow_reference,outflow_actor_name,outflow_payload)
  values(v_product,p_reason,'box',p_boxes,p_status,v_location_id,auth.uid(),v_notes,p_request_id,v_reference,v_name,v_payload)
  returning * into v_movement;
  return to_jsonb(v_movement);
end; $$;
revoke all on function public.register_stock_outflow(text,text,text,integer,text,text,text,uuid) from public,anon;
grant execute on function public.register_stock_outflow(text,text,text,integer,text,text,text,uuid) to authenticated;
create or replace function public.inventory_api_version()
returns integer language sql immutable security definer set search_path='' as $$ select 11 $$;
commit;
