-- Fotos de produtos: bucket privado, consulta por contas ativas e envio só por Administrador.
-- Não altera saldos, produtos, cargos ou a versão das operações de estoque.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-photos','product-photos',false,2097152,array['image/webp'])
on conflict(id) do update set public=false,file_size_limit=2097152,allowed_mime_types=array['image/webp'];

-- Um arquivo por produto: AGM-35.webp ou MGM-35.webp, por exemplo.
-- O banco confirma que o código existe; nenhum usuário ganha acesso a outros buckets.
drop policy if exists product_photos_read_active on storage.objects;
create policy product_photos_read_active on storage.objects for select to authenticated
using(bucket_id='product-photos' and (select private.current_user_role()) is not null);

drop policy if exists product_photos_insert_admin on storage.objects;
create policy product_photos_insert_admin on storage.objects for insert to authenticated
with check(bucket_id='product-photos'
  and (select private.current_user_role())='administrator'::public.app_role
  and exists(select 1 from public.products p where name=p.code||'.webp'));

drop policy if exists product_photos_update_admin on storage.objects;
create policy product_photos_update_admin on storage.objects for update to authenticated
using(bucket_id='product-photos' and (select private.current_user_role())='administrator'::public.app_role)
with check(bucket_id='product-photos'
  and (select private.current_user_role())='administrator'::public.app_role
  and exists(select 1 from public.products p where name=p.code||'.webp'));
commit;
