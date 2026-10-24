-- LIBER automotive: rascunho de funções e acesso por RLS.
-- Esta migração local NÃO foi aplicada ao projeto Supabase.

-- Guarda funções internas fora dos esquemas expostos pela API REST.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Define os perfis funcionais aprovados como base para a primeira versão.
create type public.app_role as enum (
  'administrator',
  'receiving',
  'tester',
  'stockkeeper',
  'viewer'
);

-- Contas novas começam somente com consulta; um administrador pode promover o perfil.
alter table public.profiles
  add column role public.app_role not null default 'viewer';

-- Contas existentes e novas permanecem inativas até aprovação de um administrador.
alter table public.profiles alter column is_active set default false;
update public.profiles set is_active = false;

-- Busca a função ativa da pessoa autenticada sem expor a tabela de perfis ao cliente.
create or replace function private.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select profile.role
  from public.profiles as profile
  where profile.id = (select auth.uid())
    and profile.is_active = true
  limit 1
$$;

-- Somente pessoas autenticadas podem consultar a própria função efetiva.
revoke all on function private.current_user_role() from public, anon;
grant execute on function private.current_user_role() to authenticated;

-- Cria automaticamente um perfil de consulta quando Supabase Auth cria uma conta.
create or replace function private.create_default_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role, is_active)
  values (
    new.id,
    new.raw_user_meta_data ->> 'display_name',
    'viewer'::public.app_role,
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.create_default_profile() from public, anon, authenticated;

create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function private.create_default_profile();

-- Permite que uma conta ativa com perfil consulte os cadastros e saldos.
create policy locations_read_active_users
  on public.locations for select to authenticated
  using ((select private.current_user_role()) is not null);

create policy products_read_active_users
  on public.products for select to authenticated
  using ((select private.current_user_role()) is not null);

create policy stock_statuses_read_active_users
  on public.stock_statuses for select to authenticated
  using ((select private.current_user_role()) is not null);

create policy stock_balances_read_active_users
  on public.stock_balances for select to authenticated
  using ((select private.current_user_role()) is not null);

create policy movement_types_read_active_users
  on public.movement_types for select to authenticated
  using ((select private.current_user_role()) is not null);

create policy stock_movements_read_active_users
  on public.stock_movements for select to authenticated
  using ((select private.current_user_role()) is not null);

-- Usuários consultam o próprio perfil; administradores gerenciam todos os perfis.
create policy profiles_read_self_or_admin
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (select private.current_user_role()) = 'administrator'::public.app_role
  );

create policy profiles_admin_manage
  on public.profiles for all to authenticated
  using ((select private.current_user_role()) = 'administrator'::public.app_role)
  with check ((select private.current_user_role()) = 'administrator'::public.app_role);

-- Administradores gerenciam somente cadastros de referência neste estágio.
create policy locations_admin_manage
  on public.locations for all to authenticated
  using ((select private.current_user_role()) = 'administrator'::public.app_role)
  with check ((select private.current_user_role()) = 'administrator'::public.app_role);

create policy products_admin_manage
  on public.products for all to authenticated
  using ((select private.current_user_role()) = 'administrator'::public.app_role)
  with check ((select private.current_user_role()) = 'administrator'::public.app_role);

create policy stock_statuses_admin_manage
  on public.stock_statuses for all to authenticated
  using ((select private.current_user_role()) = 'administrator'::public.app_role)
  with check ((select private.current_user_role()) = 'administrator'::public.app_role);

create policy movement_types_admin_manage
  on public.movement_types for all to authenticated
  using ((select private.current_user_role()) = 'administrator'::public.app_role)
  with check ((select private.current_user_role()) = 'administrator'::public.app_role);

-- Concede privilégios SQL amplos apenas onde as políticas RLS os controlam.
grant select on public.locations, public.products, public.stock_statuses,
  public.stock_balances, public.profiles, public.movement_types,
  public.stock_movements to authenticated;

grant insert, update, delete on public.locations, public.products,
  public.stock_statuses, public.movement_types to authenticated;

grant insert, update, delete on public.profiles to authenticated;

-- Saldos e histórico ficam sem privilégios de escrita direta.
-- Próxima etapa: criar funções transacionais que atualizam saldo e histórico juntos,
-- verificando as funções receiving, tester, stockkeeper e administrator.
