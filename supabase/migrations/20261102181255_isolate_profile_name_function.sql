-- Preserva implementação/validações; retira o privilégio elevado do esquema exposto.
alter function public.update_own_display_name(text) set schema private;
revoke all on function private.update_own_display_name(text) from public, anon, authenticated;
grant execute on function private.update_own_display_name(text) to authenticated;
create function public.update_own_display_name(p_display_name text) returns text
language sql security invoker set search_path = '' as $$
  select private.update_own_display_name(p_display_name)
$$;
revoke all on function public.update_own_display_name(text) from public, anon, authenticated;
grant execute on function public.update_own_display_name(text) to authenticated;
