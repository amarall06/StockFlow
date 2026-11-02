# Continuação automática das 26 anotações — 01/11/2026

O pedido mais recente autoriza continuar de um item ao seguinte sem confirmação a cada etapa. Substitui a orientação anterior de parar após uma etapa. Mantém: não repetir testes aprovados, explicar código/local/finalidade, não apagar estoque fictício agora e deixar a melhoria geral do design para depois da lista.

## Entregas locais desta continuação

| Item | Código e finalidade | Alcance |
| --- | --- | --- |
| 16 | `src/lib/inventory-realtime.ts`, `resume-refresh.ts` e `InventoryApp.tsx`: receptor de Broadcast privado, aviso `inventory_changed` no tópico `inventory:changes`, nova consulta autorizada, atualização após assinatura/reconexão e limpeza entre contas. | Receptor preparado; não aplica quantidades do evento. Sem canal, mantém consulta periódica. Formulários/diálogos conservam suas pausas. **Falta servidor e ensaio real.** |
| 1 | `src/lib/stock-notices.ts`, `components/StockNotice.tsx` e CSS, montado em `InventoryApp.tsx`: pop-up comum às telas. | **Implementação local concluída.** Todas as contas com consulta autorizada recebem avisos de amortecedores/molas. Totais incluem aguardando teste e excluem garantia. Sem roubar foco. |
| 11 | `dashboard-summary.ts`, `InventoryDashboard.tsx` e `DashboardWarranty.tsx`: disponível para venda, aguardando teste e garantia separados. | **Implementação local concluída para os indicadores em caixas.** Mantém totais, atividade diária e alertas existentes. Molas não passam por teste. Falha da garantia não vira zero fictício; falha posterior mantém consulta anterior com aviso. |
| 5 | `report-period.ts`, `stock-report.ts`, `stock-report-download.ts`, `StockReportExport.tsx`, incluído no Painel. | **Exportação manual PDF/XLSX implementada.** Semana de segunda a domingo, mês e ano civil, calendário America/Bahia. Saldo atual normal + movimentações do período, não fechamento histórico. |
| 10 | `public/manifest.webmanifest`, `app-192.png`, `app-512.png`, vínculo em `index.html`, `install-prompt.ts`, `InstallApp.tsx`, inicialização em `main.tsx`. | Instalação preparada como janela própria. “Instalar aplicativo” aparece nas opções da conta quando há convite do navegador; só chama confirmação após clique. Ainda falta instalação real em Windows/Android. **Não inclui offline.** |
| 7 | `vercel.json`: nosniff, bloqueio de enquadramento em outros sites e política de referência. | Configuração local de proteção; aplicação depende de publicação. Não encerra auditoria de segurança/RLS/armazenamento. |
| 13/22 | `inventory-consistency.ts`, integração na leitura de `inventory-api.ts` e mensagens em `InventoryApp.tsx`. | Regras automáticas iniciais: quantidade negativa/fracionária/inválida, saldo positivo sem cadastro legível e situação incompatível com a categoria. Rejeita a consulta inconsistente, conserva a anterior quando disponível e orienta revisão, sem corrigir saldo. Não detecta ainda pedidos incompletos, prazo em teste ou divergências recorrentes. |
| 20/23 | `inventory-insights.ts`, `inventory-insights-api.ts`, `InventoryInsights.tsx` e CSS, incluídos no Painel. | Atividade por prateleira e produtos com saldo sem movimentação em 30/90/180/365 dias. Última movimentação dentro do intervalo, localização atual e totais em caixas. Frequência/volume por local com intensidade relativa. Não representa mapa físico, divergências nem idade das caixas. |

## Repetição dos avisos do item 1

Memória em sessionStorage separada por conta e versão, sem senha ou token. Mesmo saldo não reabre aviso fechado após consulta ou recarga na mesma aba. Queda, mudança do mínimo ou novo produto podem gerar aviso; recuperação remove a memória da ocorrência para permitir avisar numa futura queda. O aviso permanece até fechar/abrir Alertas ou até o saldo se recuperar; não desaparece por temporizador. Nova sessão/aba pode avisar novamente. Armazenamento indisponível usa memória da tela. Avisos refletem a última consulta autorizada: formulários não passam a consultar estoque em segundo plano por causa do pop-up.

## Relatórios do item 5

O usuário escolhe uma data dentro do período. Estoque e movimentos são consultados novamente ao exportar; movimentos paginados por ordem estável e limitados a caixas, pelas permissões da conta. PDF traz texto, seções e páginas numeradas. XLSX verdadeiro traz Informações, Estoque atual e Movimentações; números permanecem números e textos são células String, sem fórmulas executáveis. Movimentações são operações, não devem ser somadas como saldo: a mesma caixa pode aparecer em transferência e testagem.

Consultas separadas não constituem fotografia transacional única do banco. Arquivos informam horário e limite de escopo; não apresentam fechamento histórico ou idade física de caixas. Erro em qualquer leitura impede arquivo parcial. Guarda imediata impede exportações duplicadas; sair do Painel ou da conta impede entrega posterior do arquivo. Bibliotecas carregadas só ao exportar. jsPDF 4.2.1 e write-excel-file 4.1.1; instalação final informou zero vulnerabilidades conhecidas. A opção inicial ExcelJS foi removida por dependências com avisos; nenhum ajuste forçado de versões antigas foi aplicado.

## Servidor do item 16

Ainda não criados política de leitura de `realtime.messages`, publicação de eventos privados nem gatilhos após alterações das tabelas relevantes. Somente a conta ativa autorizada deve poder assinar; o cliente não precisa de política para enviar eventos. Emitir sinal sem linhas de estoque e consultar novamente por RLS. O canal não substitui validação transacional de saldo/UUID.

Ferramentas administrativas conectadas retornaram indisponíveis nesta sessão. Não há credencial administrativa configurada para aplicar e verificar política/gatilhos. A CLI inicialmente falhou na cadeia de certificados; não foi desativada verificação TLS. Nenhuma alteração administrativa ou escrita no banco foi feita. Não afirmar sincronização instantânea em produção.

## Verificações novas

70 verificações aprovadas ao longo das etapas desta continuação (22 casos de navegador e 48 verificações isoladas). Somente os casos novos que falharam foram repetidos depois de corrigir código ou preparação. Não foi rodada a suíte anterior nem testes de banco.

| Arquivo | Verificações novas |
| --- | ---: |
| `scripts/check-inventory-realtime.mjs` | 6 |
| `tests/browser/realtime-invalidation.spec.ts` | 3 |
| `scripts/check-stock-notices.mjs` | 7 |
| `tests/browser/stock-notice.spec.ts` | 3 |
| `scripts/check-dashboard-availability.mjs` | 4 |
| `tests/browser/dashboard-availability.spec.ts` | 1 |
| `tests/browser/dashboard-warranty.spec.ts` | 3 |
| `tests/browser/install-app.spec.ts` | 2 |
| `scripts/check-report-period.mjs` | 7 |
| `tests/browser/stock-report.spec.ts` | 4 |
| `scripts/check-security-headers.mjs` | 5 |
| `scripts/check-inventory-consistency.mjs` | 10 |
| `tests/browser/inventory-consistency.spec.ts` | 2 |
| `scripts/check-inventory-insights.mjs` | 9 |
| `tests/browser/inventory-insights.spec.ts` | 4 |

Chrome/Windows com respostas simuladas, inclusive dois contextos de navegador para Realtime; isso não é ensaio em aparelhos reais. Build aprovado. Análise dos arquivos alterados mostrou apenas o aviso React preexistente em InventoryApp. O adaptador de importação de `check-stock-alerts.mjs` foi atualizado para a nova dependência; seu teste antigo não foi executado.

Mudanças **locais, não publicadas**. Nenhum saldo ou histórico real modificado. A publicação anterior e8fb14a permanece a referência de produção.

## Dependências restantes, revisadas por número

| Itens | O que falta antes de encerrar |
| --- | --- |
| 2, 21 | Capacidade/meta válida por local/categoria e sua unidade, cadastro persistido e responsável por manter os valores. Maior saldo observado não é capacidade física. |
| 3, 18 | Mapa físico e nomes reais, vínculo de prateleiras com situações; confirmar áreas de testados/não testados. Não renomear nem transferir caixas por suposição. |
| 4 | Retomar gestão de usuários anteriormente adiada; contas reais e responsáveis pelos testes. Não criar contas ou atribuir permissões fictícias. |
| 6 | Decisão de retorno logístico: identificação, conferência, condição, destino e quem pode liberar. Não adotar retorno direto à venda sem regra. |
| 7 | Auditoria administrativa de permissões, armazenamento, recuperação e cenários reais; validar cabeçalhos depois da publicação. |
| 8 | Somente na transição final: inventário de dados fictícios/reais, cópia verificável e confirmação concreta antes de apagar. Continua adiado. |
| 9 | Etiqueta por caixa e vínculo com aprovação real, campos e eventual identidade QR; preservar adiamento até definição da identificação. |
| 10 | Publicação HTTPS, conferir instalação em Windows/Android e abertura/atualização da janela instalada. |
| 12, 19 | Modelo persistido de pedido/reserva/separação/expedição/cancelamento, retorno físico, idempotência e autorização. Motivo obrigatório; não somar saldo de pedido que nunca saiu. QR precisa identidade estável. |
| 13, 22 | Regras iniciais entregues. Faltam destinatários de pendências, prazos de teste, retirada incompleta, frequência de divergência e resolução auditável. |
| 14 | Implementar consulta offline com snapshot por conta, horário, expiração e limpeza no logout/revogação; definir comportamento quando sessão não pode ser validada. Nenhum cache privado ou fila de escritas foi introduzido. Escritas offline exigem projeto próprio de conflitos e validação no servidor. |
| 16 | Acesso administrativo para política/canal/gatilhos e ensaio real após ativação. |
| 17 | Sessões persistidas de contagem, referência temporal, movimentos durante contagem e aprovação por pessoa autorizada. Sem ajuste automático. Depende de backend/RLS ainda não implementados. |
| 20 | Frequência/volume e períodos selecionáveis implementados localmente em tabela de calor. Faltam divergências das sessões de contagem e eventual disposição em mapa físico. Para grande volume, substituir a leitura paginada do intervalo por agregação autorizada no servidor. |
| 23 | Ausência de toda movimentação e última dentro do período implementadas para produtos com saldo normal, com prateleiras atuais. Faltam última fora da janela consultada e idade física/rastreabilidade das caixas. Não alegar que ausência de evento prova idade do saldo. |
| 24 | Roteiro concluído; execução depende de equipe e conferência física. |
| 25, 26 | Casos locais ampliados. Ainda faltam validação real, Safari/iPhone e demais cenários não cobertos; não repetir casos anteriores sem alteração relevante. |

Foto real de produto continua indisponível, conforme informado pelo usuário. Itens dependentes não foram marcados concluídos. A revisão percorreu todos os 26; as dependências não autorizam inventar dados físicos ou regras financeiras/operacionais.

## Indicadores 20/23

Uma consulta compartilhada, paginada e autorizada de `stock_movements` abastece os dois indicadores. Conta todas as operações em caixas, sem filtrar somente vendas. Limita o intervalo antes de carregar; ordenação por data/ID. Ignora eventos duplicados por ID. Transferência soma frequência e volume em origem e destino, mas mesma origem/destino conta uma vez. Prateleiras atuais sem evento aparecem com zero, não como locais fisicamente vazios. Mantém a distinção entre saldo atual e volume de operações.

Filtros de amortecedores/molas seguem o Painel. Troca de período descarta resposta anterior; falhas mantêm resultado anterior somente do mesmo período, com aviso. Atualiza em retomada/Realtime/intervalo e pausa sob diálogo. Tabelas com rolagem própria e foco por teclado não alargam tela de 375 px. Não são inventados prazos de alerta: os dias são filtro escolhido pela pessoa. A ausência mostrada é relativa a uma janela conhecida, não uma data histórica inexistente.

## Referências consultadas

- Supabase: https://supabase.com/docs/guides/realtime/subscribing-to-database-changes e https://supabase.com/docs/guides/realtime/broadcast
- Instalação: https://web.dev/learn/pwa/web-app-manifest e https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event
- PDF: https://github.com/parallax/jsPDF/releases/tag/v4.2.1
- Excel: https://github.com/catamphetamine/write-excel-file/blob/master/CHANGELOG.md e tipos da versão instalada.
- Cabeçalhos: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options , https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options e https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy

## Continuação — anotação 14, estado de conexão

Implementados `src/components/ConnectionStatus.tsx` e integração em `src/InventoryApp.tsx`: aviso sem conexão e horário da última leitura bem-sucedida do estoque. O horário acompanha carga inicial, atualização manual e automática. Não apresenta a consulta conservada como saldo atual confirmado.

`src/lib/resume-refresh.ts` passou a respeitar o estado offline antes de agendar, ler e publicar uma resposta. O evento online já existente retoma a leitura autorizada. Não foi introduzido armazenamento privado persistente, login offline, fila ou confirmação de escrita sem servidor. Os formulários conservam seus tratamentos existentes; o aviso não representa uma trava geral de operações.

Somente `scripts/check-offline-refresh.mjs` foi executado: cinco casos novos aprovados (pausa offline, reconexão, descarte de resposta durante desconexão, recuperação e limpeza). Nenhum dos 70 casos anteriores foi repetido. A interface do aviso ainda não foi ensaiada no navegador nesta etapa. A anotação 14 continua parcial; somente essa subetapa de implementação pode ser riscada.

## Reabertura offline — 01/11/2026

Subetapa da 14 implementada localmente: service worker guarda somente `offline.html`/`offline.js`, nunca respostas da API, tokens ou HTML autenticado. Falha de navegação por ausência de rede abre consulta dedicada com filtro local e nenhuma operação de escrita. Requer uma abertura conectada anterior com instalação do worker concluída.

`src/lib/offline-stock.ts` salva apenas saldos da consulta autorizada, identificador da conta e horário, por até 15 minutos. `InventoryApp.tsx` renova a cópia em leituras bem-sucedidas. `App.tsx` limpa no logout, ausência de sessão, conta inativa e troca de identidade. A página verifica validade a cada segundo e permite apagar a cópia. Não é novo login offline nem verificação de revogação remota: uma revogação ocorrida sem rede não pode ser conhecida nesse intervalo. A cópia local de leitura é acessível a quem tiver acesso ao perfil do navegador; não está criptografada. Fechar/reabrir dentro do prazo conserva a consulta, após o prazo exige reconexão.

Três casos novos de navegador aprovados em build de produção servido localmente, com contexto realmente offline: reabertura/filtro, expiração e isolamento/exclusão. Seis verificações isoladas novas aprovadas para armazenamento mínimo, prazo, troca de conta e limpeza. Build aprovado. Nenhum caso anterior repetido, nenhuma escrita no banco e nenhuma publicação. A sequência seguinte avançou a proteção local da anotação 7; não representa auditoria completa de segurança. A 14 permanece parcial quanto a fila/validação de operações offline, que não foi implementada.

## Operações offline — primeira parte

Implementados rascunhos de saída na página offline (`public/offline.html` e `offline.js`), separados por conta em `liber:offline-operations:v1`. Aceitam apenas situação vendável, quantidade inteira dentro da consulta ainda válida, até 100 rascunhos e observação limitada. Identificador UUID estável; rascunho idêntico existente não é acrescentado novamente. Não descontam, reservam, enviam ou confirmam caixas. Persistem após reabrir; apagar a consulta não apaga rascunhos pendentes.

`src/lib/offline-operations.ts` valida a leitura; `OfflineOperations.tsx`, incluído em `StockOutflows.tsx`, apresenta pendências da própria conta para conferência. Isso avança a 13 pela identificação de pendências locais, sem atribuir regras de atraso. Dados malformados geram aviso e são preservados. Service worker atualizado para v2 para entregar a página nova.

Ainda não implementados envio/reconciliação com servidor, tratamento de conflito de saldo, recuperação após confirmação e demais tipos de operação. Não riscar a 14 inteira nem tratar rascunho como retirada realizada. Mudanças locais, não publicadas; sem operação no banco.

Verificação desta parte: dois casos novos de navegador aprovados com rede desligada de fato, cobrindo gravação/reabertura, repetição, saldo conservado, quantidade inválida e ausência de consulta válida. O teste foi ajustado para desligar a rede e executado novamente nessa condição; nenhuma suíte anterior foi repetida. O bloqueio de cache do Vite foi contornado com diretório de cache exclusivo, sem apagar caches existentes. A apresentação conectada dos rascunhos ainda não recebeu ensaio de navegador nesta parte.

## Envio e recuperação dos rascunhos de venda — 01/11/2026

Subetapa local concluída: `OfflineOperations.tsx` oferece conferência e envio individual para Administrador com módulo pronto. `StockOutflows.tsx` verifica identidade/conteúdo atual do rascunho, exige conexão e confirmação explícita e grava pedido incerto em sessionStorage antes da chamada. Usa o UUID original do rascunho, sem recriar o identificador. O envio reutiliza `registerOutflow` e a transação/idempotência já existentes no servidor. O status suportado é venda de molas em estoque ou amortecedores liberados; não inclui descarte/devolução preparados offline.

Recusa explícita por saldo insuficiente conserva o rascunho e mostra o conflito; não reduz quantidade automaticamente. Resposta desconhecida conserva pedido original para conferência, inclusive após reload. Confirmado pelo servidor: grava fase confirmada, atualiza leitura e só então remove o rascunho por ID; falha de atualização mantém recuperação que apenas atualiza, sem reenviar retirada. Fechar/reabrir a aba sem sessionStorage ainda conserva o rascunho com o UUID original, permitindo reenvio idempotente. Esse último cenário entre abas não foi ensaiado no navegador nesta rodada.

A migração existente `202610250004_stock_outflows.sql` foi lida: bloqueio transacional por UUID e conferência de autor/payload precedem nova retirada. Não houve alteração de SQL nem teste/escrita no banco real. Os testes usam servidor simulado; não constituem validação nova do banco de produção.

Somente seis casos novos executados em `tests/browser/offline-send.spec.ts`: sucesso/UUID/remoção; perda de resposta e reload; conflito de saldo; confirmação seguida de falha na leitura sem novo envio; cancelamento sem pedido/envio; aviso de pendência em outra tela e acesso à conferência. Todos aprovados. Casos anteriores não repetidos. Build e análise dos componentes novos aprovados.

Em seguida avançou a 13: `OfflinePendingNotice.tsx`, montado em InventoryApp para Administrador, conta rascunhos da própria conta, acompanha foco/storage/remoção local e oferece acesso a Saídas. Não significa detector completo de todas as pendências da empresa. A 14 segue parcial para entradas, transferências, garantia e demais operações offline. Alterações não publicadas.

## Entradas offline com envio e recuperação — 01/11/2026

Subetapa da 14 concluída localmente para produtos/prateleiras presentes na consulta salva, sem fornecedor/lote e sem cadastro de produto novo. `public/offline.html`/`offline.js`: preparo de entrada com UUID, limite de quantidade inteira positiva e prevenção de rascunho idêntico. Amortecedores aguardam testagem e molas entram em estoque. Worker passou à versão v3.

`src/lib/offline-receipts.ts` mantém fila por conta, validada, com fases draft/uncertain/confirmed. `OfflineReceipts.tsx`, montado em InventoryApp nas páginas Visão geral e Molas, oferece envio individual às funções Administrador/Recebimento. Antes da chamada persiste uncertain; chama receiveWithSupplier com o UUID original. Resposta desconhecida mantém conteúdo e UUID para conferência após reload. Confirmação persiste confirmed antes de atualizar leitura; recuperação dessa fase somente lê estoque. Remove rascunho apenas após confirmação e leitura bem-sucedidas. Recusa de permissão/dados preserva pedido e mensagem do serviço, sem conversão automática de situação/quantidade. Não há envio automático na reconexão.

Migração existente `202610250003_receipt_suppliers.sql` lida para conferir trava/UUID/autor/payload; não alterada ou executada. Testes novos usam API simulada, não ensaio novo em banco real.

Seis casos novos aprovados em `tests/browser/offline-receipts.spec.ts`: preparo realmente sem rede/reabertura/deduplicação; envio UUID/remoção; resposta perdida/reload; confirmação com leitura falhando e recuperação sem novo envio; cancelamento sem RPC; aviso global e navegação correta. O caso novo de falha de leitura foi repetido após ajustar a espera pelo botão habilitado, para não retirar a falha simulada antes de a primeira leitura terminar. Nenhuma suíte anterior foi repetida. Build e análise dos novos componentes aprovados.

Próxima pendência tratada na sequência: 13, aviso global agora inclui entradas, com acesso direto à conferência e visibilidade para Recebimento/Administrador. Ainda faltam transferências/garantia e demais escopos da 14; fornecedor/lote offline e produtos novos não incluídos. Não riscar 14 inteira. Mudanças locais, não publicadas, sem escrita em banco real.

## Transferências offline com envio e recuperação — 01/11/2026

Subetapa da 14 implementada localmente. A cópia de consulta passou a guardar também os códigos de locais ativos (`offline-stock.ts`). `public/offline.html` e `offline.js` oferecem origem/situação da consulta, destino da lista salva e quantidade inteira dentro do saldo consultado. Bloqueiam origem igual a destino e rascunho idêntico. Preservam situação; não transferem saldo offline. Cópias antigas sem lista de locais precisam ser renovadas conectado. Worker versão v4.

`offline-transfers.ts` mantém fila por conta com UUID e fases draft/uncertain/confirmed. `OfflineTransfers.tsx`, montado nas páginas Visão geral/Molas para conferência, permite envio individual a Administrador/Estoquista. Persiste uncertain antes de chamar registerTransfer; conserva o UUID original após perda de resposta/reabertura. Confirmação exige o mesmo ID devolvido pelo serviço. Persiste confirmed antes da atualização da tela; recuperação dessa fase não repete RPC. Rascunho removido apenas depois de confirmação e leitura. Recusa de saldo/local/permissão mantém conteúdo/UUID para revisão, sem mudar quantidade/destino automaticamente.

Migração existente `202610270001_idempotent_transfers.sql` lida: trava por UUID e conferência de autor/payload antes de nova transferência. Não alterada/executada nesta etapa; testes usam respostas simuladas, sem banco real.

Na sequência, 13 avançou com aviso de transferências pendentes em `OfflinePendingNotice.tsx`, visível para Administrador/Estoquista, com acesso à conferência. Chaves React de entradas e transferências diferenciadas para não compartilhar identidade de componentes irmãos.

Oito casos novos de navegador em `offline-transfers.spec.ts`: preparo realmente sem rede e reabertura, destino/quantidade/deduplicação; envio/UUID/remoção; perda de resposta/reload; confirmação com falha de leitura sem reenvio; cancelamento; recusa preservando pedido; aviso global/navegação; acesso Estoquista sem confusão de identidade com entradas. Nenhuma suíte anterior foi repetida. Alterações locais, não publicadas; sem escrita no banco real. Pode riscar transferências offline nesse escopo; 14 inteira segue parcial por garantia e outros escopos ainda registrados.

## Garantia offline — caixas por fabricante, 01/11/2026

Subetapa da 14 implementada localmente para entrada/saída de caixas de amortecedores/molas em garantia, por fabricante existente. Não abrange cadastro/edição do processo de devolução de cliente (`WarrantyReturns`), nem cadastro de fabricante novo.

`offline-stock.ts` conserva a última consulta de fabricantes/saldos de Garantia dentro da cópia da própria conta, com expiração própria de 15 minutos, sem renová-la apenas por ler o estoque normal. `WarrantyManufacturers.tsx` recebe userId de InventoryApp e atualiza essa cópia somente após consulta bem-sucedida com saldos. Limpeza da consulta/logout/troca de conta elimina a cópia; rascunhos persistem separados para conferência. Preparo exige cópia de estoque e de Garantia válidas.

`public/offline.html` e `offline.js` permitem fabricante, categoria, direção, caixas e observação; saída acima do saldo consultado é recusada, sem inventar reserva. UUID fixo e bloqueio de rascunho idêntico. Worker v5. Nenhum saldo é alterado offline.

`offline-warranty.ts` valida e mantém fila por conta nas fases draft/uncertain/confirmed. `OfflineWarranty.tsx`, dentro de Garantia, permite conferência/envio individual somente a Administrador. Persiste uncertain antes de changeWarrantyBoxes, usando o mesmo UUID; resultado perdido mantém pedido para repetição idempotente. Confirmação persiste confirmed antes da leitura de fabricantes/saldos. Falha posterior permite repetir somente leitura, sem nova operação. Remove rascunho após confirmação e consulta bem-sucedida. Recusa por saldo conserva identificador/conteúdo e apresenta mensagem do serviço. Não aplica ajustes automáticos.

Migração existente `202610240008_warranty_boxes.sql` consultada, sem alteração/execução. Oito casos novos em `offline-warranty.spec.ts` aprovados, com API simulada: saída/UUID/remoção; resposta perdida/reload; confirmação seguida de falha de consulta sem reenvio; cancelamento; preparo realmente offline/reabertura/deduplicação/quantidade; recusa de saldo; aviso global; entrada em garantia com direção correta. Nenhum teste anterior repetido. Build e análise dos componentes novos aprovados. Sem escrita em banco real; não publicado.

Na sequência, anotação 13 avançou com aviso global de pedidos de Garantia, na própria conta e para Administrador, com navegação à conferência. Pode riscar o escopo de caixas de Garantia offline, não o processo completo de devolução nem a 14 inteira. Permanecem publicação, ensaio real e outros escopos documentados.

## Devolução de cliente offline — recebimento inicial, 01/11/2026

Subetapa da 14 implementada localmente para criar devolução nova como Recebida / em conferência. Descrição, motivo, local e quantidade são obrigatórios. Categoria/propriedade ficam inicialmente não identificadas; fabricante ainda não vinculado. Não lança saldo de garantia nem estoque normal. Mudanças posteriores de andamento e encerramento de registros existentes continuam conectadas; não riscar esse escopo como concluído.

`public/offline.html` e `offline.js`: preparo sem rede com cópia de consulta válida, UUID separado para registro e requisição, prevenção de rascunho idêntico e limites de campos/quantidade. Worker versão v6. `offline-customer-returns.ts`: validação e fases draft/uncertain/confirmed, por conta; rejeita status incompatível com recebimento inicial. `OfflineCustomerReturns.tsx`, incluído em WarrantyManufacturers, oferece conferência/envio a Administrador, mantendo ambos os identificadores. Usa saveWarrantyReturn com versão esperada nula para criar novo registro. Resposta desconhecida preserva pedido; confirmação persistida permite recuperar apenas leitura da lista, sem reenviar cadastro. Remove rascunho depois da leitura bem-sucedida. Conflito preserva conteúdo e IDs para revisão.

Migração existente `202610250001_warranty_returns.sql` lida: serialização por registro, recuperação por requestId e conferência de autor/conteúdo antes de nova escrita. Não alterada/executada nesta rodada. Oito casos novos de navegador em `offline-customer-returns.spec.ts`: preparo realmente sem rede/reabertura/deduplicação/campos; envio UUID/remoção; perda de resposta/reload; confirmação com leitura falhando sem reenvio; cancelamento; conflito com IDs preservados; aviso global; rascunho adulterado não promove recebimento a saldo de garantia. API simulada; nenhuma escrita no banco real e nenhuma suíte anterior repetida. Build e análise aprovados.

Na sequência avançou 13: aviso global das devoluções offline da própria conta, para Administrador, abre a conferência em Garantia. Pode riscar o recebimento inicial offline e esse aviso; não a 14 inteira. Alterações locais, não publicadas. Seguem pendentes edição/transições/encerramento offline de devoluções existentes e demais escopos/ensaios registrados.

## Edição, andamento e encerramento offline — 01/11/2026

Subetapa da 14 concluída localmente para devoluções existentes presentes na consulta salva. `WarrantyReturns.tsx` recebe userId e grava as até 100 devoluções retornadas pela consulta existente; `offline-stock.ts` conserva cópia com validade própria de 15 minutos, sem renovar o prazo apenas por atualizar estoque. Consulta antiga ou registros encerrados não são oferecidos para edição. Cópia removida junto à consulta no logout/troca de conta.

`public/offline.html`/`offline.js` oferecem descrição, motivo, local, código, caixas, categoria, identificação, fabricante, andamento e destino. Guardam ID do registro, versão updated_at original, retrato anterior e novo UUID de envio. A versão fica presa ao início da edição: atualização da cópia por outra aba não autoriza sobrescrever a mudança remota. Uma devolução não recebe novo rascunho enquanto já houver pedido local dela. Não há aplicação de saldo sem servidor. Worker v7.

`offline-return-validation.ts` confere transições existentes: molas não passam por testagem; garantia exige identificação/fabricante; encerramento exige destino; registros encerrados não são reabertos. Para registro em garantia, identificação/categoria/quantidade/código/propriedade ficam fixos e só permanece em garantia ou encerra. Esses campos ficam bloqueados na página offline. `offline-customer-returns.ts` valida vínculo entre ID/versão/retrato anterior antes de permitir envio. `OfflineCustomerReturns.tsx` passa versão esperada a saveWarrantyReturn, mostra andamento e efeitos no saldo na confirmação e mantém fases persistidas para recuperar confirmação sem duplicar operação. Conflito remoto conserva pedido e versão; não mescla alterações automaticamente.

A migração já existente `202610250001_warranty_returns.sql` foi lida: serializa por registro e confere evento/autor/payload/versão. Entrar em garantia e encerrar garantia usam os efeitos transacionais existentes, sem chamada separada do cliente a changeWarrantyBoxes. Não houve alteração/execução de SQL nesta etapa.

Somente 16 casos novos executados e aprovados: nove em `offline-return-edits.spec.ts` (envio UUID; resposta perdida/reload; confirmação seguida de falha de leitura sem reenvio; cancelamento; preparo offline de encerramento/destino/identidade/deduplicação; conflito preservando versão/destino/IDs; aviso com andamento; consulta conectada abastece offline e mantém versão original após mudança de cópia; aviso de confirmação pendente de leitura) e sete em `check-offline-return-edits.mjs` (edição válida, restrições de mola, encerrado bloqueado, identidade protegida, fechamento válido, destino obrigatório e entrada em garantia válida). API simulada e navegador realmente offline nos casos de preparo. Nenhuma suíte anterior repetida. Build e análise dos arquivos alterados aprovados.

Na sequência 13 avançou: aviso global de devoluções distingue as já confirmadas que só precisam atualizar a lista, para não registrar novamente. Pode riscar o escopo local de editar/avançar/encerrar devoluções consultadas e esse aviso. Não significa fechamento integral da 14: continuam os demais escopos documentados, publicação e ensaio real. Sem escrita no banco real e sem publicação nesta rodada.

## Lote de pendências da 14 — fornecedor/lote e tipos de saída

Implementadas duas pendências relacionadas na mesma rodada, conforme pedido de acelerar:

- Entradas offline com fornecedor existente da consulta recente e lote opcional. `ReceiptForm.tsx` recebe userId, guarda fornecedores após leitura autorizada; `offline-stock.ts` conserva catálogo com prazo próprio de 15 minutos. Página offline exige fornecedor para lote e não oferece catálogo expirado. UUID/conteúdo continuam os mesmos na recuperação; confirmação/lista agora apresentam o lote.
- Descarte e devolução ao fornecedor offline. `public/offline.html`/`offline.js` oferecem motivo da saída, incluindo caixas aguardando testagem quando permitido. Observação é obrigatória nas duas saídas. `offline-operations.ts` valida pelo normalizeOutflow existente; rascunhos antigos sem reason continuam sendo venda. `StockOutflows.tsx` envia o motivo original com UUID original pela mesma recuperação existente. `OfflineOperations.tsx` identifica o tipo antes do envio. Não confundir devolução ao fornecedor com retorno dos Correios (anotação 6, ainda depende de regra da empresa).

Worker v8. Seis casos novos em `offline-extra-operations.spec.ts`, aprovados: envio de descarte; envio de devolução ao fornecedor; entrada fornecedor/lote com resposta perdida e recuperação do payload original; preparo sem rede com fornecedor obrigatório para lote e motivo obrigatório para descarte; fornecedor expirado não oferecido e transferência independente dessa informação; consulta conectada de fornecedores abastece seleção offline da própria conta. Casos anteriores não repetidos. Build e análise dos arquivos alterados aprovados; sem banco real e sem publicação.

Pendências concretas da 14 após esta rodada: aprovação de testagem offline; cadastros novos de produto/fornecedor/fabricante ainda somente conectados; validação das permissões/conflitos/idempotência no ambiente real e em aparelhos; publicação/instalação e atualização real do worker. Upload/edição de fotos offline não foram implementados e continuam exigindo conexão. Não considerar a 14 inteira concluída por causa dos testes simulados. As operações já cobertas estão discriminadas acima; não reabrir seus testes sem mudança relevante.

## Aprovação de testagem offline — 01/11/2026

Subetapa da 14 implementada localmente. `public/offline.html`/`offline.js` oferecem amortecedores aguardando testagem da consulta válida, excluem molas e limitam quantidade inteira ao saldo consultado. Rascunhos por conta com UUID fixo, sem liberação para venda enquanto offline, sobrevivem à reabertura e não repetem pedido idêntico. Preparar somente após executar testagem física. Worker v9.

`offline-tests.ts` valida categoria/situação/código/local/quantidade e mantém fases draft/uncertain/confirmed. `OfflineTests.tsx`, montado em Visão geral com API pronta, oferece confirmação e envio individual somente para Administrador/Testador. Usa approveShockBoxes com o UUID original. Resposta perdida conserva pedido; confirmação persistida seguida de leitura falhando permite recuperar somente leitura, sem aprovar novamente. Recusa de saldo mantém conteúdo e identificador. Pedido removido somente após confirmação e leitura bem-sucedidas. A data registrada é a confirmação no servidor, não uma data física presumida pelo cliente; responsável vem da sessão validada no servidor.

Migração existente `202610250002_shock_testing.sql` lida: trava por UUID e conferência de pedido/autor antes de nova aprovação. Nenhum SQL alterado ou executado nesta etapa. Oito testes novos de navegador em `offline-tests.spec.ts`, todos aprovados: envio/UUID/remoção; resposta perdida/reload; confirmação com falha de leitura sem reenvio; cancelamento; preparo realmente offline/molas/quantidade/reabertura/deduplicação; conflito de saldo; aviso e acesso Testador com Consulta bloqueada; confirmação física e payload sem autor/data inventados. API simulada, nenhuma escrita em banco real. Nenhuma suíte anterior repetida. Compilação e análise dos arquivos novos aprovadas.

Na sequência avançou a 13: `OfflineTestPendingNotice` em OfflinePendingNotice, montado para Administrador/Testador, mostra aprovações pendentes da conta e abre a conferência. Pode riscar a implementação local de preparo/envio/recuperação da testagem offline e esse aviso. A 14 inteira continua parcial: cadastros novos de produto/fornecedor/fabricante, fotos ainda conectadas, validação real, publicação e instalação/atualização do worker. Alterações não publicadas nesta rodada.

## Cadastros novos offline — 01/11/2026

Subetapa local da 14 implementada para produto com entrada inicial, fornecedor e fabricante. Página offline (`offline.html`/`offline.js`, worker v10) exige consulta válida da conta. Produto recebe código, aplicação, local ativo da consulta e caixas iniciais; amortecedor começa aguardando teste e mola em estoque. Usa a fila de entradas existente e o UUID original, com envio de produto novo restrito a Administrador em OfflineReceipts. Se o código já existir no servidor, a RPC usa o cadastro existente para entrada e não substitui sua aplicação; esse limite aparece na confirmação. Não cria produto sem entrada nesta etapa. Cadastros novos não são referenciados por ID temporário em outras operações: devem ser conferidos conectado antes de usar a referência real.

Fornecedor/fabricante: `offline-registrations.ts` guarda tipo, nome normalizado, UUID local de rastreio, fase e ID confirmado no servidor. `OfflineRegistrations.tsx` monta conferência global na própria conta, somente Administrador envia. Antes de criar consulta nomes autorizados; cadastro já existente pode ser vinculado após confirmação explícita, sem nova criação. Os endpoints atuais não recebem requestId: não se alega idempotência por UUID para essas duas RPCs. A unicidade por nome no SQL existente foi conferida; create_supplier devolve referência existente em conflito e save_warranty_manufacturer recusa nome duplicado.

Antes da criação persiste fase uncertain. Se a resposta não chega, a recuperação seguinte faz somente consulta: se encontrar nome correspondente, a pessoa confirma o vínculo com o ID encontrado; se não encontrar (inclusive renomeação após possível criação), preserva pedido para revisão administrativa, sem repetir criação às cegas. Não confirma autoria de uma criação a partir do nome. Fase confirmed conserva ID; falha de leitura/atualização recupera apenas consulta, sem recriar. Mudança do ID/nome na leitura mantém referência para revisão. Não é recuperação automática garantida de toda ambiguidade: permanece necessária conferência manual quando a consulta não resolve o estado.

Na sequência 13 avançou: a seção global conta cadastros pendentes e permite conferi-los em qualquer tela; reage a mudanças de armazenamento/foco. Depois de concluir, publica aviso para atualizar fornecedores de ReceiptForm e as consultas automáticas, sem apagar rascunhos dos formulários.

Oito casos novos aprovados em `offline-registrations.spec.ts`: fornecedor e fabricante com resposta perdida e recuperação sem nova criação; cadastro incerto ausente bloqueia recriação; produto novo/entrada recupera UUID e aplicação; preparo realmente offline/reabertura/normalização/deduplicação; vínculo com cadastro existente e aviso em outra tela; confirmado com leitura falhando não recria; Recebimento não envia produto novo e Consulta não envia referências. API simulada, nenhum banco real alterado. Casos anteriores não repetidos. Build e análise dos arquivos novos aprovados.

Pode riscar o escopo local acima. A 14 inteira permanece pendente de validação real de permissões/concorrência/idempotência e instalação/atualização/publicação. Fotos continuam exigindo conexão. Ambiguidades sem referência encontrada exigem revisão, não são apagadas nem confirmadas automaticamente. Não houve publicação nesta rodada.


## Retomada após pausa — 01/11/2026

Publicação da 14 e ensaios novos reais documentados em `publicacao-anotacao-14.md`; registros locais anteriores são históricos. Servidor da 16 não ativado: execute_sql/search_docs indisponíveis nesta sessão, nenhuma migração tentada. Seguiu-se a 23 pela última movimentação fora da janela, implementada e testada localmente, ainda não publicada. Código/limites em `anotacao-23-ultima-movimentacao.md`. Nenhuma suíte antiga repetida.


## Continuação sem servidor — 01/11/2026

Subpartes de 17/13/20/22/3 implementadas, com 13 casos novos de navegador e novos cenários isolados aprovados. Sem Supabase real, sem migrações, sem publicação e sem repetir casos anteriores. Detalhamento prevalente: `anotacoes-sem-servidor-2026-11-01.md`. Aprovação/histórico/capacidade/mapa/regras/ensaios físicos continuam pendentes, conforme tabela dos 26.


## Publicação e continuação — 01/11/2026

Código `a726b26` publicado com Vercel success, seis arquivos iguais ao build anterior, sem repetir testes aprovados. Relatório `publicacao-contagem-e-alertas.md`. Na sequência, 26 avançou pela página offline com controles móveis, atalhos/foco e três testes novos sem rede, inclusive auditoria automática A/AA. Guia `offline-acessibilidade-2026-11-01.md`. Publicação do complemento em andamento; não houve acesso/escrita no Supabase.


Complemento da 26 publicado em `080869d`, Vercel success, página offline/worker v11 públicos iguais ao build aprovado. Três testes novos aprovados, nenhum anterior repetido. Publicações documentadas em `publicacao-contagem-e-alertas.md`; pendências consolidadas em `pendencias-atuais-26-anotacoes.md`.


## Continuação 25/26 — formulários e contraste

Sem Supabase real, corrigidos contrastes em sete CSS e aprovados 30 casos novos (16 diálogos/contagem + 14 telas nos temas claro/escuro). Somente novos casos com falha repetidos após correção; casos anteriores não executados. Publicado em `62b59f9`, Vercel success e onze arquivos públicos iguais ao build aprovado. Relatório `acessibilidade-formularios-2026-11-01.md`.


## Revisão completa e guia da 10 — 01/11/2026

Conferidos os 26 itens. Guia interno de instalação independente de convite automático, com caminhos Windows/Android/iPhone, cinco testes novos aprovados e nenhuma suíte anterior repetida. Publicado em `a7954af`, Vercel success e cinco arquivos públicos iguais ao build aprovado. Relatório `guia-instalacao-2026-11-01.md`. Dependências do usuário/empresa detalhadas em `definicoes-da-empresa-26-anotacoes.md`; sem inventar prazos, mapa ou capacidade, sem banco real e sem limpar dados fictícios.


## Capacidade física por prateleira — 01/11/2026

Usuário escolheu referência física e autorizou cenário fictício NORTE/SUL/LESTE/OESTE e demais valores. Implementado gráfico e edição local por prateleira, com separação entre demonstração e consulta do estoque. Oito testes novos de navegador e novos cenários isolados aprovados; nenhum antigo repetido. Publicado em `7aa9dc5`, Vercel success e seis arquivos públicos conferidos. Guia `capacidade-fisica-local.md`. Compartilhamento e dados reais continuam pendentes.


## 18 e apresentação fictícia — 02/11/2026

Mapa interativo, busca/detalhes e página independente `/demonstracao.html` com indicadores, produtos, capacidade e divergência inteiramente fictícios, a pedido do usuário para apresentação aos superiores. Cinco testes novos de navegador e verificações isoladas aprovados; sem testes anteriores. Nenhum acesso/escrita no Supabase. Publicado em `f38cc9c`, Vercel success e dezesseis recursos públicos conferidos. Guia `mapa-ficticio-apresentacao-2026-11-02.md`.


## 21 e planta no site original — 02/11/2026

Sugestão por capacidade e espaço conferido, compatibilidade, divergência/ranking, seleção do destino no mapa e planta em grade inspirada na imagem enviada. Apresentação integrada ao Painel com rótulos neutros; página anterior mantida só por compatibilidade. Oito casos novos de navegador e verificações isoladas aprovados; nenhum anterior repetido e sem Supabase real. Publicado em `3faabef`, Vercel success e quatorze recursos públicos conferidos. Guia `sugestoes-planta-2026-11-02.md`.


## 19 — modo missão local, 02/11/2026

Pedidos de exemplo, roteiro, código textual, confirmação acumulada e recuperação, conclusão/cancelamento e disponibilidade local entre pedidos. No próprio Painel, integrado ao mapa e com funções Administrador/Estoquista/Consulta. Oito testes novos de navegador e verificações isoladas aprovados; nenhum anterior ou Supabase real. Publicado em `2b91830`, Vercel success e quatorze recursos públicos iguais ao build aprovado. Guia `modo-missao-local-2026-11-02.md`.

## 19 — lista de retirada local, 02/11/2026

PDF/CSV do pedido atual com roteiro e progresso, identificação de cancelamento e cópia com data; sem alterar missão ou estoque. Quatro testes novos e verificações isoladas aprovados, PDF inspecionado visualmente. Pode riscar implementação/testes/publicação desse recorte local. Guia: lista-retirada-local-2026-11-02.md. Não encerra as pendências reais da 19. Publicado em `64e92a2`; domínio HTTP 200 e dezesseis recursos públicos iguais ao build aprovado.

## 12 — cancelamento local com motivo, 02/11/2026

Formulário, motivo/data e declaração do retorno das caixas já separadas implementados na apresentação; quatro testes novos e verificações isoladas aprovados, nenhum anterior repetido. Guia: cancelamento-local-2026-11-02.md. Pedidos/reservas/histórico reais e piloto continuam pendentes. Publicado em `f82b482`; quatorze recursos públicos iguais ao build aprovado e domínio HTTP 200.
