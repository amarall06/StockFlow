-- Volume sintético descartável: 180 dias de 500 vendas/dia e ~900 entradas/semana.
insert into public.stock_movements(product_id,movement_type,unit_type,quantity,status_after,to_location_id,created_at)
select p.id,case when n<=500 then 'sale' else 'receipt' end,'box',1,'released_for_sale',l.id,
 ((now() at time zone 'America/Bahia')::date-d)::timestamp at time zone 'America/Bahia'+interval '12 hours'
from generate_series(1,180) d cross join generate_series(1,629) n,
 public.products p,public.locations l where p.code='AGM-100' and l.code='TEST-A';
create temporary table timings(operation text,ms numeric);
do $$ declare started timestamptz; n integer; begin
 perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
 -- Reposição sintética só no banco descartável para exercitar as RPCs existentes.
 update public.stock_balances set quantity=10000 where product_id=(select id from public.products where code='AGM-100') and location_id=(select id from public.locations where code='TEST-A');
 for n in 1..500 loop
  started:=clock_timestamp();
  perform public.register_stock_outflow('AGM-100','TEST-A','released_for_sale',1,'sale',null,null,gen_random_uuid());
  insert into timings values('saida',extract(epoch from clock_timestamp()-started)*1000);
 end loop;
 for n in 1..900 loop
  started:=clock_timestamp();
  perform public.receive_stock_with_supplier('AGM-100',null,'TEST-A',1,'released_for_sale',null,null,gen_random_uuid());
  insert into timings values('entrada',extract(epoch from clock_timestamp()-started)*1000);
 end loop;
 for n in 1..20 loop
  started:=clock_timestamp();perform public.inventory_dashboard('all');
  insert into timings values('painel',extract(epoch from clock_timestamp()-started)*1000);
  started:=clock_timestamp();perform public.inventory_activity_daily('all',90);
  insert into timings values('grafico_90d',extract(epoch from clock_timestamp()-started)*1000);
 end loop;
end $$;
select json_build_object('history_rows',(select count(*) from public.stock_movements),'measurements',
 (select json_agg(t) from (select operation,count(*) as calls,round(avg(ms),3) as avg_ms,
 round(percentile_cont(.95) within group(order by ms)::numeric,3) as p95_ms from timings group by operation order by operation) t));
