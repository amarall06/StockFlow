-- Nome exibido da própria conta. Não permite alterar função, ativação ou outra pessoa.
-- Aplicar uma vez, depois de 202610240005_application_history.sql.
begin;

create function public.update_own_display_name(p_display_name text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid;
  v_name text;
begin
  v_user_id := auth.uid();
  if v_user_id is null or private.current_user_role() is null then
    raise exception 'É necessário entrar com uma conta ativa.' using errcode = '42501';
  end if;
  v_name := trim(coalesce(p_display_name, ''));
  if length(v_name) not between 1 and 80 then
    raise exception 'Informe um nome entre 1 e 80 caracteres.' using errcode = '22023';
  end if;

  update public.profiles set display_name = v_name
  where id = v_user_id and is_active = true
  returning display_name into v_name;
  if not found then
    raise exception 'O perfil não está ativo.' using errcode = '42501';
  end if;
  return v_name;
end;
$$;

revoke all on function public.update_own_display_name(text) from public, anon;
grant execute on function public.update_own_display_name(text) to authenticated;

create or replace function public.inventory_api_version()
returns integer language sql immutable security definer set search_path = ''
as $$ select 5 $$;

commit;
