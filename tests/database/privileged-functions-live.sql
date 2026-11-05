-- Confere as 13 assinaturas ainda não exercitadas com identidade sem perfil.
begin read only;
select set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
set local role authenticated;

do $$
declare
  signature regprocedure;
  arguments text;
begin
  foreach signature in array array[
    'public.approve_shock_boxes(text,text,integer,uuid)',
    'public.change_warranty_boxes(uuid,text,text,integer,text,uuid)',
    'public.create_supplier(text)',
    'public.inventory_activity_daily(text,integer)',
    'public.inventory_dashboard(text)',
    'public.inventory_turnover(text,integer)',
    'public.receive_stock(text,text,integer,text)',
    'public.register_product_and_receive(text,text,text,integer,text)',
    'public.register_stock_outflow(text,text,text,integer,text,text,text,uuid)',
    'public.save_warranty_manufacturer(text,uuid,timestamp with time zone)',
    'public.set_product_minimum(text,integer,timestamp with time zone,uuid)',
    'public.transfer_stock(text,text,text,text,integer)',
    'public.update_product_details(text,text,jsonb,timestamp with time zone)'
  ]::regprocedure[]
  loop
    select string_agg(format('null::%s', arg_type::regtype), ', ' order by position)
      into arguments
    from pg_proc p
    cross join lateral unnest(p.proargtypes) with ordinality as args(arg_type, position)
    where p.oid = signature
      and p.proconfig @> array['search_path=""']
      and has_function_privilege(current_user, p.oid, 'EXECUTE');

    if arguments is null then
      raise exception 'Verificar caminho de busca e permissão de %', signature;
    end if;

    begin
      execute format('select public.%I(%s)',
        (select proname from pg_proc where oid = signature), arguments);
      raise exception 'Função aceitou identidade sem perfil: %', signature;
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;

rollback;
select '13 novas verificações de funções privilegiadas aprovadas' as result;
