-- Dados e identidades fictícios exclusivamente no container descartável.
insert into auth.users(id) values
 ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222'),('33333333-3333-4333-8333-333333333333');
update public.profiles set is_active=true,display_name='Pessoa de Teste',role=case id
 when '22222222-2222-4222-8222-222222222222' then 'viewer'::public.app_role
 when '33333333-3333-4333-8333-333333333333' then 'stockkeeper'::public.app_role
 else 'administrator'::public.app_role end;
insert into public.locations(code) values('TEST-A'),('TEST-B');
insert into public.products(code,application,default_location_id)
 select p.code,'TESTE ISOLADO',l.id from (values('AGM-100'),('MGM-100')) p(code),public.locations l where l.code='TEST-A';
insert into public.stock_balances(product_id,location_id,status_code,unit_type,quantity)
 select p.id,l.id,case when p.code='MGM-100' then 'in_stock' else 'released_for_sale' end,'box',10
 from public.products p,public.locations l where l.code='TEST-A';

begin;
do $$
declare
  req uuid:=gen_random_uuid();
  response jsonb;
  original_total bigint;
begin
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
  select sum(quantity) into original_total from public.stock_balances;
  response:=public.transfer_stock_once('AGM-100','TEST-A','TEST-B','released_for_sale',10,req);
  if response->>'id'<>req::text then raise exception 'Confirmação não corresponde ao pedido'; end if;
  perform public.transfer_stock_once(' agm-100 ','test-a','test-b','released_for_sale',10,req);
  if (select count(*) from public.stock_movements where movement_type='transfer')<>1 then raise exception 'Reenvio duplicou movimento'; end if;
  if (select sum(quantity) from public.stock_balances)<>original_total then raise exception 'Total alterado'; end if;
  begin
    perform public.transfer_stock_once('AGM-100','TEST-A','TEST-B','released_for_sale',1,req);
    raise exception 'Aceitou outro conteúdo';
  exception when sqlstate '22023' then null; end;
  perform set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
  begin
    perform public.transfer_stock_once('AGM-100','TEST-A','TEST-B','released_for_sale',10,req);
    raise exception 'Aceitou outra conta';
  exception when sqlstate '22023' then null; end;
  perform public.transfer_stock_once('MGM-100','TEST-A','TEST-B','in_stock',3,gen_random_uuid());
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
  begin
    perform public.transfer_stock_once('MGM-100','TEST-A','TEST-B','in_stock',1,gen_random_uuid());
    raise exception 'Consulta conseguiu transferir';
  exception when sqlstate '42501' then null; end;
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
  update public.profiles set is_active=false where id=auth.uid();
  begin
    perform public.transfer_stock_once('AGM-100','TEST-A','TEST-B','released_for_sale',10,req);
    raise exception 'Conta inativa recebeu confirmação';
  exception when sqlstate '42501' then null; end;
  update public.profiles set is_active=true where id=auth.uid();
  begin
    perform public.transfer_stock_once('MGM-100','TEST-A','TEST-B','in_stock',100,gen_random_uuid());
    raise exception 'Aceitou saldo insuficiente';
  exception when sqlstate '22023' then null; end;
  if (select count(*) from private.transfer_requests)<>2 then raise exception 'Falha deixou pedido gravado'; end if;
  if has_function_privilege('anon','public.transfer_stock_once(text,text,text,text,integer,uuid)','execute') then raise exception 'RPC liberada a anon'; end if;
  if has_table_privilege('authenticated','private.transfer_requests','select') then raise exception 'Ledger exposto'; end if;
  raise notice 'OK: reenvio após zerar, payload, outra conta, cargos, inatividade, saldo, auditoria e permissões.';
end $$;
rollback;
