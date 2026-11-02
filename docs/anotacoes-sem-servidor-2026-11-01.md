# Continuação sem acesso ao Supabase — 01/11/2026

Alterações locais, ainda não publicadas. Nenhuma migração, chamada administrativa ou escrita no banco real. A publicação existente continua em `221171e`.

## 17 — contagem de prateleira, primeira parte

`src/lib/shelf-count.ts` cria uma referência congelada por prateleira, produto e situação, em caixas. Branco continua não contado; zero significa contagem realizada sem caixas. Faltas e sobras são somadas separadamente, sem compensar uma com a outra. Produtos com saldo zero podem ser acrescentados somente a partir do cadastro consultado; molas não aceitam situações de testagem. Códigos ampliados com sufixo são aceitos. Dados inconsistentes são recusados, preservando o armazenamento para revisão.

`src/lib/shelf-count-store.ts` guarda um rascunho por conta no aparelho, com versão de formato, e compara a versão local lida antes de salvar para evitar sobrescritas sequenciais de outra aba. Isso não constitui bloqueio transacional entre aparelhos/abas simultâneas. Falhas de leitura, gravação e remoção não viram sucesso ou ausência falsa. Não armazena credenciais; o rascunho contém informações de estoque e permanece acessível a quem tiver acesso ao perfil do navegador, como os demais rascunhos locais. Não há sincronização ou aprovação por essa cópia.

`src/components/ShelfCount.tsx`/CSS e integração em `InventoryApp.tsx`: seção recolhível em Visão geral/Molas para Administrador/Estoquista. Mantém valores após navegar/reabrir. Mudança do saldo consultado/cadastro exige revisão; não troca a referência nem ajusta saldo. Permite atualizar a consulta e exportar um CSV real somente com todos os itens preenchidos, com identidade, horários, situação, referência, contado, diferença, observação e indicação de referência alterada. Todo arquivo está identificado como rascunho local não aprovado. Texto passa pelo tratamento de segurança de CSV já existente.

Limites: a referência vem da consulta existente, não de uma fotografia transacional ou reserva. Movimentos que retornam ao mesmo saldo não são detectáveis pela comparação de quantidades. A contagem precisa ser refeita/coordenada antes de qualquer ajuste. Envios, fila de aprovação, histórico compartilhado e decisão autorizada de ajuste ainda dependem do servidor. Cadastro de produto desconhecido, garantia e conferência física com equipe não foram inventados nesta etapa. Descartar exige confirmação e apaga somente este rascunho.

**Pode riscar a preparação local da contagem, comparação e exportação para revisão. Não riscar a 17 inteira.**

## 13/20 — aviso e resumo de divergências locais

`ShelfCountNotice` acompanha a existência do rascunho e seus itens pendentes/divergentes em outras telas; o botão abre e focaliza a seção por ação da pessoa. O aviso fica no conteúdo, fora da área sobreposta pelo cabeçalho.

`ShelfCountDivergences`, integrado em `InventoryDashboard.tsx` com identidade somente para Administrador/Estoquista, resume prateleira, itens ainda não contados, itens divergentes, faltas e sobras. Respeita o filtro amortecedores/molas e indica mudança de referência. Não mistura contagem com frequência/volume do mapa de calor nem apresenta rascunho como divergência aprovada da empresa. Falha de leitura ou identidade incorreta não vira zero. Somente o rascunho corrente desta conta/aparelho é representado; não há histórico de reincidência.

**Pode riscar aviso e resumo locais. 13 e 20 seguem parciais por regras/histórico e dados compartilhados aprovados.**

## 13/22 — confirmação de saída pendente em qualquer tela

`PendingOutflowNotice.tsx` lê o mecanismo existente de recuperação por conta/aba. Diferencia pedido incerto (pode já ter sido registrado), confirmado (falta apenas leitura) e ilegível (preservar e revisar). Abre Saídas sem enviar nada. `pending-outflow.ts` emite um evento local depois de gravar/encerrar com sucesso, para atualizar o aviso imediatamente. Não muda UUID, operação, saldo, fase de recuperação ou permissão. Visível somente para Administrador. O teste antigo com janela simulada recebeu suporte a eventos, sem executar seus casos.

**Pode riscar esse aviso de confirmação pendente. Não equivale a comprovar retirada física incompleta.** Prazos de testagem, frequência de divergência e retirada física ainda precisam de definições/registros apropriados.

## 3 — separação visual por situação nas prateleiras

`LocationStockSummary.tsx`, usado em `InventoryApp.tsx`, mostra total em caixas, aguardando testagem e liberado para venda em cada localização de amortecedores. Destaca duas situações quando presentes na mesma localização. Molas mostram somente em estoque. Remove desse resumo a conversão presumida em peças. Zero caixas não é classificado como espaço físico livre.

**Pode riscar separação visual dos resumos. A organização física da 3 continua pendente**, sem criar regiões, renomear prateleiras ou transferir caixas por suposição.

## Verificação — somente casos novos

- `scripts/check-shelf-count.mjs`: novos cenários do modelo, referência, branco/zero, divergências, validação, identidade, relatório, eventos e comparação de versão local.
- `scripts/check-shelf-count-expanded-code.mjs`: três casos novos, incluindo código ampliado de amortecedor/mola e zero inicial.
- `scripts/check-shelf-count-storage-failures.mjs`: três casos novos com recusa real da gravação simulada, recusa da remoção preservando rascunho e leitura bloqueada.
- `tests/browser/shelf-count.spec.ts`: cinco testes novos aprovados — reabertura/zero, CSV baixado e conteúdo, mudança de saldo sem sobrescrita, produto/situação/descarte e teclado/celular/perfil Consulta.
- `tests/browser/shelf-count-divergences.spec.ts`: dois testes novos aprovados — categorias/separação de métricas e dados inválidos/identidade.
- `tests/browser/pending-outflow-notice.spec.ts`: três testes novos aprovados — incerto sem envio, confirmado com somente leitura, ilegível e outra conta.
- `tests/browser/location-status-summary.spec.ts`: dois testes novos aprovados — amortecedores separados e molas/zero sem dedução de espaço.

- `tests/browser/shelf-count-storage-ui.spec.ts`: um teste novo aprovado — falta de espaço informa recusa, preserva o rascunho anterior e não apresenta quantidade como salva (25/26).

Total desta etapa: **13 casos novos de navegador aprovados**, além dos novos cenários isolados acima. Somente casos novos que falharam foram repetidos após correções. Nenhuma suíte anterior foi executada. Utilizado cache Vite separado em node_modules para evitar bloqueio do cache habitual e limpeza da pasta de resultados. Erros corrigidos: aviso sob cabeçalho, preparação de paginação do teste, navegação móvel pelo menu efetivamente visível e verificação do identificador no armazenamento (não na interface que não o exibe).

Build final aprovado; análise dos módulos novos aprovada. Revisão React aplicada: identidade por conta, dados locais com versão, assinatura/limpeza de eventos, formulários com rótulos, tabelas com rolagem/foco e leitura limitada ao rascunho. Análise de InventoryApp aponta avisos anteriores sobre efeitos/dependências; não foram tratados como falha nova nem motivaram repetição de testes antigos.

## Próximas dependências

Para concluir 17/20/22: servidor de aprovação/histórico e regras de recorrência; 16: política/gatilhos/eventos privados e ensaio entre aparelhos. 2/18/21 dependem de capacidade/mapa físicos, 3 da organização física; 6/12/19 de retorno, pedidos e reservas. 4/9 continuam adiados. 7 exige revisão/ativação no serviço; 10/14/24/26 mantêm ensaios físicos/equipe/Safari; fotos reais não disponíveis. 8 permanece somente para transição final aprovada. Design geral depois das 26. Não inventar essas definições para marcar os itens inteiros como concluídos.
