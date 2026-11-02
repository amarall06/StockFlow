begin;
create table public.presentation_layouts (
 scenario_key text primary key references public.presentation_scenarios(scenario_key),
 revision integer not null check(revision>0),
 layout jsonb not null check(jsonb_typeof(layout)='object'),
 capacities jsonb not null check(jsonb_typeof(capacities)='object'),
 updated_at timestamptz not null default now(), updated_by uuid
);
alter table public.presentation_layouts enable row level security;
revoke all on public.presentation_layouts from public,anon,authenticated;
grant select on public.presentation_layouts to authenticated;
create policy company_layout_read on public.presentation_layouts for select to authenticated
 using ((select private.current_user_role()) is not null);
create table private.presentation_layout_requests (
 request_id uuid primary key, actor_id uuid not null,
 expected_revision integer not null, layout jsonb not null, capacities jsonb not null,
 result jsonb not null, created_at timestamptz not null default now()
);
alter table private.presentation_layout_requests enable row level security;
revoke all on private.presentation_layout_requests from public,anon,authenticated;
insert into public.presentation_layouts(scenario_key,revision,layout,capacities)
 select scenario_key,1,payload->'floorPlan',payload->'capacities' from public.presentation_scenarios
 where scenario_key='liber-presentation-v1';

create function private.save_presentation_layout(p_expected_revision integer,p_layout jsonb,p_capacities jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid := auth.uid(); v_head public.presentation_layouts%rowtype;
 v_request private.presentation_layout_requests%rowtype;
 v_code text; v_other text; v_field text; v_rack jsonb; v_second jsonb; v_cap jsonb; v_result jsonb;
begin
 if v_actor is null or private.current_user_role() is distinct from 'administrator'::public.app_role then
  raise exception 'Somente Administrador ativo pode salvar a configuração compartilhada.' using errcode='42501';
 end if;
 if p_request_id is null or p_expected_revision is null or p_expected_revision<1
  or jsonb_typeof(p_layout) is distinct from 'object' or jsonb_typeof(p_capacities) is distinct from 'object'
  or octet_length(p_layout::text)>4096 or octet_length(p_capacities::text)>4096 then
  raise exception 'Configuração compartilhada inválida.' using errcode='22023';
 end if;
 if (select count(*) from jsonb_object_keys(p_layout))<>4
  or exists(select 1 from jsonb_object_keys(p_layout) k where k not in ('NORTE','SUL','LESTE','OESTE'))
  or exists(select 1 from jsonb_object_keys(p_capacities) k where k not in ('NORTE','SUL','LESTE','OESTE')) then
  raise exception 'Prateleiras inválidas.' using errcode='22023';
 end if;
 foreach v_code in array array['NORTE','SUL','LESTE','OESTE'] loop
  v_rack:=p_layout->v_code;
  if jsonb_typeof(v_rack) is distinct from 'object' then raise exception 'Posição inválida.' using errcode='22023';end if;
  if (select count(*) from jsonb_object_keys(v_rack))<>4 then raise exception 'Campos da posição inválidos.' using errcode='22023';end if;
  foreach v_field in array array['x','y','width','height'] loop
   if jsonb_typeof(v_rack->v_field) is distinct from 'number' or (v_rack->>v_field)!~'^[0-9]+$' then
    raise exception 'Posições devem ser inteiras.' using errcode='22023';
   end if;
  end loop;
  if (v_rack->>'x')::numeric<0 or (v_rack->>'y')::numeric<0
   or (v_rack->>'width')::numeric<6 or (v_rack->>'height')::numeric<5
   or (v_rack->>'x')::numeric+(v_rack->>'width')::numeric>48
   or (v_rack->>'y')::numeric+(v_rack->>'height')::numeric>32 then
   raise exception 'A prateleira deve caber na planta.' using errcode='22023';
  end if;
  if p_capacities?v_code then
   v_cap:=p_capacities->v_code;
   if jsonb_typeof(v_cap) is distinct from 'object' then raise exception 'Capacidade inválida.' using errcode='22023';end if;
   if (select count(*) from jsonb_object_keys(v_cap))<>2 or jsonb_typeof(v_cap->'boxes') is distinct from 'number'
    or (v_cap->>'boxes')!~'^[0-9]+$' or jsonb_typeof(v_cap->'basis') is distinct from 'string' then
    raise exception 'Referência de capacidade inválida.' using errcode='22023';
   end if;
   if (v_cap->>'boxes')::numeric<1 or (v_cap->>'boxes')::numeric>2147483647
    or length(trim(v_cap->>'basis'))<1 or length(v_cap->>'basis')>120 then
    raise exception 'Capacidade positiva e referência de caixa obrigatórias.' using errcode='22023';
   end if;
  end if;
 end loop;
 foreach v_code in array array['NORTE','SUL','LESTE','OESTE'] loop
  foreach v_other in array array['NORTE','SUL','LESTE','OESTE'] loop
   if v_code<v_other then
    v_rack:=p_layout->v_code;v_second:=p_layout->v_other;
    if (v_rack->>'x')::int<(v_second->>'x')::int+(v_second->>'width')::int
     and (v_second->>'x')::int<(v_rack->>'x')::int+(v_rack->>'width')::int
     and (v_rack->>'y')::int<(v_second->>'y')::int+(v_second->>'height')::int
     and (v_second->>'y')::int<(v_rack->>'y')::int+(v_rack->>'height')::int then
      raise exception 'As prateleiras não podem ficar sobrepostas.' using errcode='22023';
    end if;
   end if;
  end loop;
 end loop;
 select * into strict v_head from public.presentation_layouts where scenario_key='liber-presentation-v1' for update;
 select * into v_request from private.presentation_layout_requests where request_id=p_request_id;
 if found then
  if v_request.actor_id<>v_actor or v_request.expected_revision<>p_expected_revision or v_request.layout<>p_layout or v_request.capacities<>p_capacities then
   raise exception 'A confirmação já pertence a outra alteração.' using errcode='22023';
  end if;
  return v_request.result;
 end if;
 if v_head.revision<>p_expected_revision then
  raise exception 'A configuração mudou em outro aparelho. Reabra a edição com a versão atual.' using errcode='40001';
 end if;
 update public.presentation_layouts set revision=revision+1,layout=p_layout,capacities=p_capacities,updated_at=clock_timestamp(),updated_by=v_actor
 where scenario_key=v_head.scenario_key returning to_jsonb(presentation_layouts.*) into v_result;
 insert into private.presentation_layout_requests(request_id,actor_id,expected_revision,layout,capacities,result)
 values(p_request_id,v_actor,p_expected_revision,p_layout,p_capacities,v_result);
 return v_result;
end $$;
revoke all on function private.save_presentation_layout(integer,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function private.save_presentation_layout(integer,jsonb,jsonb,uuid) to authenticated;
create function public.save_presentation_layout(p_expected_revision integer,p_layout jsonb,p_capacities jsonb,p_request_id uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select private.save_presentation_layout(p_expected_revision,p_layout,p_capacities,p_request_id);
$$;
revoke all on function public.save_presentation_layout(integer,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.save_presentation_layout(integer,jsonb,jsonb,uuid) to authenticated;
commit;
