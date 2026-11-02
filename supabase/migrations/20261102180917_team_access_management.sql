-- Gestão das contas existentes; não cria credenciais nem altera saldos.
alter table public.profiles add column access_revision integer not null default 1 check (access_revision > 0);
create function private.bump_profile_access_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.access_revision := old.access_revision + 1;
  return new;
end $$;
revoke all on function private.bump_profile_access_revision() from public, anon, authenticated;
create trigger profiles_access_revision before update on public.profiles
for each row execute function private.bump_profile_access_revision();

create table private.team_access_requests (
  request_id uuid primary key, actor_id uuid not null, target_id uuid not null,
  expected_revision integer not null, requested_role public.app_role not null,
  requested_active boolean not null, requested_name text not null,
  before_state jsonb not null, result jsonb not null,
  created_at timestamptz not null default now()
);
alter table private.team_access_requests enable row level security;
revoke all on private.team_access_requests from public, anon, authenticated;

-- As políticas de leitura existentes continuam vigentes. Escritas passam pela RPC.
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
create function private.save_team_access(p_target_id uuid, p_expected_revision integer,
  p_role public.app_role, p_active boolean, p_display_name text, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid(); previous public.profiles; updated public.profiles;
  receipt private.team_access_requests; normalized text := btrim(p_display_name);
begin
  -- Serializa alterações de acesso: um administrador suspenso não pode terminar
  -- uma alteração concorrente com a autorização que possuía antes da suspensão.
  perform pg_advisory_xact_lock(165127, 4);
  if actor is null or private.current_user_role() is distinct from 'administrator'::public.app_role then
    raise exception 'Somente Administrador ativo pode gerenciar a equipe.' using errcode='42501';
  end if;
  if p_target_id is null or p_target_id = actor then
    raise exception 'Sua própria função e ativação são preservadas. Use Meu perfil para alterar seu nome.' using errcode='22023';
  end if;
  if p_expected_revision is null or p_expected_revision < 1 or p_role is null or p_active is null
    or normalized is null or length(normalized) not between 1 and 80 or p_request_id is null then
    raise exception 'Dados de acesso inválidos.' using errcode='22023';
  end if;
  select * into receipt from private.team_access_requests where request_id=p_request_id;
  if found then
    if receipt.actor_id<>actor or receipt.target_id<>p_target_id or receipt.expected_revision<>p_expected_revision
      or receipt.requested_role<>p_role or receipt.requested_active<>p_active or receipt.requested_name<>normalized then
      raise exception 'Identificação da confirmação já utilizada.' using errcode='22023';
    end if;
    return receipt.result;
  end if;
  select * into previous from public.profiles where id=p_target_id for update;
  if not found then raise exception 'Conta não encontrada.' using errcode='22023'; end if;
  if previous.access_revision<>p_expected_revision then
    raise exception 'O acesso mudou em outra janela. Consulte novamente antes de editar.' using errcode='40001';
  end if;
  update public.profiles set role=p_role, is_active=p_active, display_name=normalized
  where id=p_target_id returning * into updated;
  insert into private.team_access_requests(request_id,actor_id,target_id,expected_revision,requested_role,requested_active,requested_name,before_state,result)
  values(p_request_id,actor,p_target_id,p_expected_revision,p_role,p_active,normalized,to_jsonb(previous),to_jsonb(updated));
  return to_jsonb(updated);
end $$;
revoke all on function private.save_team_access(uuid,integer,public.app_role,boolean,text,uuid) from public,anon,authenticated;
grant execute on function private.save_team_access(uuid,integer,public.app_role,boolean,text,uuid) to authenticated;
create function public.save_team_access(p_target_id uuid, p_expected_revision integer,
  p_role public.app_role, p_active boolean, p_display_name text, p_request_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.save_team_access(p_target_id,p_expected_revision,p_role,p_active,p_display_name,p_request_id)
$$;
revoke all on function public.save_team_access(uuid,integer,public.app_role,boolean,text,uuid) from public,anon,authenticated;
grant execute on function public.save_team_access(uuid,integer,public.app_role,boolean,text,uuid) to authenticated;
