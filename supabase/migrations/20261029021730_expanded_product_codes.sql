begin;
create or replace function public.receive_stock_with_supplier(
  p_code text, p_application text, p_location text, p_boxes integer, p_status text,
  p_supplier_id uuid, p_lot_reference text, p_request_id uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_role public.app_role := private.current_user_role();
  v_code text := upper(trim(p_code));
  v_location text := upper(trim(p_location));
  v_application text := nullif(trim(coalesce(p_application,'')),'');
  v_lot text := nullif(trim(coalesce(p_lot_reference,'')),'');
  v_status text;
  v_supplier_name text;
  v_product uuid;
  v_location_id uuid;
  v_payload jsonb;
  v_movement public.stock_movements%rowtype;
begin
  if v_role is null or v_role not in ('administrator'::public.app_role,'receiving'::public.app_role) then
    raise exception 'Sem permissão para receber estoque.' using errcode='42501';
  end if;
  if v_code is null or v_code !~ '^[A-Z]{3}-(100|[1-9][0-9]?|0[1-9])([A-Z]{1,3})?$' or p_boxes is null or p_boxes < 1
     or p_request_id is null or coalesce(v_location,'')='' or length(v_lot)>100 then
    raise exception 'Confira código, local, caixas e lote.' using errcode='22023';
  end if;
  v_status := case when split_part(v_code,'-',1) in ('MGM','MFI','MRE','MFR') then 'in_stock' else p_status end;
  if v_status is null or v_status not in ('awaiting_test','released_for_sale','in_stock')
     or (split_part(v_code,'-',1) not in ('MGM','MFI','MRE','MFR') and v_status='in_stock') then
    raise exception 'Situação inválida para o produto.' using errcode='22023';
  end if;
  if v_role='receiving'::public.app_role and v_status='released_for_sale' then
    raise exception 'Recebimento de amortecedores começa aguardando teste.' using errcode='42501';
  end if;
  if v_lot is not null and p_supplier_id is null then
    raise exception 'Selecione o fornecedor para informar o lote.' using errcode='22023';
  end if;
  v_payload := jsonb_build_object('code',v_code,'application',v_application,'location',v_location,'boxes',p_boxes,
    'status',v_status,'supplier_id',p_supplier_id,'lot_reference',v_lot);
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select * into v_movement from public.stock_movements where receipt_request_id=p_request_id;
  if found then
    if v_movement.receipt_payload is distinct from v_payload or v_movement.performed_by is distinct from auth.uid() then
      raise exception 'Envio já utilizado para outra entrada.' using errcode='22023';
    end if;
    return to_jsonb(v_movement);
  end if;
  if p_supplier_id is not null then
    select name into v_supplier_name from public.suppliers where id=p_supplier_id;
    if not found then raise exception 'Fornecedor não encontrado.' using errcode='P0002'; end if;
  end if;
  select id into v_location_id from public.locations where code=v_location and is_active;
  if v_location_id is null then raise exception 'Local inexistente ou inativo.' using errcode='P0002'; end if;
  select id into v_product from public.products where code=v_code;
  if v_product is null then
    if v_role <> 'administrator'::public.app_role then
      raise exception 'Somente administradores cadastram produto novo.' using errcode='42501';
    end if;
    if v_application is null or length(v_application)>500 then
      raise exception 'Informe a aplicação do produto novo.' using errcode='22023';
    end if;
    insert into public.products(code,application,default_location_id) values(v_code,v_application,v_location_id)
      on conflict(code) do nothing returning id into v_product;
    if v_product is null then select id into v_product from public.products where code=v_code; end if;
  end if;
  insert into public.stock_balances(product_id,location_id,status_code,unit_type,quantity)
  values(v_product,v_location_id,v_status,'box',p_boxes)
  on conflict(product_id,location_id,status_code,unit_type)
  do update set quantity=public.stock_balances.quantity+excluded.quantity, updated_at=clock_timestamp();
  insert into public.stock_movements(product_id,movement_type,unit_type,quantity,status_after,to_location_id,performed_by,
    supplier_id,supplier_name,lot_reference,receipt_request_id,receipt_payload)
  values(v_product,'receipt','box',p_boxes,v_status,v_location_id,auth.uid(),p_supplier_id,v_supplier_name,v_lot,p_request_id,v_payload)
  returning * into v_movement;
  return to_jsonb(v_movement);
end; $$;
revoke all on function public.receive_stock_with_supplier(text,text,text,integer,text,uuid,text,uuid) from public,anon;
grant execute on function public.receive_stock_with_supplier(text,text,text,integer,text,uuid,text,uuid) to authenticated;
commit;
