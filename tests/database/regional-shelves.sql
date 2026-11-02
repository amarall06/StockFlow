-- Novo recorte: integridade da reorganização e bloqueio dos códigos anteriores.
begin;
do $$
declare backup record; totals jsonb; history_hash text; rejected boolean;
begin
 select * into strict backup from private.regional_shelf_reorganizations where key='four-regions-v1';
 select coalesce(jsonb_agg(to_jsonb(t) order by product_id,status_code,unit_type),'[]') into totals from (select product_id,status_code,unit_type,sum(quantity) quantity from public.stock_balances group by product_id,status_code,unit_type)t;
 if totals<>backup.before_state->'totals' then raise exception 'Quantidade por produto/situação/unidade alterada';end if;
 select md5(coalesce(string_agg(to_jsonb(m)::text,',' order by id),'')) into history_hash from public.stock_movements m where id in(select value::uuid from jsonb_array_elements_text(backup.before_state->'movement_ids'));
 if history_hash<>backup.before_state->>'movement_hash' then raise exception 'Histórico anterior alterado';end if;
 if (select array_agg(code order by code) from public.locations where is_active)<>array['LESTE','NORTE','OESTE','SUL'] then raise exception 'Regiões incorretas';end if;
 rejected:=false;
 begin insert into public.locations(code) values('TESTE-REGIAO');exception when check_violation then rejected:=true;end;
 if not rejected then raise exception 'Local indevido aceito';end if;
 rejected:=false;
 begin update public.locations set is_active=false where code='NORTE';exception when sqlstate '22023' then rejected:=true;end;
 if not rejected then raise exception 'Região desativada';end if;
 rejected:=false;
 begin update public.products set default_location_id=(select id from public.locations where code='A01') where id=(select id from public.products order by id limit 1);exception when sqlstate '22023' then rejected:=true;end;
 if not rejected then raise exception 'Padrão antigo aceito';end if;
 rejected:=false;
 begin update public.stock_balances set location_id=(select id from public.locations where code='A01') where id=(select id from public.stock_balances order by id limit 1);exception when sqlstate '22023' then rejected:=true;end;
 if not rejected then raise exception 'Saldo em local antigo aceito';end if;
end $$;
rollback;
select 'PASS: totais, histórico, quatro regiões e quatro bloqueios' result;
