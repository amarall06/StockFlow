-- Dados fictícios para testar a integração em um banco de demonstração vazio.
-- Não execute em um banco que já tenha dados de estoque: o bloco inicial cancela nesse caso.

do $$
begin
  if public.inventory_api_version() < 2 then
    raise exception 'Execute primeiro a migração 202610240003_springs_without_testing.sql.';
  end if;
  if exists (select 1 from public.products)
     or exists (select 1 from public.stock_balances)
     or exists (select 1 from public.locations) then
    raise exception 'A carga de demonstração exige products, stock_balances e locations vazias.';
  end if;
end;
$$;

insert into public.locations (code) values
  ('A01'), ('A03'), ('B01'), ('B02'), ('C02'), ('D04');

insert into public.products (code, application, default_location_id)
select sample.code, sample.application, location.id
from (values
  ('AGM-35', 'Amortecedor Chevrolet', 'A03'),
  ('ARE-24', 'Renault — aplicação fictícia A', 'C02'),
  ('AFR-57', 'Ford — aplicação fictícia B', 'A01'),
  ('AFI-89', 'Fiat — aplicação fictícia C', 'D04'),
  ('MGM-12', 'Mola Chevrolet — aplicação fictícia', 'A03'),
  ('MRE-48', 'Renault — aplicação fictícia A', 'C02'),
  ('MFR-63', 'Ford — aplicação fictícia B', 'A01'),
  ('MFI-91', 'Fiat — aplicação fictícia C', 'D04')
) as sample(code, application, default_location)
join public.locations as location on location.code = sample.default_location;

insert into public.stock_balances (product_id, location_id, status_code, unit_type, quantity)
select product.id, location.id, sample.status_code, 'box', sample.quantity
from (values
  ('AGM-35', 'A03', 'awaiting_test', 12),
  ('AGM-35', 'B01', 'released_for_sale', 6),
  ('ARE-24', 'C02', 'awaiting_test', 8),
  ('AFR-57', 'A01', 'released_for_sale', 4),
  ('AFI-89', 'D04', 'awaiting_test', 5),
  ('AFI-89', 'B02', 'released_for_sale', 3),
  ('MGM-12', 'A03', 'in_stock', 2),
  ('MGM-12', 'A01', 'in_stock', 3),
  ('MRE-48', 'C02', 'in_stock', 4),
  ('MFR-63', 'A01', 'in_stock', 1),
  ('MFI-91', 'B02', 'in_stock', 5)
) as sample(code, location_code, status_code, quantity)
join public.products as product on product.code = sample.code
join public.locations as location on location.code = sample.location_code;

-- Registra a origem dos saldos de teste sem atribuí-los a uma pessoa real.
insert into public.stock_movements (
  product_id, movement_type, unit_type, quantity, status_after,
  to_location_id, notes
)
select product.id, 'inventory_adjustment', 'box', sample.quantity,
       sample.status_code, location.id, 'Carga fictícia de demonstração'
from (values
  ('AGM-35', 'A03', 'awaiting_test', 12),
  ('AGM-35', 'B01', 'released_for_sale', 6),
  ('ARE-24', 'C02', 'awaiting_test', 8),
  ('AFR-57', 'A01', 'released_for_sale', 4),
  ('AFI-89', 'D04', 'awaiting_test', 5),
  ('AFI-89', 'B02', 'released_for_sale', 3),
  ('MGM-12', 'A03', 'in_stock', 2),
  ('MGM-12', 'A01', 'in_stock', 3),
  ('MRE-48', 'C02', 'in_stock', 4),
  ('MFR-63', 'A01', 'in_stock', 1),
  ('MFI-91', 'B02', 'in_stock', 5)
) as sample(code, location_code, status_code, quantity)
join public.products as product on product.code = sample.code
join public.locations as location on location.code = sample.location_code;
