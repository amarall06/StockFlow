insert into private.company_allowed_emails(email)
values ('reservation-a@test.invalid'), ('reservation-b@test.invalid');
insert into auth.users(id,email) values
 ('11111111-1111-4111-8111-111111111111','reservation-a@test.invalid'),
 ('22222222-2222-4222-8222-222222222222','reservation-b@test.invalid');
update public.profiles set is_active=true, display_name='Conta simulada', role='administrator'
where id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
insert into public.products(code,application) values ('AGM-100','Reserva simulada');
insert into public.stock_balances(id,product_id,location_id,status_code,unit_type,quantity)
select '33333333-3333-4333-8333-333333333333',p.id,l.id,'released_for_sale','box',1
from public.products p cross join public.locations l where p.code='AGM-100' and l.code='NORTE';
