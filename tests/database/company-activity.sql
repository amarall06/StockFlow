begin;
do $$ declare response jsonb; begin
 begin
  insert into auth.users(id,email) values(gen_random_uuid(),'outsider@test.invalid');
  raise exception 'Cadastro externo aceito';
 exception when sqlstate '42501' then null; end;
 if has_table_privilege('authenticated','private.company_allowed_emails','select') then raise exception 'Lista exposta'; end if;
 perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
 response:=public.inventory_activity_daily('all',7);
 if jsonb_array_length(response)<>7 then raise exception 'Série incompleta'; end if;
 if exists(select 1 from jsonb_array_elements(response) r where (r->>'sold_boxes')::integer<>0) then raise exception 'Venda inventada'; end if;
 begin perform public.inventory_activity_daily('bad',7);raise exception 'Filtro aceito';exception when sqlstate '22023' then null;end;
 insert into public.stock_movements(product_id,movement_type,unit_type,quantity,status_after,to_location_id,created_at)
 select p.id,case when p.code='MGM-100' then 'receipt' else 'sale' end,'box',case when p.code='MGM-100' then 4 else 3 end,
 case when p.code='MGM-100' then 'in_stock' else 'released_for_sale' end,l.id,
 (((statement_timestamp() at time zone 'America/Bahia')::date-1)::timestamp at time zone 'America/Bahia')+interval '12 hours'
 from public.products p,public.locations l where l.code='TEST-A';
 response:=public.inventory_activity_daily('all',7);
 if (select sum((r->>'sold_boxes')::integer) from jsonb_array_elements(response) r)<>3
 or (select sum((r->>'received_boxes')::integer) from jsonb_array_elements(response) r)<>4 then raise exception 'Quantidades diárias incorretas'; end if;
 response:=public.inventory_activity_daily('springs',7);
 if (select sum((r->>'sold_boxes')::integer) from jsonb_array_elements(response) r)<>0
 or (select sum((r->>'received_boxes')::integer) from jsonb_array_elements(response) r)<>4 then raise exception 'Categoria incorreta'; end if;
 insert into private.company_allowed_emails(email) values('invited@test.invalid');
 insert into auth.users(id,email) values('44444444-4444-4444-8444-444444444444','INVITED@test.invalid');
 if not exists(select 1 from public.profiles where id='44444444-4444-4444-8444-444444444444' and not is_active and role='viewer') then raise exception 'Conta nova ganhou acesso'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 begin perform public.inventory_activity_daily('all',7);raise exception 'Acesso anônimo';exception when sqlstate '42501' then null;end;
end $$;
rollback;
