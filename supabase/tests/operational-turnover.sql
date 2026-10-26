-- ENSAIO, NÃO MIGRAÇÃO. Fixtures, perfis e histórico são desfeitos no ROLLBACK.
begin;
set local statement_timeout='45s';
set local lock_timeout='5s';
create temporary table turnover_test_results(test text,passed boolean) on commit drop;
do $$
declare
  actor uuid;
  location_id uuid;
  shock uuid;
  spring uuid;
  idle uuid;
  shock_code text;
  spring_code text;
  idle_code text;
  report jsonb;
  row_data jsonb;
  actual_state text;
  period integer;
  role_under_test public.app_role;
  moment timestamptz:=statement_timestamp();
begin
  select id into actor from public.profiles where is_active and role='administrator' limit 1;
  if actor is null then raise exception 'Administrador ativo necessário para o ensaio.'; end if;
  select 'AGM-'||n into shock_code from generate_series(100,1,-1) n where not exists(select 1 from public.products where code='AGM-'||n) limit 1;
  select 'MGM-'||n into spring_code from generate_series(100,1,-1) n where not exists(select 1 from public.products where code='MGM-'||n) limit 1;
  select 'AGM-'||n into idle_code from generate_series(100,1,-1) n where 'AGM-'||n<>shock_code and not exists(select 1 from public.products where code='AGM-'||n) limit 1;
  if shock_code is null or spring_code is null or idle_code is null then raise exception 'Sem códigos livres para fixtures.'; end if;
  insert into public.locations(code) values('TURNOVER-'||upper(gen_random_uuid()::text)) returning id into location_id;
  insert into public.products(code,application,default_location_id) values(shock_code,'ENSAIO TRANSACIONAL - AMORTECEDOR',location_id) returning id into shock;
  insert into public.products(code,application,default_location_id) values(spring_code,'ENSAIO TRANSACIONAL - MOLA',location_id) returning id into spring;
  insert into public.products(code,application,default_location_id) values(idle_code,'ENSAIO TRANSACIONAL - SEM VENDAS',location_id) returning id into idle;
  insert into public.stock_balances(product_id,location_id,status_code,unit_type,quantity) values
    (shock,location_id,'awaiting_test','box',4),(shock,location_id,'released_for_sale','box',2),
    (shock,location_id,'awaiting_test','piece',12),(spring,location_id,'in_stock','box',9),
    (idle,location_id,'awaiting_test','box',7);
  insert into public.stock_movements(product_id,movement_type,unit_type,quantity,created_at) values
    (shock,'sale','box',5,moment-interval '10 days'),
    (shock,'sale','box',3,moment-interval '30 days'),
    (shock,'sale','box',2,moment-interval '31 days'),
    (shock,'sale','box',1,moment-interval '91 days'),
    (shock,'sale','box',777,moment+interval '1 day'),
    (shock,'sale','piece',99,moment-interval '1 day'),
    (shock,'receipt','box',999,moment-interval '1 day'),
    (shock,'transfer','box',80,moment-interval '1 day'),
    (shock,'discard','box',90,moment-interval '1 day'),
    (shock,'supplier_return','box',70,moment-interval '1 day'),
    (spring,'sale','box',4,moment-interval '3 days'),
    (spring,'sale','box',6,moment-interval '100 days');
  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  report:=public.inventory_turnover('all',30);
  execute 'reset role';
  select value into row_data from jsonb_array_elements(report->'products') where value->>'code'=shock_code;
  if (row_data->>'sold_boxes')::int<>8 or (row_data->>'sales_count')::int<>2 then raise exception 'Limite de 30 dias ou exclusões incorretos: %',row_data; end if;
  insert into turnover_test_results values('01_limite_exato_30_dias_e_exclusoes',true);
  if (row_data->>'last_sale_at')::timestamptz<>moment-interval '10 days' then raise exception 'Última venda incluiu futuro ou peças.'; end if;
  insert into turnover_test_results values('02_ultima_venda_sem_futuro_ou_pecas',true);
  if (row_data->>'stock_boxes')::int<>6 then raise exception 'Saldo normal incluiu peças ou deixou aguardando fora.'; end if;
  insert into turnover_test_results values('03_estoque_shock_inclui_aguardando_sem_pecas',true);
  select value into row_data from jsonb_array_elements(report->'products') where value->>'code'=spring_code;
  if (row_data->>'sold_boxes')::int<>4 or (row_data->>'stock_boxes')::int<>9 then raise exception 'Saldo/venda de mola incorreto.'; end if;
  insert into turnover_test_results values('04_mola_em_estoque_sem_testagem',true);
  select value into row_data from jsonb_array_elements(report->'products') where value->>'code'=idle_code;
  if row_data is null or (row_data->>'sold_boxes')::int<>0 or row_data->>'last_sale_at' is not null or (row_data->>'stock_boxes')::int<>7 then raise exception 'Produto sem vendas ausente ou incorreto.'; end if;
  insert into turnover_test_results values('05_catalogo_sem_vendas_preservado',true);
  execute 'set local role authenticated'; report:=public.inventory_turnover('all',90); execute 'reset role';
  select value into row_data from jsonb_array_elements(report->'products') where value->>'code'=shock_code;
  if (row_data->>'sold_boxes')::int<>10 then raise exception 'Período de 90 dias incorreto.'; end if;
  insert into turnover_test_results values('06_periodo_90_dias',true);
  execute 'set local role authenticated'; report:=public.inventory_turnover('all',180); execute 'reset role';
  select value into row_data from jsonb_array_elements(report->'products') where value->>'code'=shock_code;
  if (row_data->>'sold_boxes')::int<>11 then raise exception 'Período de 180 dias incorreto.'; end if;
  select value into row_data from jsonb_array_elements(report->'products') where value->>'code'=spring_code;
  if (row_data->>'sold_boxes')::int<>10 then raise exception 'Vendas antigas de mola não foram incluídas.'; end if;
  insert into turnover_test_results values('07_periodo_180_ambas_categorias',true);
  execute 'set local role authenticated'; report:=public.inventory_turnover('shocks',30); execute 'reset role';
  if exists(select 1 from jsonb_array_elements(report->'products') where value->>'code'=spring_code) then raise exception 'Filtro de amortecedor incluiu mola.'; end if;
  insert into turnover_test_results values('08_filtro_amortecedores',true);
  execute 'set local role authenticated'; report:=public.inventory_turnover('springs',30); execute 'reset role';
  if exists(select 1 from jsonb_array_elements(report->'products') where value->>'code'=shock_code)
    or not exists(select 1 from jsonb_array_elements(report->'products') where value->>'code'=spring_code) then raise exception 'Filtro de molas incorreto.'; end if;
  insert into turnover_test_results values('09_filtro_molas',true);
  execute 'set local role authenticated'; report:=public.inventory_turnover('all',30); execute 'reset role';
  if (report->>'as_of')::timestamptz<>moment or (report->>'period_start')::timestamptz<>moment-interval '30 days' then raise exception 'Janela temporal incorreta.'; end if;
  insert into turnover_test_results values('10_janela_temporal_do_servidor',true);
  foreach period in array array[0,31,365,null] loop
    actual_state:='00000';execute 'set local role authenticated';
    begin perform public.inventory_turnover('all',period); exception when others then get stacked diagnostics actual_state=returned_sqlstate; end;
    execute 'reset role';
    if actual_state<>'22023' then raise exception 'Período inválido aceito: %',period; end if;
  end loop;
  insert into turnover_test_results values('11_periodos_invalidos_recusados',true);
  actual_state:='00000';execute 'set local role authenticated';
  begin perform public.inventory_turnover('invalid',30); exception when others then get stacked diagnostics actual_state=returned_sqlstate; end;
  execute 'reset role';if actual_state<>'22023' then raise exception 'Categoria inválida aceita.'; end if;
  insert into turnover_test_results values('12_categoria_invalida_recusada',true);
  foreach role_under_test in array array['administrator','receiving','tester','stockkeeper','viewer']::public.app_role[] loop
    update public.profiles set role=role_under_test where id=actor;
    execute 'set local role authenticated';report:=public.inventory_turnover('all',30);execute 'reset role';
    if report->'products' is null then raise exception 'Consulta não retornou para %',role_under_test; end if;
    insert into turnover_test_results values('13_acesso_ativo_'||role_under_test,true);
  end loop;
  update public.profiles set role='administrator',is_active=false where id=actor;
  actual_state:='00000';execute 'set local role authenticated';
  begin perform public.inventory_turnover('all',30); exception when others then get stacked diagnostics actual_state=returned_sqlstate; end;
  execute 'reset role';if actual_state<>'42501' then raise exception 'Conta inativa conseguiu consultar.'; end if;
  insert into turnover_test_results values('14_conta_inativa_recusada',true);
  if has_function_privilege('anon','public.inventory_turnover(text,integer)','execute') then raise exception 'Anon tem acesso ao relatório.'; end if;
  insert into turnover_test_results values('15_sem_execucao_anonima',true);
end $$;
select * from turnover_test_results order by test;
rollback;
