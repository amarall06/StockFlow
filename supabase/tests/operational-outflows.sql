-- ENSAIO, NÃO MIGRAÇÃO. Todos os dados e alterações de perfil são desfeitos no ROLLBACK.
begin;
set local statement_timeout='45s';
set local lock_timeout='5s';
create temporary table operational_results(test text,passed boolean,detail text) on commit drop;

do $$
declare
  actor uuid;
  actor_name text;
  test_location uuid;
  shock uuid;
  spring uuid;
  shock_code text;
  spring_code text;
  location_code text:='OPTEST-'||upper(gen_random_uuid()::text);
  request_id uuid:=gen_random_uuid();
  first_event jsonb;
  repeated_event jsonb;
  current_event jsonb;
  state text;
  count_changed integer;
  role_under_test public.app_role;
begin
  select id,display_name into actor,actor_name from public.profiles
    where is_active and role='administrator' and nullif(trim(display_name),'') is not null limit 1;
  if actor is null then raise exception 'É necessária uma conta Administrador ativa com nome.'; end if;
  select 'AGM-'||n into shock_code from generate_series(100,1,-1) n
    where not exists(select 1 from public.products p where p.code='AGM-'||n) limit 1;
  select 'MGM-'||n into spring_code from generate_series(100,1,-1) n
    where not exists(select 1 from public.products p where p.code='MGM-'||n) limit 1;
  if shock_code is null or spring_code is null then raise exception 'Sem códigos livres para um ensaio isolado.'; end if;
  insert into public.locations(code) values(location_code) returning id into test_location;
  insert into public.products(code,application,default_location_id)
    values(shock_code,'TESTE TRANSACIONAL - AMORTECEDOR',test_location) returning id into shock;
  insert into public.products(code,application,default_location_id)
    values(spring_code,'TESTE TRANSACIONAL - MOLA',test_location) returning id into spring;
  insert into public.stock_balances(product_id,location_id,status_code,unit_type,quantity) values
    (shock,test_location,'awaiting_test','box',5),
    (shock,test_location,'released_for_sale','box',3),
    (spring,test_location,'in_stock','box',3);
  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);

  -- A RPC é chamada como authenticated, não com os privilégios do SQL Editor.
  execute 'set local role authenticated';
  first_event:=public.register_stock_outflow(shock_code,location_code,'awaiting_test',1,'discard',
    'TESTE OPERACIONAL TRANSACIONAL - sem descarte físico','OPTEST-DESCARTE',request_id);
  repeated_event:=public.register_stock_outflow(shock_code,location_code,'awaiting_test',1,'discard',
    'TESTE OPERACIONAL TRANSACIONAL - sem descarte físico','OPTEST-DESCARTE',request_id);
  execute 'reset role';
  if (select quantity from public.stock_balances where product_id=shock and location_id=test_location and status_code='awaiting_test')<>4
    then raise exception 'Descarte ou repetição descontou quantidade incorreta.'; end if;
  insert into operational_results values('01_descarte_amortecedor',true,'5 para 4 caixas dentro da transação');
  if first_event->>'id' is distinct from repeated_event->>'id'
    or (select count(*) from public.stock_movements where outflow_request_id=request_id)<>1
    then raise exception 'Reenvio duplicou o evento.'; end if;
  insert into operational_results values('02_reenvio_mesma_requisicao',true,'Mesmo evento; somente uma retirada');
  if first_event->>'movement_type'<>'discard' or (first_event->>'quantity')::int<>1
    or first_event->>'performed_by' is distinct from actor::text
    or first_event->>'outflow_actor_name' is distinct from actor_name
    or first_event->>'created_at' is null or first_event->>'notes' not like 'TESTE OPERACIONAL%'
    or first_event->>'outflow_reference'<>'OPTEST-DESCARTE'
    then raise exception 'Histórico não preservou os dados esperados.'; end if;
  insert into operational_results values('03_historico_e_responsavel',true,'Motivo, caixas, referência, conta, nome e data do servidor');

  execute 'set local role authenticated';
  state:='00000';
  begin
    perform public.register_stock_outflow(shock_code,location_code,'awaiting_test',2,'discard',
      'TESTE OPERACIONAL TRANSACIONAL - sem descarte físico','OPTEST-DESCARTE',request_id);
  exception when others then get stacked diagnostics state=returned_sqlstate; end;
  execute 'reset role';
  if state<>'22023' then raise exception 'Requisição reaproveitada com outro conteúdo: SQLSTATE %',state; end if;
  insert into operational_results values('04_reenvio_conteudo_diferente',true,'Mesmo identificador com outra quantidade foi recusado');

  execute 'set local role authenticated';
  current_event:=public.register_stock_outflow(spring_code,location_code,'in_stock',1,'supplier_return',
    'TESTE OPERACIONAL - fornecedor fictício, sem envio físico','OPTEST-DEVOLUCAO',gen_random_uuid());
  execute 'reset role';
  if current_event->>'movement_type'<>'supplier_return'
    or (select quantity from public.stock_balances where product_id=spring and location_id=test_location and status_code='in_stock')<>2
    then raise exception 'Devolução de mola não conservou o saldo esperado.'; end if;
  insert into operational_results values('05_devolucao_mola',true,'3 para 2 caixas, sem testagem');

  execute 'set local role authenticated';
  current_event:=public.register_stock_outflow(shock_code,location_code,'released_for_sale',1,'supplier_return',
    'TESTE OPERACIONAL - fornecedor fictício, sem envio físico','OPTEST-DEVOLUCAO-A',gen_random_uuid());
  execute 'reset role';
  if current_event->>'movement_type'<>'supplier_return'
    or (select quantity from public.stock_balances where product_id=shock and location_id=test_location and status_code='released_for_sale')<>2
    then raise exception 'Devolução de amortecedor não conservou o saldo esperado.'; end if;
  insert into operational_results values('05b_devolucao_amortecedor',true,'3 para 2 caixas liberadas');

  execute 'set local role authenticated';
  current_event:=public.register_stock_outflow(spring_code,location_code,'in_stock',1,'discard',
    'TESTE OPERACIONAL - sem descarte físico','OPTEST-DESCARTE-M',gen_random_uuid());
  execute 'reset role';
  if current_event->>'movement_type'<>'discard'
    or (select quantity from public.stock_balances where product_id=spring and location_id=test_location and status_code='in_stock')<>1
    then raise exception 'Descarte de mola não conservou o saldo esperado.'; end if;
  insert into operational_results values('05c_descarte_mola',true,'2 para 1 caixa, sem testagem');

  -- Restrições conferidas no servidor, sem depender da validação do navegador.
  execute 'set local role authenticated';
  state:='00000';
  begin
    perform public.register_stock_outflow(spring_code,location_code,'in_stock',99,'supplier_return','TESTE','OPTEST',gen_random_uuid());
  exception when others then get stacked diagnostics state=returned_sqlstate; end;
  execute 'reset role';
  if state<>'P0001' then raise exception 'Retirada excessiva: SQLSTATE %',state; end if;
  insert into operational_results values('06_saldo_insuficiente',true,'Recusado no banco');

  execute 'set local role authenticated';
  state:='00000';
  begin
    perform public.register_stock_outflow(shock_code,location_code,'awaiting_test',1,'discard',null,'OPTEST',gen_random_uuid());
  exception when others then get stacked diagnostics state=returned_sqlstate; end;
  execute 'reset role';
  if state<>'22023' then raise exception 'Descarte sem observação: SQLSTATE %',state; end if;
  insert into operational_results values('07_descarte_sem_motivo',true,'Recusado no banco');

  execute 'set local role authenticated';
  state:='00000';
  begin
    perform public.register_stock_outflow(shock_code,location_code,'awaiting_test',1,'sale','TESTE','OPTEST',gen_random_uuid());
  exception when others then get stacked diagnostics state=returned_sqlstate; end;
  execute 'reset role';
  if state<>'22023' then raise exception 'Venda sem teste: SQLSTATE %',state; end if;
  insert into operational_results values('08_venda_aguardando_teste',true,'Amortecedor não liberado foi recusado');

  execute 'set local role authenticated';
  state:='00000';
  begin
    perform public.register_stock_outflow(spring_code,location_code,'in_stock',0,'discard','TESTE','OPTEST',gen_random_uuid());
  exception when others then get stacked diagnostics state=returned_sqlstate; end;
  execute 'reset role';
  if state<>'22023' then raise exception 'Quantidade zero: SQLSTATE %',state; end if;
  insert into operational_results values('09_quantidade_zero',true,'Recusada no banco');

  foreach role_under_test in array array['receiving','tester','stockkeeper','viewer']::public.app_role[] loop
    update public.profiles set role=role_under_test where id=actor;
    execute 'set local role authenticated';
    state:='00000';
    begin
      perform public.register_stock_outflow(spring_code,location_code,'in_stock',1,'discard','TESTE','OPTEST',gen_random_uuid());
    exception when others then get stacked diagnostics state=returned_sqlstate; end;
    execute 'reset role';
    if state<>'42501' then raise exception 'Cargo % conseguiu registrar saída ou falhou de forma inesperada: %',role_under_test,state; end if;
    insert into operational_results values('10_cargo_'||role_under_test,true,'Saída recusada pela RPC para esta função');
  end loop;

  update public.profiles set role='administrator',is_active=false where id=actor;
  execute 'set local role authenticated';
  select count(*) into count_changed from public.stock_balances;
  state:='00000';
  begin
    perform public.register_stock_outflow(spring_code,location_code,'in_stock',1,'discard','TESTE','OPTEST',gen_random_uuid());
  exception when others then get stacked diagnostics state=returned_sqlstate; end;
  execute 'reset role';
  if state<>'42501' or count_changed<>0 then raise exception 'Conta inativa teve acesso indevido.'; end if;
  insert into operational_results values('11_conta_inativa',true,'Sem consulta de saldos nem registro de saída');
  update public.profiles set is_active=true where id=actor;

  execute 'set local role authenticated';
  count_changed:=0;
  begin
    update public.stock_balances set quantity=999 where product_id=spring and location_id=test_location;
    get diagnostics count_changed=row_count;
  exception when insufficient_privilege then count_changed:=0; end;
  execute 'reset role';
  if count_changed<>0 then raise exception 'Escrita direta no saldo foi permitida.'; end if;
  insert into operational_results values('12_escrita_direta_saldo',true,'Sem linhas alteradas fora da RPC');

  execute 'set local role anon';
  state:='00000';
  begin
    perform public.register_stock_outflow(spring_code,location_code,'in_stock',1,'discard','TESTE','OPTEST',gen_random_uuid());
  exception when others then get stacked diagnostics state=returned_sqlstate; end;
  execute 'reset role';
  if state<>'42501' then raise exception 'Sessão anônima não foi bloqueada: %',state; end if;
  insert into operational_results values('13_sessao_anonima',true,'Execução da RPC recusada');

  if (select quantity from public.stock_balances where product_id=shock and location_id=test_location and status_code='awaiting_test')<>4
    or (select quantity from public.stock_balances where product_id=spring and location_id=test_location and status_code='in_stock')<>1
    or (select count(*) from public.stock_movements where product_id in(shock,spring))<>4 then
    raise exception 'Tentativa recusada alterou saldos ou gerou histórico.';
  end if;
  insert into operational_results values('14_falhas_sem_efeitos',true,'Somente os quatro eventos válidos existem na transação');
exception when others then
  -- O bloco PL/pgSQL desfaz suas alterações antes de registrar uma falha no relatório temporário.
  execute 'reset role';
  insert into operational_results values('FALHA',false,sqlstate||': '||sqlerrm);
end $$;

select test,passed,detail from operational_results order by test;
rollback;
