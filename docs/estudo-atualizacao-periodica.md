# Anotação 16 — estoque atualizado com a tela aberta

Etapa local de 01/11/2026. Complementa a retomada por foco/conexão, sem concluir toda a anotação 16 nem alterar as operações da anotação 15.

## Comportamento

Painel, Estoque geral, Produtos e Alertas leem novamente catálogo, saldos e localizações a cada 30 segundos enquanto a aba está visível. A alteração chega depois da próxima consulta bem-sucedida, não instantaneamente. Garantia, histórico, atividade/vendas do painel e Giro/ABC têm consultas próprias e não foram sincronizados nesta etapa.

Não há atualização automática nos formulários operacionais. Qualquer diálogo aberto também pausa o mecanismo nas telas de consulta. Se uma janela abrir durante uma leitura, o resultado dessa leitura não é aplicado sob a janela. Fechada a janela, a próxima leitura periódica pode atualizar o estoque.

O controle anterior de falhas conserva os dados e apresenta aviso. Intervalos durante uma leitura lenta são agrupados em uma próxima tentativa, sem leituras simultâneas deste mecanismo. Ao sair da tela/conta, temporizador e ouvintes são removidos e respostas tardias são ignoradas.

## Código

`src/lib/resume-refresh.ts` recebeu `intervalMs` opcional, com padrão zero para manter o uso anterior somente por eventos. Quando maior que zero, `window.setInterval` chama o agendamento existente; ele ainda agrupa eventos por 150 ms e usa a fila de uma próxima leitura. `window.clearInterval` remove o temporizador na limpeza.

O predicado opcional `canRefresh` é conferido antes de agendar, antes de ler e antes de aplicar o resultado. Em `src/InventoryApp.tsx`, o efeito já existente passou a informar `intervalMs: 30_000` e `canRefresh: () => !document.querySelector('dialog[open]')`. A lista de quatro telas e a condição de conexão ao banco foram preservadas.

Nenhuma escrita, confirmação, UUID, pedido pendente ou validação de saldo foi alterada. Continuam as proteções da anotação 15; o servidor precisa validar toda operação sobre o saldo atual.

## Verificação desta etapa

Somente cinco casos novos executados e aprovados:

- `tests/browser/periodic-refresh.spec.ts`: duas consultas periódicas sucessivas atualizam as duas categorias sem foco/reconexão/reload; outro caso verifica pausa sob diálogo e em formulário, preservando o rascunho e ausência de escritas.
- `scripts/check-periodic-refresh.mjs`: três casos isolados verificam pausa/resultado descartado sob diálogo e aba oculta, agrupamento de intervalos durante leitura lenta e limpeza de intervalo/agendamento ao sair.

Chrome/Windows, relógio controlado e respostas simuladas. Não houve operação no banco real ou ensaio em dois aparelhos. Compilação aprovada; análise dos arquivos mantém somente o aviso de efeito React preexistente em InventoryApp. Nenhum teste anteriormente concluído foi repetido. Alteração não publicada nesta rodada.

## O que riscar

- Pode riscar a subparte da 16: **atualizar estoque das telas de consulta enquanto permanecem abertas**.
- Não riscar a anotação 16 inteira: faltam relatórios separados, definição/necessidade de recebimento instantâneo e validação real entre aparelhos.
- Anotação 15 continua parcial: confirmação de descarte/devolução já entregue localmente, restante da revisão de prevenção ainda aberto.
- Anotação 24 continua concluída quanto a preparar o roteiro; execução humana segue pendente.

Seguimento por número em `progresso-26-anotacoes.md`. Design geral somente depois das 26 anotações.
