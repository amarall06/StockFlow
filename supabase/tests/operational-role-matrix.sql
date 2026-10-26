-- ENSAIO, NÃO MIGRAÇÃO. Perfis, saldos e eventos são desfeitos ao final.
begin;
set local statement_timeout='45s';
set local lock_timeout='5s';
create temporary table role_test_results(role text,operation text,passed boolean,detail text) on commit drop;
do $$
declare
  actor uuid;
  shock uuid;
  spring uuid;
  source_id uuid;
  target_id uuid;
  shock_code text;
  spring_code text;
  source_code text:='OPROLE-A-'||upper(gen_random_uuid()::text);
  target_code text:='OPROLE-B-'||upper(gen_random_uuid()::text);
  role_under_test public.app_role;
  operation text;
  allowed boolean;
  state text;
  minimum_version timestamptz;
  visible_rows integer;
begin
  select id into actor from public.profiles where is_active and role='administrator' and nullif(trim(display_name),'') is not null limit 1;
  if actor is null then raise exception 'Necessária conta Administrador ativa com nome.'; end if;
  select 'AGM-'||n into shock_code from generate_series(100,1,-1) n where not exists(select 1 from public.products p where p.code='AGM-'||n) limit 1;
  select 'MGM-'||n into spring_code from generate_series(100,1,-1) n where not exists(select 1 from public.products p where p.code='MGM-'||n) limit 1;
  if shock_code is null or spring_code is null then raise exception 'Sem código livre para ensaio.'; end if;
  insert into public.locations(code) values(source_code) returning id into source_id;
  insert into public.locations(code) values(target_code) returning id into target_id;
  insert into public.products(code,application,default_location_id) values(shock_code,'TESTE DE CARGOS - AMORTECEDOR',source_id) returning id into shock;
  insert into public.products(code,application,default_location_id) values(spring_code,'TESTE DE CARGOS - MOLA',source_id) returning id into spring;
  insert into public.stock_balances(product_id,location_id,status_code,unit_type,quantity) values
    (shock,source_id,'awaiting_test','box',20),(shock,source_id,'released_for_sale','box',20),(spring,source_id,'in_stock','box',20);
  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  foreach role_under_test in array array['administrator','receiving','tester','stockkeeper','viewer']::public.app_role[] loop
    update public.profiles set role=role_under_test where id=actor;
    foreach operation in array array['consultar','receber_amortecedor','receber_mola','transferir','aprovar_teste','registrar_saida','alterar_minimo'] loop
      select minimum_updated_at into minimum_version from public.products where id=shock;
      allowed:=case operation
        when 'consultar' then true
        when 'receber_amortecedor' then role_under_test in('administrator','receiving')
        when 'receber_mola' then role_under_test in('administrator','receiving')
        when 'transferir' then role_under_test in('administrator','stockkeeper')
        when 'aprovar_teste' then role_under_test in('administrator','tester')
        else role_under_test='administrator' end;
      execute 'set local role authenticated';
      state:='00000';
      begin
        case operation
          when 'consultar' then
            select count(*) into visible_rows from public.stock_balances where product_id in(shock,spring);
            if visible_rows<3 then raise exception 'Conta ativa não conseguiu consultar os saldos.'; end if;
          when 'receber_amortecedor' then
            perform public.receive_stock_with_supplier(shock_code,null,source_code,1,'awaiting_test',null,null,gen_random_uuid());
          when 'receber_mola' then
            perform public.receive_stock_with_supplier(spring_code,null,source_code,1,'in_stock',null,null,gen_random_uuid());
          when 'transferir' then
            perform public.transfer_stock(shock_code,source_code,target_code,'awaiting_test',1);
          when 'aprovar_teste' then
            perform public.approve_shock_boxes(shock_code,source_code,1,gen_random_uuid());
          when 'registrar_saida' then
            perform public.register_stock_outflow(shock_code,source_code,'awaiting_test',1,'discard','TESTE DE CARGOS - ROLLBACK','OPROLE',gen_random_uuid());
          when 'alterar_minimo' then
            perform public.set_product_minimum(shock_code,2,minimum_version,gen_random_uuid());
        end case;
      exception when others then get stacked diagnostics state=returned_sqlstate; end;
      execute 'reset role';
      if (allowed and state<>'00000') or (not allowed and state<>'42501') then
        raise exception 'Cargo %, operação %, esperado permitido=%, SQLSTATE recebido %',role_under_test,operation,allowed,state;
      end if;
      insert into role_test_results values(role_under_test::text,operation,true,case when allowed then 'Permitida pelo banco' else 'Recusada pelo banco (42501)' end);
    end loop;
    if role_under_test in('administrator','tester') then
      execute 'set local role authenticated';
      state:='00000';
      begin
        perform public.approve_shock_boxes(spring_code,source_code,1,gen_random_uuid());
      exception when others then get stacked diagnostics state=returned_sqlstate; end;
      execute 'reset role';
      if state<>'22023' then raise exception 'Mola aceitou testagem ou foi recusada por motivo incorreto: %',state; end if;
      insert into role_test_results values(role_under_test::text,'molas_sem_testagem',true,'Testagem recusada (22023)');
    end if;
  end loop;
exception when others then
  execute 'reset role';
  insert into role_test_results values('FALHA','ensaio',false,sqlstate||': '||sqlerrm);
end $$;
select role,operation,passed,detail from role_test_results order by role,operation;
rollback;
