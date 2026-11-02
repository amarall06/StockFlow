set local lock_timeout='5s';
set local statement_timeout='30s';
create table private.regional_shelf_reorganizations (
 key text primary key, before_state jsonb not null, after_state jsonb,
 created_at timestamptz not null default clock_timestamp()
);
alter table private.regional_shelf_reorganizations enable row level security;
revoke all on private.regional_shelf_reorganizations from public,anon,authenticated;
do $$
declare actor uuid; item record; before_state jsonb; before_totals jsonb; after_totals jsonb; old_ids uuid[]; old_movement_ids uuid[]; original_history text; moved int:=0;begin
 lock table public.locations,public.products,public.stock_balances,public.stock_movements in access exclusive mode;
 if exists(select 1 from public.locations where is_active and code not in ('NORTE','SUL','LESTE','OESTE','A01','A03','B01','B02','C02','D04')) then raise exception 'Localização ativa desconhecida; nenhuma consolidação foi aplicada.';end if;
 if (select count(*) from public.locations where is_active and code in ('NORTE','SUL','LESTE','OESTE'))<>4 then raise exception 'As quatro regiões precisam existir antes da consolidação.';end if;
 select id into strict actor from public.profiles where is_active and role='administrator' order by id limit 1;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 select array_agg(id) into old_ids from public.locations where code in ('A01','A03','B01','B02','C02','D04');
 select array_agg(id),md5(coalesce(string_agg(to_jsonb(m)::text,',' order by id),'')) into old_movement_ids,original_history from public.stock_movements m;
 select coalesce(jsonb_agg(to_jsonb(t) order by product_id,status_code,unit_type),'[]') into before_totals from (select product_id,status_code,unit_type,sum(quantity) as quantity from public.stock_balances group by product_id,status_code,unit_type)t;
 select jsonb_build_object('locations',(select jsonb_agg(to_jsonb(l)) from public.locations l),'balances',(select jsonb_agg(to_jsonb(b)) from public.stock_balances b),'products',(select jsonb_agg(jsonb_build_object('id',id,'default_location_id',default_location_id,'updated_at',updated_at)) from public.products),'movement_ids',to_jsonb(old_movement_ids),'movement_hash',original_history,'totals',before_totals) into before_state;
 insert into private.regional_shelf_reorganizations(key,before_state) values('four-regions-v1',before_state);
 if exists(select 1 from public.stock_balances where location_id=any(old_ids) and unit_type<>'box') then raise exception 'Saldo em unidade inesperada; a cópia foi revertida junto da transação.';end if;
 for item in select p.code as product,l.code as origin,b.status_code,b.quantity,
   case left(l.code,1) when 'A' then 'NORTE' when 'B' then 'SUL' when 'C' then 'LESTE' when 'D' then 'OESTE' end as destination
   from public.stock_balances b join public.products p on p.id=b.product_id join public.locations l on l.id=b.location_id
   where b.location_id=any(old_ids) order by p.code,l.code,b.status_code loop
   perform public.transfer_stock_once(item.product,item.origin,item.destination,item.status_code,item.quantity,gen_random_uuid());
   moved:=moved+item.quantity;
 end loop;
 update public.stock_movements set notes='Reorganização das prateleiras por região; códigos anteriores preservados no histórico.'
 where not(id=any(coalesce(old_movement_ids,'{}'::uuid[]))) and from_location_id=any(old_ids) and performed_by=actor;
 update public.products p set default_location_id=target.id,updated_at=clock_timestamp()
 from public.locations old join public.locations target on target.code=case left(old.code,1) when 'A' then 'NORTE' when 'B' then 'SUL' when 'C' then 'LESTE' when 'D' then 'OESTE' end
 where p.default_location_id=old.id and old.id=any(old_ids);
 update public.locations set is_active=false where id=any(old_ids);
 select coalesce(jsonb_agg(to_jsonb(t) order by product_id,status_code,unit_type),'[]') into after_totals from (select product_id,status_code,unit_type,sum(quantity) as quantity from public.stock_balances group by product_id,status_code,unit_type)t;
 if before_totals<>after_totals or exists(select 1 from public.stock_balances where location_id=any(old_ids)) then raise exception 'Os saldos não fecharam; toda a reorganização foi revertida.';end if;
 if (select md5(coalesce(string_agg(to_jsonb(m)::text,',' order by id),'')) from public.stock_movements m where id=any(old_movement_ids))<>original_history then raise exception 'Histórico anterior alterado; reorganização revertida.';end if;
 update private.regional_shelf_reorganizations set after_state=jsonb_build_object('moved_boxes',moved,'totals',after_totals,'active_locations',(select jsonb_agg(code order by code) from public.locations where is_active),'new_movements',(select count(*) from public.stock_movements where not(id=any(coalesce(old_movement_ids,'{}'::uuid[]))))) where key='four-regions-v1';
end $$;
alter table public.locations add constraint locations_four_regions check (
 (code in ('NORTE','SUL','LESTE','OESTE') and is_active) or (code not in ('NORTE','SUL','LESTE','OESTE') and not is_active)
);
create function private.protect_regional_shelves() returns trigger language plpgsql set search_path='' as $$begin
 if old.code in ('NORTE','SUL','LESTE','OESTE') then
   if tg_op='DELETE' then raise exception 'As quatro regiões são fixas e não podem ser removidas.' using errcode='22023';end if;
   if new.id<>old.id or new.code<>old.code or new.is_active<>old.is_active then raise exception 'As quatro regiões são fixas.' using errcode='22023';end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
revoke all on function private.protect_regional_shelves() from public,anon,authenticated;
create trigger locations_protect_regions before update or delete on public.locations for each row execute function private.protect_regional_shelves();
create function private.require_regional_location() returns trigger language plpgsql set search_path='' as $$declare target uuid;begin
 if tg_table_name='products' then target:=new.default_location_id;else target:=new.location_id;end if;
 if target is not null and not exists(select 1 from public.locations where id=target and is_active and code in ('NORTE','SUL','LESTE','OESTE')) then raise exception 'Escolha Norte, Sul, Leste ou Oeste. A localização anterior está arquivada.' using errcode='22023';end if;
 return new;
end $$;
revoke all on function private.require_regional_location() from public,anon,authenticated;
create trigger balances_regional_location before insert or update of location_id on public.stock_balances for each row execute function private.require_regional_location();
create trigger products_regional_location before insert or update of default_location_id on public.products for each row execute function private.require_regional_location();
create or replace function public.inventory_api_version() returns integer language sql immutable security invoker set search_path='' as $$select 17$$;
revoke all on function public.inventory_api_version() from public,anon,authenticated;
grant execute on function public.inventory_api_version() to authenticated;
