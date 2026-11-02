begin;
do $$
declare member record; permission record;
begin
 for member in select id,role from public.profiles where is_active loop
   select * into strict permission from realtime.authorize(
     'authenticated','inventory:changes',jsonb_build_object('role','authenticated','sub',member.id)::text,
     member.id::text,'{}',array['broadcast','presence'],array['broadcast']
   );
   if permission.read_allowed<>array[true,false] or permission.write_allowed<>array[false] then
     raise exception 'Sonda não autorizou apenas leitura Broadcast para %',member.role;
   end if;
   select * into strict permission from realtime.authorize(
     'authenticated','outro:topico',jsonb_build_object('role','authenticated','sub',member.id)::text,
     member.id::text,'{}',array['broadcast'],array['broadcast']
   );
   if permission.read_allowed<>array[false] or permission.write_allowed<>array[false] then raise exception 'Sonda autorizou outro tópico';end if;
 end loop;
 select * into strict permission from realtime.authorize(
   'authenticated','inventory:changes','{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000099"}',
   '00000000-0000-4000-8000-000000000099','{}',array['broadcast'],array['broadcast']
 );
 if permission.read_allowed<>array[false] or permission.write_allowed<>array[false] then raise exception 'Sonda autorizou conta sem perfil';end if;
end $$;
rollback;
select 'Novos casos da função real de autorização Realtime aprovados; sondas revertidas.' as result;
