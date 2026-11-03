begin;
create table public.presentation_recurrence_rules (
 scenario_key text primary key check(scenario_key='liber-presentation-v1'),
 revision integer not null check(revision>0),
 occurrences integer not null check(occurrences between 2 and 100),
 days integer not null check(days between 1 and 3650),
 updated_at timestamptz not null default now(), updated_by uuid
);
alter table public.presentation_recurrence_rules enable row level security;
revoke all on public.presentation_recurrence_rules from public,anon,authenticated;
grant select on public.presentation_recurrence_rules to authenticated;
create policy active_profiles_read_recurrence on public.presentation_recurrence_rules for select to authenticated
 using ((select private.current_user_role()) is not null);
-- Mesma regra padrão do detector anterior; configurações locais não são importadas.
insert into public.presentation_recurrence_rules(scenario_key,revision,occurrences,days)
 values('liber-presentation-v1',1,3,30);
create table private.presentation_recurrence_requests (
 request_id uuid primary key, actor_id uuid not null, expected_revision integer not null,
 occurrences integer not null, days integer not null, result jsonb not null,
 created_at timestamptz not null default now()
);
alter table private.presentation_recurrence_requests enable row level security;
revoke all on private.presentation_recurrence_requests from public,anon,authenticated;
create function private.save_presentation_recurrence_rule(p_expected_revision integer,p_occurrences integer,p_days integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid:=auth.uid();v_head public.presentation_recurrence_rules%rowtype;
 v_previous private.presentation_recurrence_requests%rowtype;v_result jsonb;
begin
 if v_actor is null or private.current_user_role() is distinct from 'administrator'::public.app_role then
  raise exception 'Somente Administrador ativo pode configurar a recorrência.' using errcode='42501';
 end if;
 if p_expected_revision is null or p_expected_revision<1 or p_request_id is null
  or p_occurrences is null or p_occurrences not between 2 and 100 or p_days is null or p_days not between 1 and 3650 then
  raise exception 'Regra de recorrência inválida.' using errcode='22023';
 end if;
 select * into strict v_head from public.presentation_recurrence_rules where scenario_key='liber-presentation-v1' for update;
 select * into v_previous from private.presentation_recurrence_requests where request_id=p_request_id;
 if found then
  if v_previous.actor_id<>v_actor or v_previous.expected_revision<>p_expected_revision or v_previous.occurrences<>p_occurrences or v_previous.days<>p_days then
   raise exception 'Confirmação já usada para outra alteração.' using errcode='22023';
  end if;
  return v_previous.result;
 end if;
 if v_head.revision<>p_expected_revision then raise exception 'Regra alterada em outro aparelho.' using errcode='40001';end if;
 update public.presentation_recurrence_rules set revision=revision+1,occurrences=p_occurrences,days=p_days,updated_at=clock_timestamp(),updated_by=v_actor
 where scenario_key=v_head.scenario_key returning to_jsonb(presentation_recurrence_rules.*) into v_result;
 insert into private.presentation_recurrence_requests(request_id,actor_id,expected_revision,occurrences,days,result)
 values(p_request_id,v_actor,p_expected_revision,p_occurrences,p_days,v_result);
 return v_result;
end $$;
revoke all on function private.save_presentation_recurrence_rule(integer,integer,integer,uuid) from public,anon,authenticated;
grant execute on function private.save_presentation_recurrence_rule(integer,integer,integer,uuid) to authenticated;
create function public.save_presentation_recurrence_rule(p_expected_revision integer,p_occurrences integer,p_days integer,p_request_id uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select private.save_presentation_recurrence_rule(p_expected_revision,p_occurrences,p_days,p_request_id);
$$;
revoke all on function public.save_presentation_recurrence_rule(integer,integer,integer,uuid) from public,anon,authenticated;
grant execute on function public.save_presentation_recurrence_rule(integer,integer,integer,uuid) to authenticated;
create trigger recurrence_private_broadcast after insert or update or delete on public.presentation_recurrence_rules for each statement execute function private.notify_inventory_changed();
commit;
