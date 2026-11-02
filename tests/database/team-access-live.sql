begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' limit 1),true);
set local role authenticated;
do $$
declare target public.profiles; receipt jsonb; request uuid:=gen_random_uuid(); actor uuid:=auth.uid();
begin
  select * into strict target from public.profiles where id<>actor order by id limit 1;
  receipt:=public.save_team_access(target.id,target.access_revision,'tester',true,'Testador temporário de validação',request);
  if receipt->>'role'<>'tester' or (receipt->>'access_revision')::int<>target.access_revision+1 then raise exception 'Acesso não atualizado';end if;
  if public.save_team_access(target.id,target.access_revision,'tester',true,'Testador temporário de validação',request)<>receipt then raise exception 'Confirmação não recuperada';end if;
  begin perform public.save_team_access(target.id,target.access_revision,'viewer',true,'Outro',gen_random_uuid());raise exception 'Versão antiga aceita';exception when serialization_failure then null;end;
  begin perform public.save_team_access(target.id,target.access_revision,'viewer',true,'Outro',request);raise exception 'UUID reutilizado';exception when invalid_parameter_value then null;end;
  begin perform public.save_team_access(actor,1,'viewer',false,'Própria',gen_random_uuid());raise exception 'Autossuspensão aceita';exception when invalid_parameter_value then null;end;
  begin perform public.save_team_access(target.id,target.access_revision+1,'tester',true,'  ',gen_random_uuid());raise exception 'Nome vazio aceito';exception when invalid_parameter_value then null;end;
  perform public.save_team_access(target.id,target.access_revision+1,'viewer',false,'Conta suspensa temporária',gen_random_uuid());
  if public.save_team_access(target.id,target.access_revision,'tester',true,'Testador temporário de validação',request)<>receipt then raise exception 'Confirmação anterior perdida';end if;
  if (select is_active from public.profiles where id=target.id) then raise exception 'Recuperação reativou conta';end if;
  begin update public.profiles set role='administrator' where id=target.id;raise exception 'Atualização direta permitida';exception when insufficient_privilege then null;end;
  begin delete from public.profiles where id=target.id;raise exception 'Exclusão direta permitida';exception when insufficient_privilege then null;end;
  begin perform 1 from private.team_access_requests;raise exception 'Auditoria exposta';exception when insufficient_privilege then null;end;
  -- Compatibilidade inédita com a nova revogação/trigger: nome próprio continua editável.
  perform public.update_own_display_name('Administrador temporário de validação');
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where not is_active limit 1),true);
set local role authenticated;
do $$ begin
  begin perform public.save_team_access(gen_random_uuid(),1,'tester',true,'Teste',gen_random_uuid());raise exception 'Inativo gerenciou acesso';exception when insufficient_privilege then null;end;
end $$;
reset role;
-- Reativa apenas dentro da transação para validar um perfil Consulta ativo.
update public.profiles set is_active=true where role='viewer';
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='viewer' limit 1),true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.profiles)<>1 then raise exception 'Consulta leu equipe inteira';end if;
  begin perform public.save_team_access(gen_random_uuid(),1,'tester',true,'Teste',gen_random_uuid());raise exception 'Consulta gerenciou acesso';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform 1 from public.profiles;raise exception 'Anônimo leu perfis';exception when insufficient_privilege then null;end;
  begin perform public.save_team_access(gen_random_uuid(),1,'tester',true,'Teste',gen_random_uuid());raise exception 'Anônimo chamou RPC';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'Novos casos de gestão de equipe aprovados; contas e auditoria de teste revertidas.' as result;
