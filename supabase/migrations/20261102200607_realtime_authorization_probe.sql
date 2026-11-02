-- O serviço insere uma sonda com private=false antes de avaliar SELECT.
-- A privacidade do envio permanece em realtime.send(...,true) e no canal.
alter policy inventory_private_broadcast_read on realtime.messages using (
  (select private.current_user_role()) is not null
  and (select realtime.topic()) = 'inventory:changes'
  and topic = 'inventory:changes' and extension = 'broadcast'
);
