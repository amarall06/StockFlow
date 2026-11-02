begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='administrator' limit 1),true);
set local role authenticated;
do $$
declare v_head public.inventory_layouts%rowtype;v_layout jsonb;v_caps jsonb;v_result jsonb;v_request uuid:=gen_random_uuid();v_bad jsonb;
begin
 select * into strict v_head from public.inventory_layouts where scenario_key='liber-inventory-v1';
 v_layout:=jsonb_set(v_head.layout,'{NORTE,x}','20');
 v_caps:=jsonb_set(v_head.capacities,'{NORTE}',jsonb_build_object('boxes',55,'basis','Caixa padrão'));
 v_result:=public.save_inventory_layout(v_head.revision,v_layout,v_caps,v_request);
 if (v_result->>'revision')::int<>v_head.revision+1 or (v_result#>>'{capacities,NORTE,boxes}')::int<>55 then raise exception 'Gravação não atualizou posição/capacidade';end if;
 if public.save_inventory_layout(v_head.revision,v_layout,v_caps,v_request)<>v_result then raise exception 'Repetição mudou confirmação';end if;
 perform public.save_inventory_layout(v_head.revision+1,v_layout,jsonb_set(v_caps,'{NORTE,boxes}','56'),gen_random_uuid());
 if public.save_inventory_layout(v_head.revision,v_layout,v_caps,v_request)<>v_result then raise exception 'Confirmação antiga não recuperada';end if;
 if (select revision from public.inventory_layouts)<>v_head.revision+2 then raise exception 'Recuperação antiga sobrescreveu versão nova';end if;
 begin
  perform public.save_inventory_layout(v_head.revision,v_layout,v_caps,gen_random_uuid());
  raise exception 'Versão antiga foi aceita';
 exception when serialization_failure then null;end;
 begin
  perform public.save_inventory_layout(v_head.revision,v_layout,jsonb_set(v_caps,'{NORTE,boxes}','57'),v_request);
  raise exception 'Identidade de confirmação foi reutilizada';
 exception when invalid_parameter_value then null;end;
 v_bad:=jsonb_set(v_layout,'{NORTE}',v_layout->'LESTE');
 begin
  perform public.save_inventory_layout(v_head.revision+2,v_bad,v_caps,gen_random_uuid());raise exception 'Sobreposição aceita';
 exception when invalid_parameter_value then null;end;
 begin
  perform public.save_inventory_layout(v_head.revision+2,jsonb_set(v_layout,'{NORTE,width}','100'),v_caps,gen_random_uuid());raise exception 'Limites da grade ignorados';
 exception when invalid_parameter_value then null;end;
 begin
  perform public.save_inventory_layout(v_head.revision+2,v_layout,jsonb_set(v_caps,'{NORTE,boxes}','0'),gen_random_uuid());raise exception 'Capacidade zero aceita';
 exception when invalid_parameter_value then null;end;
 begin
  perform public.save_inventory_layout(v_head.revision+2,v_layout,jsonb_set(v_caps,'{NORTE,boxes}','2.5'),gen_random_uuid());raise exception 'Capacidade fracionária aceita';
 exception when invalid_parameter_value then null;end;
 begin
  perform public.save_inventory_layout(v_head.revision+2,v_layout,jsonb_set(v_caps,'{NORTE,basis}','""'),gen_random_uuid());raise exception 'Referência vazia aceita';
 exception when invalid_parameter_value then null;end;
 begin
  update public.inventory_layouts set revision=revision+1;raise exception 'Update direto permitido';
 exception when insufficient_privilege then null;end;
 begin
  perform 1 from private.inventory_layout_requests;raise exception 'Registro privado exposto';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where is_active and role='viewer' limit 1),true);
set local role authenticated;
do $$ declare v_head public.inventory_layouts%rowtype;begin
 select * into strict v_head from public.inventory_layouts;
 begin
  perform public.save_inventory_layout(v_head.revision,v_head.layout,v_head.capacities,gen_random_uuid());raise exception 'Consulta gravou configuração';
 exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
do $$ begin
 if (select count(*) from public.inventory_layouts)<>0 then raise exception 'Sem perfil leu configuração';end if;
 begin
  perform public.save_inventory_layout(1,'{}','{}',gen_random_uuid());raise exception 'Sem perfil gravou configuração';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform 1 from public.inventory_layouts;raise exception 'Anônimo leu configuração';exception when insufficient_privilege then null;end;
 begin perform public.save_inventory_layout(1,'{}','{}',gen_random_uuid());raise exception 'Anônimo chamou gravação';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'Novos casos de planta/capacidade, versão, confirmação e permissões aprovados; alterações revertidas.' as new_test;
