begin;
-- Sinais reais criados dentro da transação; nenhum deles é publicado após ROLLBACK.
do $$ declare before_count integer; after_count integer; message realtime.messages;begin
 select count(*) into before_count from realtime.messages where topic='inventory:changes';
 update public.presentation_layouts set updated_at=updated_at;
 select count(*) into after_count from realtime.messages where topic='inventory:changes';
 if after_count<>before_count+1 then raise exception 'Alteração da planta não criou sinal';end if;
 select * into strict message from realtime.messages where topic='inventory:changes' order by inserted_at desc limit 1;
 perform set_config('liber.broadcast_test_message_id',message.id::text,true);
 if message.event<>'inventory_changed' or not message.private or message.extension<>'broadcast' or message.payload->>'source'<>'database'
   or (message.payload-'source'-'id')<>'{}'::jsonb then raise exception 'Sinal expôs dados ou foi publicado sem privacidade';end if;
 update public.presentation_layouts set updated_at=updated_at;
 if (select count(*) from realtime.messages where topic='inventory:changes')<>after_count then raise exception 'Transação emitiu sinais duplicados';end if;
 if (select count(*) from pg_trigger where tgname='inventory_private_broadcast' and not tgisinternal)<>16 then raise exception 'Cobertura das tabelas incompleta';end if;
end $$;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='viewer' limit 1),true);
select set_config('realtime.topic','inventory:changes',true);
set local role authenticated;
do $$ begin
 if not exists(select 1 from realtime.messages where id=current_setting('liber.broadcast_test_message_id')::uuid) then raise exception 'Consulta ativa não recebeu sinal';end if;
 begin
  insert into realtime.messages(topic,extension,payload,event,private) values('inventory:changes','broadcast','{}','inventory_changed',true);
  raise exception 'Cliente conseguiu enviar sinal';
 exception when insufficient_privilege then null;end;
 begin perform private.notify_inventory_changed();raise exception 'Cliente invocou gatilho';exception when insufficient_privilege then null;end;
end $$;
select set_config('realtime.topic','outro:topico',true);
do $$ begin if exists(select 1 from realtime.messages) then raise exception 'Leitura em outro tópico permitida';end if;end $$;
select set_config('realtime.topic','inventory:changes',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
do $$ begin if exists(select 1 from realtime.messages) then raise exception 'Sem perfil recebeu sinal';end if;end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' limit 1),true);
set local role authenticated;
select public.save_team_access(id,access_revision,role,false,coalesce(nullif(display_name,''),'Consulta de validação'),gen_random_uuid()) is not null as temporary_suspension from public.profiles where role='viewer' limit 1;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='viewer' limit 1),true);
set local role authenticated;
do $$ begin if exists(select 1 from realtime.messages) then raise exception 'Inativo recebeu sinal';end if;end $$;
reset role;
set local role anon;
do $$ begin
 begin if exists(select 1 from realtime.messages) then raise exception 'Anônimo recebeu sinal';end if;
 exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'Novos casos de emissão privada, agrupamento e autorização aprovados; alterações revertidas.' as result;
