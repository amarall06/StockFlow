-- Novo caso: configuração operacional isolada da apresentação e dos saldos.
begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' limit 1),true);
set local role authenticated;
do $$
declare head public.inventory_layouts%rowtype;before_presentation jsonb;before_balances jsonb;receipt jsonb;
begin
 select * into strict head from public.inventory_layouts;
 select jsonb_agg(to_jsonb(p) order by scenario_key) into before_presentation from public.presentation_layouts p;
 select jsonb_agg(to_jsonb(b) order by id) into before_balances from public.stock_balances b;
 receipt:=public.save_inventory_layout(head.revision,head.layout,jsonb_build_object('NORTE',jsonb_build_object('boxes',10000,'basis','Somente ensaio transacional')),gen_random_uuid());
 if receipt->>'scenario_key'<>'liber-inventory-v1' or receipt#>>'{capacities,NORTE,boxes}'<>'10000' then raise exception 'Confirmação operacional incorreta';end if;
 if before_presentation is distinct from (select jsonb_agg(to_jsonb(p) order by scenario_key) from public.presentation_layouts p) then raise exception 'Apresentação foi alterada pela configuração operacional';end if;
 if before_balances is distinct from (select jsonb_agg(to_jsonb(b) order by id) from public.stock_balances b) then raise exception 'Saldo alterado pela configuração operacional';end if;
end $$;
reset role;
rollback;
select 'PASS: gravação operacional isolada, apresentação e saldos intactos; transação revertida' result;
