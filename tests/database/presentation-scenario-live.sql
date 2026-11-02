begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role is not null limit 1),true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.presentation_scenarios where scenario_key='liber-presentation-v1') <> 1 then raise exception 'Conta ativa não leu cenário'; end if;
  begin
    update public.presentation_scenarios set revision=1 where scenario_key='liber-presentation-v1';
    raise exception 'Escrita de navegador foi permitida';
  exception when insufficient_privilege then null;end;
  begin
    delete from public.presentation_scenarios where scenario_key='liber-presentation-v1';
    raise exception 'Exclusão de navegador foi permitida';
  exception when insufficient_privilege then null;end;
  begin
    insert into public.presentation_scenarios(scenario_key,revision,payload) values ('liber-presentation-v1',1,'{}');
    raise exception 'Inclusão de navegador foi permitida';
  exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
do $$ begin
 if (select count(*) from public.presentation_scenarios) <> 0 then raise exception 'Conta sem perfil leu cenário';end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin
   perform 1 from public.presentation_scenarios;
   raise exception 'Anônimo leu cenário';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select jsonb_build_object('active_read',true,'browser_writes_blocked',true,'inactive_read_blocked',true,'anonymous_read_blocked',true,'scenario_rows',(select count(*) from public.presentation_scenarios),'boxes',(select sum((row->>'boxes')::int) from public.presentation_scenarios s,jsonb_array_elements(s.payload->'stock') row)) as new_test;
rollback;
