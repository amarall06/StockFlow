-- Lote fictício autorizado pelo proprietário. Não executado automaticamente na aplicação.
-- Transação única: falhas desfazem todo o lote. Códigos existentes são preservados.
begin;
select pg_advisory_xact_lock(hashtextextended('stockflow:demo-stock-88:v1',0));
create temporary table demo_stock_candidates (
 code text primary key, manufacturer text not null, location text not null,
 quantity integer not null check(quantity between 51 and 150)
) on commit drop;
insert into demo_stock_candidates values
 ('AVW-04','Volkswagen','SUL',51),
 ('AVW-12','Volkswagen','NORTE',68),
 ('AVW-27','Volkswagen','LESTE',85),
 ('AVW-38','Volkswagen','OESTE',102),
 ('AVW-59','Volkswagen','SUL',119),
 ('AVW-64','Volkswagen','NORTE',136),
 ('AVW-76','Volkswagen','LESTE',53),
 ('AVW-93','Volkswagen','OESTE',70),
 ('AFI-08','Fiat','SUL',87),
 ('AFI-20','Fiat','NORTE',104),
 ('AFI-21','Fiat','LESTE',121),
 ('AFI-35','Fiat','OESTE',138),
 ('AFI-43','Fiat','SUL',55),
 ('AFI-56','Fiat','NORTE',72),
 ('AFI-72','Fiat','LESTE',89),
 ('AFI-91','Fiat','OESTE',106),
 ('ARE-06','Renault','SUL',123),
 ('ARE-14','Renault','NORTE',140),
 ('ARE-23','Renault','LESTE',57),
 ('ARE-37','Renault','OESTE',74),
 ('ARE-48','Renault','SUL',91),
 ('ARE-61','Renault','NORTE',108),
 ('ARE-79','Renault','LESTE',125),
 ('ARE-96','Renault','OESTE',142),
 ('ACI-03','Citroën','SUL',59),
 ('ACI-11','Citroën','NORTE',76),
 ('ACI-26','Citroën','LESTE',93),
 ('ACI-34','Citroën','OESTE',110),
 ('ACI-47','Citroën','SUL',127),
 ('ACI-58','Citroën','NORTE',144),
 ('ACI-73','Citroën','LESTE',61),
 ('ACI-88','Citroën','OESTE',78),
 ('AHO-07','Honda','SUL',95),
 ('AHO-16','Honda','NORTE',112),
 ('AHO-24','Honda','LESTE',129),
 ('AHO-39','Honda','OESTE',146),
 ('AHO-52','Honda','SUL',63),
 ('AHO-63','Honda','NORTE',80),
 ('AHO-81','Honda','LESTE',97),
 ('AHO-94','Honda','OESTE',114),
 ('AKI-05','Kia','SUL',131),
 ('AKI-18','Kia','NORTE',148),
 ('AKI-29','Kia','LESTE',65),
 ('AKI-41','Kia','OESTE',82),
 ('AKI-54','Kia','SUL',99),
 ('AKI-67','Kia','NORTE',116),
 ('AKI-78','Kia','LESTE',133),
 ('AKI-92','Kia','OESTE',150),
 ('AFR-09','Ford','SUL',67),
 ('AFR-17','Ford','NORTE',84),
 ('AFR-28','Ford','LESTE',101),
 ('AFR-34','Ford','OESTE',118),
 ('AFR-46','Ford','SUL',135),
 ('AFR-64','Ford','NORTE',52),
 ('AFR-75','Ford','LESTE',69),
 ('AFR-89','Ford','OESTE',86),
 ('AGM-02','Chevrolet','SUL',103),
 ('AGM-15','Chevrolet','NORTE',120),
 ('AGM-25','Chevrolet','LESTE',137),
 ('AGM-35','Chevrolet','OESTE',54),
 ('AGM-49','Chevrolet','SUL',71),
 ('AGM-62','Chevrolet','NORTE',88),
 ('AGM-77','Chevrolet','LESTE',105),
 ('AGM-95','Chevrolet','OESTE',122),
 ('AJE-02','Jeep','SUL',139),
 ('AJE-13','Jeep','NORTE',56),
 ('AJE-22','Jeep','LESTE',73),
 ('AJE-36','Jeep','OESTE',90),
 ('AJE-51','Jeep','SUL',107),
 ('AJE-66','Jeep','NORTE',124),
 ('AJE-83','Jeep','LESTE',141),
 ('AJE-97','Jeep','OESTE',58),
 ('AJC-04','JAC','SUL',75),
 ('AJC-19','JAC','NORTE',92),
 ('AJC-31','JAC','LESTE',109),
 ('AJC-42','JAC','OESTE',126),
 ('AJC-55','JAC','SUL',143),
 ('AJC-68','JAC','NORTE',60),
 ('AJC-74','JAC','LESTE',77),
 ('AJC-86','JAC','OESTE',94),
 ('AHY-06','Hyundai','SUL',111),
 ('AHY-18','Hyundai','NORTE',128),
 ('AHY-32','Hyundai','LESTE',145),
 ('AHY-44','Hyundai','OESTE',62),
 ('AHY-57','Hyundai','SUL',79),
 ('AHY-69','Hyundai','NORTE',96),
 ('AHY-82','Hyundai','LESTE',113),
 ('AHY-98','Hyundai','OESTE',130);
-- Uma prateleira inativa é um bloqueio deliberado; não é reativada silenciosamente.
do $$ begin
 if exists(select 1 from public.locations where code in ('SUL','NORTE','LESTE','OESTE') and not is_active) then
  raise exception 'Há uma prateleira do lote inativa; importação cancelada.';
 end if;
end $$;
insert into public.locations(code)
 values ('SUL'),('NORTE'),('LESTE'),('OESTE') on conflict(code) do nothing;
create temporary table demo_stock_created on commit drop as
 with inserted as (
  insert into public.products(code,application,default_location_id)
   select c.code,'[DEMONSTRAÇÃO] '||c.manufacturer||' — aplicação, posição e lado a confirmar',l.id
   from demo_stock_candidates c join public.locations l on l.code=c.location and l.is_active
   order by c.code
   on conflict(code) do nothing
   returning id,code
 )
 select i.id as product_id,c.code,l.id as location_id,c.quantity,gen_random_uuid() as movement_id
 from inserted i join demo_stock_candidates c on c.code=i.code
 join public.locations l on l.code=c.location;
insert into public.stock_balances(product_id,location_id,status_code,unit_type,quantity)
 select product_id,location_id,'awaiting_test','box',quantity from demo_stock_created;
insert into public.stock_movements(id,product_id,movement_type,unit_type,quantity,status_after,to_location_id,notes)
 select movement_id,product_id,'receipt','box',quantity,'awaiting_test',location_id,
 'DEMONSTRAÇÃO: lote demo-stock-88-v1; quantidades fictícias autorizadas pelo proprietário via administração do banco.'
 from demo_stock_created;
insert into private.demo_stock_import_items(batch_id,product_id,movement_id,quantity)
 select 'demo-stock-88-v1',product_id,movement_id,quantity from demo_stock_created;
commit;
-- Resultado persistente; executar novamente não soma caixas aos produtos existentes.
select count(*) as imported_products,coalesce(sum(quantity),0) as imported_boxes
 from private.demo_stock_import_items where batch_id='demo-stock-88-v1';
