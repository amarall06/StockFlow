begin;

create table private.box_reservations (
  id uuid primary key,
  actor_id uuid not null,
  balance_id uuid not null,
  boxes integer not null check (boxes > 0),
  state text not null default 'reserved' check (state in ('reserved','cancelled','confirmed')),
  expires_at timestamptz not null default (clock_timestamp() + interval '15 minutes'),
  movement jsonb
);
create index box_reservations_active_balance on private.box_reservations(balance_id)
  where state = 'reserved';
alter table private.box_reservations enable row level security;
revoke all on private.box_reservations from public, anon, authenticated;

create function private.protect_reserved_boxes() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  remaining integer := 0;
begin
  if tg_op = 'UPDATE' and
    (new.id,new.product_id,new.location_id,new.status_code,new.unit_type) =
    (old.id,old.product_id,old.location_id,old.status_code,old.unit_type) then
    remaining := new.quantity;
  end if;
  if remaining < old.quantity and remaining < (
    select coalesce(sum(boxes),0) from private.box_reservations
    where balance_id = old.id and state = 'reserved' and expires_at > clock_timestamp()
  ) then
    raise exception 'Há caixas reservadas neste saldo.' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.protect_reserved_boxes() from public, anon, authenticated;
create trigger protect_reserved_boxes before update or delete on public.stock_balances
for each row execute function private.protect_reserved_boxes();

create function private.reserve_stock_boxes(p_id uuid, p_balance uuid, p_boxes integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  balance public.stock_balances%rowtype;
  reservation private.box_reservations%rowtype;
begin
  if private.current_user_role() is distinct from 'administrator'::public.app_role then
    raise exception 'Operação restrita a administradores.' using errcode = '42501';
  end if;
  if p_id is null or p_balance is null or p_boxes is null or p_boxes < 1 then
    raise exception 'Reserva inválida.' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text, 1));
  select * into reservation from private.box_reservations where id = p_id;
  if found then
    if (reservation.actor_id,reservation.balance_id,reservation.boxes)
      is distinct from (auth.uid(),p_balance,p_boxes) then
      raise exception 'Identificador de reserva já utilizado.' using errcode = '22023';
    end if;
    return to_jsonb(reservation);
  end if;
  select b.* into balance from public.stock_balances b
    join public.locations l on l.id = b.location_id and l.is_active
    where b.id = p_balance and b.unit_type = 'box'
      and b.status_code in ('released_for_sale','in_stock')
    for update of b;
  if not found or p_boxes > balance.quantity then
    raise exception 'Saldo disponível insuficiente.' using errcode = 'P0001';
  end if;
  if p_boxes + (select coalesce(sum(boxes),0) from private.box_reservations
    where balance_id = p_balance and state = 'reserved' and expires_at > clock_timestamp()) > balance.quantity then
    raise exception 'Esta caixa já foi reservada por outra pessoa.' using errcode = 'P0001';
  end if;
  insert into private.box_reservations (id,actor_id,balance_id,boxes)
    values (p_id,auth.uid(),p_balance,p_boxes) returning * into reservation;
  return to_jsonb(reservation);
end;
$$;

create function private.finish_stock_reservation(p_id uuid, p_confirm boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  reservation private.box_reservations%rowtype;
  origin record;
  saved_movement jsonb;
begin
  if private.current_user_role() is distinct from 'administrator'::public.app_role then
    raise exception 'Operação restrita a administradores.' using errcode = '42501';
  end if;
  if p_confirm is null then raise exception 'Decisão inválida.' using errcode = '22023'; end if;
  select * into reservation from private.box_reservations
    where id = p_id and actor_id = auth.uid() for update;
  if not found then raise exception 'Reserva indisponível.' using errcode = 'P0002'; end if;
  if reservation.state = 'reserved' then
    if p_confirm then
      select p.code, l.code as location, b.status_code into origin
        from public.stock_balances b join public.products p on p.id=b.product_id
        join public.locations l on l.id=b.location_id where b.id=reservation.balance_id for update of b;
      if not found or reservation.expires_at <= clock_timestamp() then
        raise exception 'Reserva expirada ou indisponível.' using errcode = 'P0001';
      end if;
    end if;
    update private.box_reservations set state = case when p_confirm then 'confirmed' else 'cancelled' end
      where id = p_id returning * into reservation;
    if p_confirm then
      saved_movement := private.register_stock_outflow(origin.code,origin.location,origin.status_code,
        reservation.boxes,'sale',null,null,p_id);
      update private.box_reservations set movement = saved_movement
        where id = p_id returning * into reservation;
    end if;
  end if;
  return to_jsonb(reservation);
end;
$$;

create function public.reserve_stock_boxes(p_id uuid,p_balance uuid,p_boxes integer)
returns jsonb language sql security invoker set search_path = ''
begin atomic select private.reserve_stock_boxes(p_id,p_balance,p_boxes); end;
create function public.finish_stock_reservation(p_id uuid,p_confirm boolean)
returns jsonb language sql security invoker set search_path = ''
begin atomic select private.finish_stock_reservation(p_id,p_confirm); end;

revoke all on function private.reserve_stock_boxes(uuid,uuid,integer), private.finish_stock_reservation(uuid,boolean),
  public.reserve_stock_boxes(uuid,uuid,integer), public.finish_stock_reservation(uuid,boolean)
  from public, anon, authenticated;
grant execute on function private.reserve_stock_boxes(uuid,uuid,integer), private.finish_stock_reservation(uuid,boolean),
  public.reserve_stock_boxes(uuid,uuid,integer), public.finish_stock_reservation(uuid,boolean) to authenticated;
create trigger broadcast_box_reservations after insert or update on private.box_reservations
for each statement execute function private.notify_inventory_changed();

create function private.available_stock_boxes()
returns table(balance_id uuid, reserved_boxes integer)
language sql security definer set search_path = ''
as $$
  select r.balance_id, sum(r.boxes)::integer
  from private.box_reservations r
  where r.state = 'reserved' and r.expires_at > statement_timestamp()
    and private.current_user_role() is not null
  group by r.balance_id
$$;
create function public.available_stock_boxes()
returns table(balance_id uuid, reserved_boxes integer)
language sql security invoker set search_path = ''
begin atomic select * from private.available_stock_boxes(); end;
revoke all on function private.available_stock_boxes(), public.available_stock_boxes() from public, anon, authenticated;
grant execute on function private.available_stock_boxes(), public.available_stock_boxes() to authenticated;
create or replace function public.inventory_api_version() returns integer
language sql immutable security invoker set search_path = '' as $$ select 18 $$;
commit;
