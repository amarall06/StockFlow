begin;
do $$
declare
  wrapper record;
  checked integer := 0;
begin
  for wrapper in
    select pub.oid, pub.proname, pub.proacl, pub.prosqlbody, pub.prosecdef,
           impl.oid as implementation, impl.prosecdef as implementation_privileged
    from pg_proc pub
    join pg_proc impl on impl.proname = pub.proname and impl.proargtypes = pub.proargtypes
    where pub.pronamespace = 'public'::regnamespace
      and impl.pronamespace = 'private'::regnamespace
      and pub.proname in (
    'approve_shock_boxes',
    'change_warranty_boxes',
    'create_supplier',
    'receive_stock',
    'receive_stock_with_supplier',
    'register_product_and_receive',
    'register_stock_outflow',
    'save_warranty_manufacturer',
    'save_warranty_return',
    'set_product_minimum',
    'transfer_stock',
    'transfer_stock_once',
    'update_product_details'
      )
      and pg_get_function_arguments(pub.oid) = pg_get_function_arguments(impl.oid)
      and pg_get_function_result(pub.oid) = pg_get_function_result(impl.oid)
  loop
    if wrapper.prosecdef or not wrapper.implementation_privileged or wrapper.prosqlbody is null
       or has_function_privilege('anon', wrapper.oid, 'EXECUTE')
       or not has_function_privilege('authenticated', wrapper.oid, 'EXECUTE')
       or not has_function_privilege('service_role', wrapper.oid, 'EXECUTE') then
      raise exception 'Contrato público ou isolamento inválido: %', wrapper.proname;
    end if;
    checked := checked + 1;
  end loop;
  if checked <> 13 then raise exception 'Esperadas 13 assinaturas compatíveis, encontradas %', checked; end if;
end $$;

-- O wrapper deve alcançar a validação original inclusive sem USAGE no esquema privado.
set local role service_role;
do $$
begin
  perform public.create_supplier('Auditoria de permissões');
  raise exception 'Esperada rejeição por falta de perfil administrativo';
exception when insufficient_privilege then
  if sqlerrm <> 'Somente administradores cadastram fornecedores.' then raise; end if;
end $$;
reset role;

-- Exercita uma escrita nova pelo wrapper com o perfil autorizado, e a reverte.
select set_config('request.jwt.claim.sub', (
  select id::text from public.profiles where is_active and role = 'administrator' limit 1
), true);
set local role authenticated;
do $$
declare
  fixture text := 'AUDITORIA RPC ' || gen_random_uuid()::text;
  receipt jsonb;
begin
  receipt := public.create_supplier(p_name => fixture);
  if receipt->>'name' is distinct from fixture then
    raise exception 'Cadastro não retornou o fornecedor temporário';
  end if;
end $$;
rollback;
select '13 contratos públicos, validação de service_role e escrita revertida aprovados' as result;
