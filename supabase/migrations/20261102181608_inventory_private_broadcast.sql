-- Sinal privado sem linhas, nomes ou quantidades; os clientes consultam por RLS.
create policy inventory_private_broadcast_read on realtime.messages
for select to authenticated using (
  (select private.current_user_role()) is not null
  and (select realtime.topic()) = 'inventory:changes'
  and topic = 'inventory:changes' and extension = 'broadcast' and private = true
);
create function private.notify_inventory_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Uma transação pode alterar saldo, histórico e cadastros: um único sinal basta.
  if current_setting('liber.inventory_broadcast_sent',true) is distinct from '1' then
    perform realtime.send('{"source":"database"}'::jsonb,'inventory_changed','inventory:changes',true);
    perform set_config('liber.inventory_broadcast_sent','1',true);
  end if;
  return null;
end $$;
revoke all on function private.notify_inventory_changed() from public,anon,authenticated;
do $$ declare name text;begin
  foreach name in array array[
    'locations','products','product_applications','product_application_history',
    'stock_balances','stock_movements','product_minimum_events','shock_test_approvals',
    'suppliers','warranty_manufacturers','warranty_box_balances','warranty_box_movements',
    'warranty_returns','warranty_return_events','presentation_scenarios','presentation_layouts'
  ] loop
    execute format('create trigger inventory_private_broadcast after insert or update or delete on public.%I for each statement execute function private.notify_inventory_changed()',name);
  end loop;
end $$;
