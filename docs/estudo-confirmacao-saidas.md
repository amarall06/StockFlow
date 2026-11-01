# Anotações — primeira etapa: confirmação de saídas críticas

Atualização posterior de 01/11/2026: anotação 15 concluída na implementação local dos fluxos atuais, em `fechamento-anotacao-15.md`. A pergunta foi ampliada também a Venda e outras operações de caixas, com travas imediatas; 16 casos novos aprovados, sem repetir os quatro deste primeiro recorte. Os registros abaixo descrevem o estado histórico da primeira etapa.

Implementação local de 01/11/2026, após a entrega publicada `a6b874b`. Pauta: grupo 2, confiabilidade e alertas; recorte do item 15 das 26 anotações. Não representa conclusão de toda a revisão de segurança (7), prevenção (15) ou sincronização (16).

## Comportamento

Uma saída nova de Descarte ou Devolução ao fornecedor exige confirmação final antes do envio. A janela nativa do navegador apresenta motivo, código, localização, situação, caixas, saldo consultado após a saída, observação/destino e referência quando preenchida. O texto informa que o servidor validará novamente o saldo.

Cancelar preserva os campos e não cria pedido pendente, UUID ou requisição de saída. Confirmar continua o fluxo existente: guardar o pedido por conta/aba, enviar com UUID e atualizar estoque/histórico. Uma conferência de pedido já pendente reutiliza a operação original, sem nova pergunta. Venda mantém seu fluxo atual. A confirmação não substitui validação de saldo e permissão no servidor nem a proteção contra duplicação.

## Código e localização

Em `src/components/StockOutflows.tsx`, na função `submit`, o bloco foi colocado logo depois de `normalizeOutflow(input)` e antes de `crypto.randomUUID()` / `savePendingOutflow(operation)`.

`reason !== 'sale'` limita a confirmação às duas saídas críticas desta etapa. `window.confirm(...)` abre um diálogo nativo; retorna true ao confirmar e false ao cancelar. O array de linhas é unido por `\n`. `if (!approved) return` encerra o envio no cancelamento antes de qualquer efeito no pedido. Foram reutilizados os rótulos já existentes em `outflowLabels`.

## Verificação nova

`tests/browser/outflow-confirmation.spec.ts`: quatro casos novos aprovados isoladamente no Chrome/Windows, dados simulados:

- Descarte de AGM-35 e MGM-35.
- Devolução ao fornecedor de AGM-35 e MGM-35.

Cada caso confere tipo/conteúdo da confirmação, cancelamento sem requisição nem pedido pendente, preservação do formulário e, em seguida, uma única requisição com código, local, situação, quantidade, motivo, observação, referência e UUID após aceitar. A resposta e o estoque são simulados; não houve retirada nem escrita no banco real. Não foram executados os testes concluídos anteriormente. Compilação da alteração aprovada.

## Continuidade

Etapa local, sem envio/publicação nesta rodada. A seguir, continuar o grupo 2: escolher o próximo recorte da revisão de confiabilidade e preparar a atualização automática de consultas (16), antes do mecanismo compartilhado de avisos (1, 13, 22). Não implementar o conjunto inteiro numa única etapa e não presumir destinatários/prazos de alertas sem defini-los.

Foto real, Safari/iPhone físico e piloto continuam pendentes conforme `roteiro-piloto.md`; usuários, etiquetas e restauração permanecem adiados. O estoque fictício não foi removido.
