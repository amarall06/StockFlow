-- Keep the public RPC contracts and existing role checks. Only the private implementations elevate privileges.

alter function public.approve_shock_boxes(p_product_code text, p_location_code text, p_boxes integer, p_request_id uuid) set schema private;
create function public.approve_shock_boxes(p_product_code text, p_location_code text, p_boxes integer, p_request_id uuid) returns jsonb
language sql security invoker set search_path = ''
begin atomic
  select private.approve_shock_boxes($1, $2, $3, $4);
end;
revoke all on function public.approve_shock_boxes(p_product_code text, p_location_code text, p_boxes integer, p_request_id uuid) from public, anon;
grant execute on function public.approve_shock_boxes(p_product_code text, p_location_code text, p_boxes integer, p_request_id uuid) to authenticated, service_role;

alter function public.change_warranty_boxes(p_manufacturer_id uuid, p_product_kind text, p_direction text, p_quantity integer, p_note text, p_request_id uuid) set schema private;
create function public.change_warranty_boxes(p_manufacturer_id uuid, p_product_kind text, p_direction text, p_quantity integer, p_note text, p_request_id uuid) returns jsonb
language sql security invoker set search_path = ''
begin atomic
  select private.change_warranty_boxes($1, $2, $3, $4, $5, $6);
end;
revoke all on function public.change_warranty_boxes(p_manufacturer_id uuid, p_product_kind text, p_direction text, p_quantity integer, p_note text, p_request_id uuid) from public, anon;
grant execute on function public.change_warranty_boxes(p_manufacturer_id uuid, p_product_kind text, p_direction text, p_quantity integer, p_note text, p_request_id uuid) to authenticated, service_role;

alter function public.create_supplier(p_name text) set schema private;
create function public.create_supplier(p_name text) returns jsonb
language sql security invoker set search_path = ''
begin atomic
  select private.create_supplier($1);
end;
revoke all on function public.create_supplier(p_name text) from public, anon;
grant execute on function public.create_supplier(p_name text) to authenticated, service_role;

alter function public.receive_stock(p_product_code text, p_location_code text, p_quantity integer, p_status_code text) set schema private;
create function public.receive_stock(p_product_code text, p_location_code text, p_quantity integer, p_status_code text DEFAULT 'awaiting_test'::text) returns void
language sql security invoker set search_path = ''
begin atomic
  select private.receive_stock($1, $2, $3, $4);
end;
revoke all on function public.receive_stock(p_product_code text, p_location_code text, p_quantity integer, p_status_code text) from public, anon;
grant execute on function public.receive_stock(p_product_code text, p_location_code text, p_quantity integer, p_status_code text) to authenticated, service_role;

alter function public.receive_stock_with_supplier(p_code text, p_application text, p_location text, p_boxes integer, p_status text, p_supplier_id uuid, p_lot_reference text, p_request_id uuid) set schema private;
create function public.receive_stock_with_supplier(p_code text, p_application text, p_location text, p_boxes integer, p_status text, p_supplier_id uuid, p_lot_reference text, p_request_id uuid) returns jsonb
language sql security invoker set search_path = ''
begin atomic
  select private.receive_stock_with_supplier($1, $2, $3, $4, $5, $6, $7, $8);
end;
revoke all on function public.receive_stock_with_supplier(p_code text, p_application text, p_location text, p_boxes integer, p_status text, p_supplier_id uuid, p_lot_reference text, p_request_id uuid) from public, anon;
grant execute on function public.receive_stock_with_supplier(p_code text, p_application text, p_location text, p_boxes integer, p_status text, p_supplier_id uuid, p_lot_reference text, p_request_id uuid) to authenticated, service_role;

alter function public.register_product_and_receive(p_product_code text, p_application text, p_default_location_code text, p_quantity integer, p_status_code text) set schema private;
create function public.register_product_and_receive(p_product_code text, p_application text, p_default_location_code text, p_quantity integer, p_status_code text DEFAULT 'awaiting_test'::text) returns void
language sql security invoker set search_path = ''
begin atomic
  select private.register_product_and_receive($1, $2, $3, $4, $5);
end;
revoke all on function public.register_product_and_receive(p_product_code text, p_application text, p_default_location_code text, p_quantity integer, p_status_code text) from public, anon;
grant execute on function public.register_product_and_receive(p_product_code text, p_application text, p_default_location_code text, p_quantity integer, p_status_code text) to authenticated, service_role;

alter function public.register_stock_outflow(p_code text, p_location text, p_status text, p_boxes integer, p_reason text, p_notes text, p_reference text, p_request_id uuid) set schema private;
create function public.register_stock_outflow(p_code text, p_location text, p_status text, p_boxes integer, p_reason text, p_notes text, p_reference text, p_request_id uuid) returns jsonb
language sql security invoker set search_path = ''
begin atomic
  select private.register_stock_outflow($1, $2, $3, $4, $5, $6, $7, $8);
end;
revoke all on function public.register_stock_outflow(p_code text, p_location text, p_status text, p_boxes integer, p_reason text, p_notes text, p_reference text, p_request_id uuid) from public, anon;
grant execute on function public.register_stock_outflow(p_code text, p_location text, p_status text, p_boxes integer, p_reason text, p_notes text, p_reference text, p_request_id uuid) to authenticated, service_role;

alter function public.save_warranty_manufacturer(p_name text, p_id uuid, p_expected_updated_at timestamp with time zone) set schema private;
create function public.save_warranty_manufacturer(p_name text, p_id uuid DEFAULT NULL::uuid, p_expected_updated_at timestamp with time zone DEFAULT NULL::timestamp with time zone) returns jsonb
language sql security invoker set search_path = ''
begin atomic
  select private.save_warranty_manufacturer($1, $2, $3);
end;
revoke all on function public.save_warranty_manufacturer(p_name text, p_id uuid, p_expected_updated_at timestamp with time zone) from public, anon;
grant execute on function public.save_warranty_manufacturer(p_name text, p_id uuid, p_expected_updated_at timestamp with time zone) to authenticated, service_role;

alter function public.save_warranty_return(p_id uuid, p_input jsonb, p_expected_updated_at timestamp with time zone, p_request_id uuid) set schema private;
create function public.save_warranty_return(p_id uuid, p_input jsonb, p_expected_updated_at timestamp with time zone, p_request_id uuid) returns jsonb
language sql security invoker set search_path = ''
begin atomic
  select private.save_warranty_return($1, $2, $3, $4);
end;
revoke all on function public.save_warranty_return(p_id uuid, p_input jsonb, p_expected_updated_at timestamp with time zone, p_request_id uuid) from public, anon;
grant execute on function public.save_warranty_return(p_id uuid, p_input jsonb, p_expected_updated_at timestamp with time zone, p_request_id uuid) to authenticated, service_role;

alter function public.set_product_minimum(p_code text, p_minimum integer, p_expected_updated_at timestamp with time zone, p_request_id uuid) set schema private;
create function public.set_product_minimum(p_code text, p_minimum integer, p_expected_updated_at timestamp with time zone, p_request_id uuid) returns jsonb
language sql security invoker set search_path = ''
begin atomic
  select private.set_product_minimum($1, $2, $3, $4);
end;
revoke all on function public.set_product_minimum(p_code text, p_minimum integer, p_expected_updated_at timestamp with time zone, p_request_id uuid) from public, anon;
grant execute on function public.set_product_minimum(p_code text, p_minimum integer, p_expected_updated_at timestamp with time zone, p_request_id uuid) to authenticated, service_role;

alter function public.transfer_stock(p_product_code text, p_from_location_code text, p_to_location_code text, p_status_code text, p_quantity integer) set schema private;
create function public.transfer_stock(p_product_code text, p_from_location_code text, p_to_location_code text, p_status_code text, p_quantity integer) returns void
language sql security invoker set search_path = ''
begin atomic
  select private.transfer_stock($1, $2, $3, $4, $5);
end;
revoke all on function public.transfer_stock(p_product_code text, p_from_location_code text, p_to_location_code text, p_status_code text, p_quantity integer) from public, anon;
grant execute on function public.transfer_stock(p_product_code text, p_from_location_code text, p_to_location_code text, p_status_code text, p_quantity integer) to authenticated, service_role;

alter function public.transfer_stock_once(p_product_code text, p_from_location_code text, p_to_location_code text, p_status_code text, p_quantity integer, p_request_id uuid) set schema private;
create function public.transfer_stock_once(p_product_code text, p_from_location_code text, p_to_location_code text, p_status_code text, p_quantity integer, p_request_id uuid) returns jsonb
language sql security invoker set search_path = ''
begin atomic
  select private.transfer_stock_once($1, $2, $3, $4, $5, $6);
end;
revoke all on function public.transfer_stock_once(p_product_code text, p_from_location_code text, p_to_location_code text, p_status_code text, p_quantity integer, p_request_id uuid) from public, anon;
grant execute on function public.transfer_stock_once(p_product_code text, p_from_location_code text, p_to_location_code text, p_status_code text, p_quantity integer, p_request_id uuid) to authenticated, service_role;

alter function public.update_product_details(p_product_code text, p_shock_type text, p_applications jsonb, p_expected_updated_at timestamp with time zone) set schema private;
create function public.update_product_details(p_product_code text, p_shock_type text, p_applications jsonb, p_expected_updated_at timestamp with time zone) returns timestamp with time zone
language sql security invoker set search_path = ''
begin atomic
  select private.update_product_details($1, $2, $3, $4);
end;
revoke all on function public.update_product_details(p_product_code text, p_shock_type text, p_applications jsonb, p_expected_updated_at timestamp with time zone) from public, anon;
grant execute on function public.update_product_details(p_product_code text, p_shock_type text, p_applications jsonb, p_expected_updated_at timestamp with time zone) to authenticated, service_role;

notify pgrst, 'reload schema';
