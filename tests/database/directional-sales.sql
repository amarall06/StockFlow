-- Execute apenas em banco descartável com a migração e o lote de teste aplicados.
begin;
insert into private.company_allowed_emails(email) values ('directional-test@example.invalid');
insert into auth.users(id,email) values ('814919ef-87a8-49f1-bd98-12910e547fea','directional-test@example.invalid');
update public.profiles set role='administrator',is_active=true,display_name='Pessoa de Teste' where id='814919ef-87a8-49f1-bd98-12910e547fea';
set local role authenticated;
select set_config('request.jwt.claim.sub','814919ef-87a8-49f1-bd98-12910e547fea',true);

do $$
declare
  before_sales integer;
  after_sales integer;
begin
  select (public.inventory_dashboard('shocks')->>'sold_boxes')::integer into before_sales;
  if before_sales <> 36 then raise exception 'Esperadas 36 caixas vendidas de amortecedores, encontrado %', before_sales; end if;
  if (public.inventory_dashboard('springs')->>'sold_boxes')::integer <> 15 then
    raise exception 'Venda de mola fora da categoria esperada';
  end if;
  perform public.receive_stock_with_supplier('amd-agm-96','Entrada de teste','NORTE',5,'released_for_sale',null,null,gen_random_uuid());
  perform public.register_stock_outflow('AMD-AGM-96','NORTE','released_for_sale',2,'sale',null,null,gen_random_uuid());
  select (public.inventory_dashboard('shocks')->>'sold_boxes')::integer into after_sales;
  if after_sales <> before_sales + 2 then raise exception 'Venda não refletiu no Painel'; end if;
  if (select b.quantity from public.stock_balances b join public.products p on p.id=b.product_id where p.code='AMD-AGM-96') <> 3 then
    raise exception 'Saldo da venda inválido';
  end if;
  begin
    perform public.receive_stock_with_supplier('AMT-MGM-96','Inválido','NORTE',5,'released_for_sale',null,null,gen_random_uuid());
    raise exception 'Prefixo de amortecedor aceito para mola';
  exception when invalid_parameter_value then null;
  end;
end $$;
rollback;
