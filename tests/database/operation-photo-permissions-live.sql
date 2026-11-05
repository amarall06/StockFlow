-- Auditoria somente leitura. A identidade sintética não corresponde a um perfil.
begin read only;

do $$
declare unexpected text;
begin
  select string_agg(p.oid::regprocedure::text, ', ')
  into unexpected
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.prosecdef
    and has_function_privilege('anon', p.oid, 'EXECUTE');
  if unexpected is not null then
    raise exception 'Funções privilegiadas expostas ao anônimo: %', unexpected;
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'product-photos' and not public
      and file_size_limit = 2097152 and allowed_mime_types = array['image/webp']
  ) then
    raise exception 'Configuração inesperada do bucket de fotos';
  end if;

  if not (select relrowsecurity from pg_class where oid = 'storage.objects'::regclass) then
    raise exception 'RLS desativada no armazenamento';
  end if;

  -- Falha também se aparecer uma política adicional que possa ampliar o acesso.
  if (select array_agg(policyname::text order by policyname)
      from pg_policies where schemaname = 'storage' and tablename = 'objects')
     is distinct from array['product_photos_insert_admin', 'product_photos_read_active',
                            'product_photos_update_admin'] then
    raise exception 'Revisar políticas efetivas de storage.objects';
  end if;
end $$;

select set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
set local role authenticated;

do $$
begin
  if exists (select 1 from storage.objects where bucket_id = 'product-photos') then
    raise exception 'Identidade sem perfil conseguiu listar fotos';
  end if;

  begin
    perform public.receive_stock_with_supplier(null, null, null, null, null, null, null, null);
    raise exception 'Entrada aceita sem perfil';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.transfer_stock_once(null, null, null, null, null, null);
    raise exception 'Transferência aceita sem perfil';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.save_warranty_return(null, null, null, null);
    raise exception 'Devolução aceita sem perfil';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
select 'Auditoria somente leitura aprovada' as result;
