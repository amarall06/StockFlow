-- Verificação NOVA da composição dos pedidos offline no banco conectado.
-- Não executar junto às suítes anteriores. Tudo, inclusive cadastros, é revertido.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '20s';
do $$
declare actor uuid; tag text := gen_random_uuid()::text;
begin
  select id into actor from public.profiles where is_active and role='administrator' limit 1;
  if actor is null then raise exception 'Validação exige perfil administrador ativo.'; end if;
  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  perform set_config('liber.offline_tag',tag,true);
  perform set_config('liber.offline_from',upper('OFFLINE-VALIDACAO-'||tag||'-A'),true);
  perform set_config('liber.offline_to',upper('OFFLINE-VALIDACAO-'||tag||'-B'),true);
  insert into public.locations(code) values (current_setting('liber.offline_from')),(current_setting('liber.offline_to'));
end $$;
set local role authenticated;
do $$
<<validation>>
declare
  code text; tag text := current_setting('liber.offline_tag');
  origin text := current_setting('liber.offline_from'); destination text := current_setting('liber.offline_to');
  supplier jsonb; manufacturer jsonb; first_result jsonb; repeated jsonb; record jsonb;
  request uuid; return_id uuid := gen_random_uuid(); data jsonb; expected timestamptz; total bigint;
begin
  select candidate into code from unnest(array['ZQA-99','ZQB-99','ZQC-99']) candidate
    where not exists(select 1 from public.products p where p.code=candidate) limit 1;
  if code is null then raise exception 'Não há código de validação livre; nenhum produto existente será utilizado.'; end if;
  supplier := public.create_supplier('Validação offline '||tag);
  repeated := public.create_supplier('Validação offline '||tag);
  if supplier->>'id' is distinct from repeated->>'id' then raise exception 'Fornecedor repetido divergiu.'; end if;
  manufacturer := public.save_warranty_manufacturer('Validação offline '||tag,null,null);
  if not exists(select 1 from public.warranty_manufacturers where id=(manufacturer->>'id')::uuid and name='Validação offline '||tag) then raise exception 'Fabricante não recuperável por consulta.'; end if;
  begin
    perform public.save_warranty_manufacturer('Validação offline '||tag,null,null);
    raise exception 'Fabricante duplicado não recusado.';
  exception when unique_violation then null; end;
  request := gen_random_uuid();
  first_result := public.receive_stock_with_supplier(code,'Validação transacional offline',origin,3,'awaiting_test',(supplier->>'id')::uuid,'OFFLINE-VALIDACAO',request);
  repeated := public.receive_stock_with_supplier(code,'Validação transacional offline',origin,3,'awaiting_test',(supplier->>'id')::uuid,'OFFLINE-VALIDACAO',request);
  if first_result->>'id' is distinct from repeated->>'id' then raise exception 'Entrada repetida divergiu.'; end if;
  request := gen_random_uuid();
  first_result := public.approve_shock_boxes(code,origin,2,request);
  repeated := public.approve_shock_boxes(code,origin,2,request);
  if first_result->>'id' is distinct from repeated->>'id' then raise exception 'Aprovação repetida divergiu.'; end if;
  request := gen_random_uuid();
  first_result := public.transfer_stock_once(code,origin,destination,'released_for_sale',1,request);
  repeated := public.transfer_stock_once(code,origin,destination,'released_for_sale',1,request);
  if first_result->>'id' is distinct from repeated->>'id' then raise exception 'Transferência repetida divergiu.'; end if;
  request := gen_random_uuid();
  first_result := public.register_stock_outflow(code,destination,'released_for_sale',1,'sale','Validação offline',null,request);
  repeated := public.register_stock_outflow(code,destination,'released_for_sale',1,'sale','Validação offline',null,request);
  if first_result->>'id' is distinct from repeated->>'id' then raise exception 'Saída repetida divergiu.'; end if;
  select sum(b.quantity) into total from public.stock_balances b join public.products p on p.id=b.product_id where p.code=validation.code;
  if total is distinct from 2::bigint then raise exception 'Saldo da composição offline incorreto: %',total; end if;
  request := gen_random_uuid();
  first_result := public.change_warranty_boxes((manufacturer->>'id')::uuid,'shock','in',4,'Validação offline',request);
  repeated := public.change_warranty_boxes((manufacturer->>'id')::uuid,'shock','in',4,'Validação offline',request);
  if first_result->>'id' is distinct from repeated->>'id' then raise exception 'Garantia repetida divergiu.'; end if;
  request := gen_random_uuid();
  perform public.change_warranty_boxes((manufacturer->>'id')::uuid,'shock','out',1,'Validação offline',request);
  perform public.change_warranty_boxes((manufacturer->>'id')::uuid,'shock','out',1,'Validação offline',request);
  data := jsonb_build_object('manufacturer_id',null,'product_kind','unknown','product_code','','description','Validação offline','boxes',2,'reason','Validação transacional','location','Conferência','ownership','unknown','status','received','destination','');
  request := gen_random_uuid();
  record := public.save_warranty_return(return_id,data,null,request);
  repeated := public.save_warranty_return(return_id,data,null,request);
  if record is distinct from repeated then raise exception 'Recebimento de devolução repetido divergiu.'; end if;
  expected := (record->>'updated_at')::timestamptz;
  data := data || jsonb_build_object('manufacturer_id',manufacturer->>'id','product_kind','shock','ownership','ours','status','warranty');
  request := gen_random_uuid();
  record := public.save_warranty_return(return_id,data,expected,request);
  repeated := public.save_warranty_return(return_id,data,expected,request);
  if record is distinct from repeated then raise exception 'Andamento repetido divergiu.'; end if;
  begin
    perform public.save_warranty_return(return_id,data,expected,gen_random_uuid());
    raise exception 'Versão antiga não recusada.';
  exception when serialization_failure then null; end;
  expected := (record->>'updated_at')::timestamptz;
  data := data || jsonb_build_object('status','closed','destination','Conferência transacional concluída');
  request := gen_random_uuid();
  record := public.save_warranty_return(return_id,data,expected,request);
  repeated := public.save_warranty_return(return_id,data,expected,request);
  if record is distinct from repeated then raise exception 'Encerramento repetido divergiu.'; end if;
  select quantity into total from public.warranty_box_balances where manufacturer_id=(manufacturer->>'id')::uuid and product_kind='shock';
  if total is distinct from 3::bigint then raise exception 'Garantia composta com devolução duplicou saldo: %',total; end if;
end $$;
rollback;
select 'Composição offline validada com perfil autenticado: entrada/produto/fornecedor, testagem, transferência, saída, garantia, devolução/andamento/encerramento, repetição e versão antiga. Transação revertida.' as result;
