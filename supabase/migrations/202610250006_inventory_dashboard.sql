-- Aplicar uma vez depois de stock_minimums (API 12).
-- Relatório somente de leitura: vendas não incluem transferência, descarte ou garantia.
begin;
create index stock_movements_dashboard_recent on public.stock_movements(movement_type,created_at desc,id desc)
  where unit_type='box' and movement_type in ('sale','receipt');
create function public.inventory_dashboard(p_category text default 'all')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  v_now timestamptz := statement_timestamp();
  v_since timestamptz;
  v_result jsonb;
begin
  if private.current_user_role() is null then
    raise exception 'Conta ativa necessária para consultar o painel.' using errcode='42501';
  end if;
  if p_category is null or p_category not in ('all','shocks','springs') then
    raise exception 'Categoria inválida.' using errcode='22023';
  end if;
  v_since:=v_now-interval '30 days';
  with category_products as (
    select product.id,product.code from public.products product
    where p_category='all'
        or (p_category='springs' and split_part(product.code,'-',1) in ('MGM','MFI','MRE','MFR'))
        or (p_category='shocks' and split_part(product.code,'-',1) not in ('MGM','MFI','MRE','MFR'))
  ), sales as (
    select movement.quantity,product.code from public.stock_movements movement
    join category_products product on product.id=movement.product_id
    where movement.unit_type='box' and movement.movement_type='sale'
      and movement.created_at>=v_since and movement.created_at<=v_now
  ), ranked as (
    select code,sum(quantity) as boxes from sales group by code order by boxes desc,code limit 10
  ), recent as (
    select movement.*,product.code,location.code as location_code from public.stock_movements movement
    join category_products product on product.id=movement.product_id
    left join public.locations location on location.id=movement.to_location_id
    where movement.unit_type='box' and movement.movement_type='receipt' and movement.created_at<=v_now
    order by movement.created_at desc,movement.id desc limit 10
  )
  select jsonb_build_object(
    'as_of',v_now,'period_start',v_since,
    'sold_boxes',coalesce((select sum(quantity) from sales),0),
    'sales_count',(select count(*) from sales),
    'sales_by_product',coalesce((select jsonb_agg(jsonb_build_object('code',code,'boxes',boxes) order by boxes desc,code) from ranked),'[]'::jsonb),
    'receipts',coalesce((select jsonb_agg(jsonb_build_object('id',id,'created_at',created_at,'code',code,'boxes',quantity,
      'location',location_code,'supplier',supplier_name,'lot',lot_reference) order by created_at desc,id desc) from recent),'[]'::jsonb)
  ) into v_result;
  return v_result;
end; $$;
revoke all on function public.inventory_dashboard(text) from public,anon;
grant execute on function public.inventory_dashboard(text) to authenticated;
create or replace function public.inventory_api_version()
returns integer language sql immutable security definer set search_path='' as $$ select 13 $$;
commit;
