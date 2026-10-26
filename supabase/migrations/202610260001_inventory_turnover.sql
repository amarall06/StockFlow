-- Giro por CAIXAS VENDIDAS, não por valor financeiro ou saldo médio.
-- Somente leitura; não altera saldos, históricos, contas ou políticas existentes.
begin;
do $$ begin
  if public.inventory_api_version()<13 then
    raise exception 'Aplicar o painel de estoque (API 13) antes dos indicadores de giro.';
  end if;
end $$;
create index if not exists stock_movements_turnover_sales
  on public.stock_movements(product_id,created_at desc)
  where unit_type='box' and movement_type='sale';

create or replace function public.inventory_turnover(p_category text default 'all',p_days integer default 90)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  v_now timestamptz:=statement_timestamp();
  v_since timestamptz;
  v_result jsonb;
begin
  if private.current_user_role() is null then
    raise exception 'Conta ativa necessária para consultar os indicadores.' using errcode='42501';
  end if;
  if p_category is null or p_category not in ('all','shocks','springs')
     or p_days is null or p_days not in (30,90,180) then
    raise exception 'Categoria ou período inválido.' using errcode='22023';
  end if;
  v_since:=v_now-make_interval(days=>p_days);
  with category_products as (
    select p.id,p.code,p.created_at from public.products p
    where p_category='all'
      or (p_category='springs' and split_part(p.code,'-',1) in ('MGM','MFI','MRE','MFR'))
      or (p_category='shocks' and split_part(p.code,'-',1) not in ('MGM','MFI','MRE','MFR'))
  ), sales as (
    select m.product_id,
      coalesce(sum(m.quantity) filter(where m.created_at>=v_since),0) as sold_boxes,
      count(*) filter(where m.created_at>=v_since) as sales_count,
      max(m.created_at) as last_sale_at
    from public.stock_movements m join category_products p on p.id=m.product_id
    where m.unit_type='box' and m.movement_type='sale' and m.created_at<=v_now
    group by m.product_id
  ), balances as (
    select b.product_id,sum(b.quantity) as stock_boxes from public.stock_balances b
    join category_products p on p.id=b.product_id
    where b.unit_type='box' and b.status_code in ('awaiting_test','released_for_sale','in_stock')
    group by b.product_id
  )
  select jsonb_build_object('as_of',v_now,'period_start',v_since,'days',p_days,'category',p_category,
    'products',coalesce(jsonb_agg(jsonb_build_object(
      'code',p.code,'registered_at',p.created_at,'sold_boxes',coalesce(s.sold_boxes,0),
      'sales_count',coalesce(s.sales_count,0),'last_sale_at',s.last_sale_at,
      'stock_boxes',coalesce(b.stock_boxes,0)) order by p.code),'[]'::jsonb))
  into v_result from category_products p
  left join sales s on s.product_id=p.id left join balances b on b.product_id=p.id;
  return v_result;
end $$;
revoke all on function public.inventory_turnover(text,integer) from public,anon;
grant execute on function public.inventory_turnover(text,integer) to authenticated;
-- Reexecutar este arquivo não deve reduzir a versão de uma evolução posterior.
do $$ begin
  if public.inventory_api_version()<14 then
    execute $definition$
      create or replace function public.inventory_api_version()
      returns integer language sql immutable security definer set search_path=''
      as $version$ select 14 $version$
    $definition$;
  end if;
end $$;
commit;
