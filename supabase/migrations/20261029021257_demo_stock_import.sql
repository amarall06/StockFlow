begin;
alter table public.products drop constraint products_code_check;
alter table public.products add constraint products_code_check
 check (code ~ '^[A-Z]{3}-(100|[1-9][0-9]?|0[1-9])([A-Z]{1,3})?$');
-- Registro privado dos IDs reais: identifica o lote sem expor uma API de importação.
create table if not exists private.demo_stock_import_items (
 batch_id text not null,
 product_id uuid not null references public.products(id),
 movement_id uuid not null references public.stock_movements(id),
 quantity integer not null check (quantity > 50),
 created_at timestamptz not null default now(),
 primary key (batch_id,product_id),
 unique (movement_id)
);
alter table private.demo_stock_import_items enable row level security;
revoke all on private.demo_stock_import_items from public,anon,authenticated;
commit;
