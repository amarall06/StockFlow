-- Guarda o estado anterior: o lote não pode tocar em produtos/saldos existentes.
create table private.existing_demo_test_products as select id,to_jsonb(p) as original from public.products p;
create table private.existing_demo_test_balances as select id,to_jsonb(b) as original from public.stock_balances b;
