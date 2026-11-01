-- Acesso da empresa por e-mails autorizados e indicadores reais. Preserva contas atuais.
begin;
create table private.company_allowed_emails (
  email text primary key check (email=lower(trim(email)) and email like '%@%'),
  created_at timestamptz not null default now()
);
alter table private.company_allowed_emails enable row level security;
revoke all on private.company_allowed_emails from public,anon,authenticated;
insert into private.company_allowed_emails(email)
 select distinct lower(trim(email)) from auth.users where nullif(trim(email),'') is not null;

create function private.require_company_email() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from private.company_allowed_emails where email=lower(trim(new.email))) then
    raise exception 'Cadastro restrito a endereços autorizados pela empresa.' using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function private.require_company_email() from public,anon,authenticated;
create trigger require_company_email_before_signup before insert on auth.users
 for each row execute function private.require_company_email();
-- O gatilho existente continua criando profiles INATIVOS e sem cargo administrativo.

create function public.inventory_activity_daily(p_category text default 'all',p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 v_today date := (statement_timestamp() at time zone 'America/Bahia')::date;
 v_start timestamptz;
 v_result jsonb;
begin
 if private.current_user_role() is null then
  raise exception 'Conta ativa necessária.' using errcode='42501';
 end if;
 if p_category is null or p_category not in ('all','shocks','springs') or p_days is null or p_days not in (7,30,90) then
  raise exception 'Filtro inválido.' using errcode='22023';
 end if;
 v_start := (v_today-(p_days-1))::timestamp at time zone 'America/Bahia';
 with days as (
  select v_today-(p_days-1)+n as day from generate_series(0,p_days-1) n
 ), activity as (
  select (m.created_at at time zone 'America/Bahia')::date as day,
   sum(m.quantity) filter(where m.movement_type='sale') as sold,
   sum(m.quantity) filter(where m.movement_type='receipt') as received
  from public.stock_movements m join public.products p on p.id=m.product_id
  where m.unit_type='box' and m.movement_type in ('sale','receipt')
   and m.created_at>=v_start and m.created_at<=statement_timestamp()
   and (p_category='all' or (p_category='springs' and split_part(p.code,'-',1) in ('MGM','MFI','MRE','MFR'))
    or (p_category='shocks' and split_part(p.code,'-',1) not in ('MGM','MFI','MRE','MFR')))
  group by 1
 ) select jsonb_agg(jsonb_build_object('day',d.day,'sold_boxes',coalesce(a.sold,0),'received_boxes',coalesce(a.received,0)) order by d.day)
 into v_result from days d left join activity a using(day);
 return v_result;
end $$;
revoke all on function public.inventory_activity_daily(text,integer) from public,anon;
grant execute on function public.inventory_activity_daily(text,integer) to authenticated;
do $$ begin
 if public.inventory_api_version()<16 then
  execute $v$create or replace function public.inventory_api_version() returns integer
   language sql immutable security definer set search_path='' as 'select 16'$v$;
 end if;
end $$;
commit;
