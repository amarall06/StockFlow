-- Os códigos anteriores continuam válidos. AMD e AMT são opcionais e exclusivos de amortecedores.
begin;
alter table public.products drop constraint products_code_check;
alter table public.products add constraint products_code_check
  check (code ~ '^(?:(?:AMD|AMT)-(?!MGM-|MFI-|MRE-|MFR-))?[A-Z]{3}-(100|[1-9][0-9]?|0[1-9])([A-Z]{1,3})?$');

-- O corpo privilegiado já está no esquema privado. Preserva a API pública, ACL e lógica.
do $$
declare
  previous_pattern constant text := '^[A-Z]{3}-(100|[1-9][0-9]?|0[1-9])([A-Z]{1,3})?$';
  directional_pattern constant text := '^(?:(?:AMD|AMT)-(?!MGM-|MFI-|MRE-|MFR-))?[A-Z]{3}-(100|[1-9][0-9]?|0[1-9])([A-Z]{1,3})?$';
  definition text;
begin
  definition := pg_get_functiondef('private.receive_stock_with_supplier(text,text,text,integer,text,uuid,text,uuid)'::regprocedure);
  if strpos(definition, directional_pattern) > 0 then return; end if;
  if strpos(definition, previous_pattern) = 0 then
    raise exception 'Validação anterior de código não encontrada. Revise a versão do recebimento.';
  end if;
  execute replace(definition, previous_pattern, directional_pattern);
end $$;
commit;
