-- Lote explicitamente autorizado de teste no estoque operacional.
-- Somente produtos novos são incluídos. Reexecutar não soma caixas ou vendas.
begin;
create temporary table directional_test_candidates(
  code text primary key, application text, location text, status text,
  received integer, sold integer, receipt_days integer, sale_days integer
) on commit drop;
insert into directional_test_candidates values
  ('AMD-AGM-35','[TESTE] Amortecedor dianteiro','NORTE','released_for_sale',72,18,6,5),
  ('AMT-ARE-24','[TESTE] Amortecedor traseiro','SUL','released_for_sale',66,11,5,3),
  ('AGM-97','[TESTE] Amortecedor sem posição definida','LESTE','released_for_sale',60,7,4,2),
  ('MGM-97','[TESTE] Mola para movimentações','OESTE','in_stock',64,15,3,1);

do $$ begin
  if exists (
    select 1 from directional_test_candidates c left join public.locations l on l.code=c.location and l.is_active
    where l.id is null
  ) then raise exception 'Uma região do teste está ausente ou inativa.'; end if;
end $$;

create temporary table directional_test_created on commit drop as
with inserted as (
  insert into public.products(code,application,default_location_id)
  select c.code,c.application,l.id from directional_test_candidates c
  join public.locations l on l.code=c.location and l.is_active
  order by c.code
  on conflict(code) do nothing
  returning id,code,default_location_id
)
select i.id as product_id,i.default_location_id as location_id,c.*,gen_random_uuid() as receipt_id
from inserted i join directional_test_candidates c on c.code=i.code;

insert into public.stock_balances(product_id,location_id,status_code,unit_type,quantity)
select product_id,location_id,status,'box',received-sold from directional_test_created;
insert into public.stock_movements(id,product_id,movement_type,unit_type,quantity,status_after,to_location_id,notes,created_at)
select receipt_id,product_id,'receipt','box',received,status,location_id,
 '[TESTE] Entrada simulada · directional-sales-test-v1',now()-make_interval(days=>receipt_days)
from directional_test_created;
insert into public.stock_movements(product_id,movement_type,unit_type,quantity,status_before,from_location_id,notes,created_at)
select product_id,'sale','box',sold,status,location_id,
 '[TESTE] Venda simulada · directional-sales-test-v1',now()-make_interval(days=>sale_days)
from directional_test_created;
insert into private.demo_stock_import_items(batch_id,product_id,movement_id,quantity)
select 'directional-sales-test-v1',product_id,receipt_id,received from directional_test_created;
commit;

select p.code,m.quantity as caixas_recebidas
from private.demo_stock_import_items i join public.products p on p.id=i.product_id
join public.stock_movements m on m.id=i.movement_id
where i.batch_id='directional-sales-test-v1' order by p.code;
