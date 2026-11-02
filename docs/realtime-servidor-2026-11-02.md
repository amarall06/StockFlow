# Anotação 16 — emissão privada ativada — 02/11/2026

## Implementação

O Supabase agora emite inventory_changed no tópico privado inventory:changes após escritas nas 16 tabelas de cadastros, saldos, movimentos, testagens, Garantia e configuração da apresentação. Um sinal por transação, sem nomes, linhas de estoque nem quantidades: somente source=database e identidade gerada pelo serviço. O aviso é confirmado junto da transação; rollback não publica o evento.

O receptor do site já existia. Continua invalidando consultas autorizadas, sem aplicar o conteúdo recebido ao estoque. Sua simulação aprovada anteriormente não foi repetida. Consulta periódica/foco/reconexão permanecem como recuperação quando não há canal ou uma mensagem é perdida. Não é garantia de entrega de todo evento nem fila de operações.

SharedShelfLayout agora também escuta a invalidação, agrupa rajadas por 150ms e consulta a configuração. Mantém edição congelada, ignora payload como fonte de capacidades, respeita conexão/visibilidade e remove listener/temporizador ao sair.

Política SELECT somente para perfil ativo, tópico correto e Broadcast. Nenhuma política INSERT para clientes: eles não podem enviar avisos. A validação usa o perfil no banco, não metadados editáveis de JWT. O serviço mantém autorização do canal em cache até renovação/conexão; suspensão continua sendo verificada em cada nova leitura/operação protegida. Os sinais não contêm dados empresariais.

## Compatibilidade da autorização

A primeira política também verificava private=true na linha. A revisão do protocolo encontrou que a sonda interna tem private=false por padrão. A migração seguinte remove essa condição da política de leitura; o envio real e o canal continuam privados. Foi usado realtime.authorize do próprio projeto para verificar o caminho real de autorização, não apenas uma linha criada por realtime.send.

Referências oficiais: [Broadcast](https://supabase.com/docs/guides/realtime/broadcast), [autorização](https://supabase.com/docs/guides/realtime/authorization) e [implementação da sonda](https://github.com/supabase/realtime/blob/master/lib/realtime/tenants/authorization.ex).

## Arquivos

- supabase/migrations/20261102181608_inventory_private_broadcast.sql: gatilho privado, agrupamento e política inicial.
- supabase/migrations/20261102200607_realtime_authorization_probe.sql: política compatível com a sonda do serviço.
- src/components/SharedShelfLayout.tsx: atualização instantânea da configuração.

## Somente testes novos

- tests/database/inventory-broadcast-live.sql: sinal real no banco, payload mínimo/privado, um por transação, cobertura de 16 tabelas; leitura por Consulta, escrita/invocação de gatilho negadas, outros tópicos/sem perfil/inativo/anônimo bloqueados. ROLLBACK aprovado. A primeira chamada expirou sem execução; a chamada seguinte, com suspensão temporária pela RPC autorizada, foi aprovada.
- tests/database/realtime-authorization-probe-live.sql: função real realtime.authorize para as duas contas existentes. Apenas Broadcast pode ser recebido; Presence, envio, tópico diferente e perfil inexistente negados. Sondas revertidas. Aprovado.
- tests/browser/shared-layout-broadcast.spec.ts: dois casos novos aprovados, usando transporte WebSocket simulado: rajada de dez avisos produz uma leitura, atualiza a configuração consultada sem aceitar capacidade do payload, preserva editor; conexão/limpeza respeitadas. Não representa dois aparelhos físicos autenticados.

Build e análise direcionada aprovados. Nenhum teste anteriormente concluído foi repetido. Os 95 produtos, 113 movimentos, duas contas com funções/ativação/versão originais e hash de saldos dfa96a2fa33dcc97c385e1cd5094fd58 foram preservados. Planta continua na versão 3; nenhuma auditoria de acesso de teste permaneceu.

## Pode riscar

Emissão e autorização privadas do servidor da 16, integração instantânea da planta/capacidades e os recortes de teste acima. Ainda falta piloto autenticado entre aparelhos físicos, incluindo reconexão real e atualização/instalação. Não riscar a validação física da 16 nem afirmar que as missões/contagens locais agora são compartilhadas: elas ainda precisam de persistência própria.

Publicação do complemento da planta: em preparação. O receptor anterior já está publicado; a ativação no banco já está aplicada.
