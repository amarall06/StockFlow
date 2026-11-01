# Anotação 15 — implementação local concluída

Concluída em 01/11/2026 para os fluxos atuais do estoque (API 16). Código ainda local, sem publicação nesta rodada. Não representa liberação do piloto ou conclusão da revisão contínua de segurança da anotação 7.

## Escopo entregue

| Operação atual | Confirmação final | Proteção do envio |
| --- | --- | --- |
| Entrada de amortecedores/molas | Produto, local, situação, caixas, fornecedor/lote | Trava imediata, bloqueio visual e UUID existente |
| Venda, descarte e devolução ao fornecedor | Produto, origem, situação, caixas, saldo esperado, observação/referência | Trava imediata e pedido por conta/aba com UUID existentes |
| Transferência de amortecedores/molas | Produto, origem/destino, situação, caixas e saldo esperado na origem | Trava imediata e pedido por conta/aba com UUID existentes |
| Aprovação de amortecedores | Produto, local, caixas e mudança de situação | Trava imediata, bloqueio visual e UUID existente; não se aplica a molas |
| Entrada/retirada de garantia | Fabricante, categoria, caixas, saldo esperado e observação | Trava imediata, bloqueio visual e UUID existente |
| Devolução recebida/atualizada | Identificação, local, caixas, andamento, fabricante, motivo/destino e efeito na garantia | Trava imediata, bloqueio visual e UUID/versão esperada existentes |
| Mínimo do produto | Salvar limite continua sendo ação explícita; não movimenta caixas | Trava imediata, bloqueio visual e UUID/versão esperada existentes |

As recusas de quantidade/saldo, categoria, situação e permissão do servidor permanecem vigentes. Evidências anteriores de saldo, funções e concorrência em `relatorio-testes-operacionais.md` e relatórios de entrega foram reaproveitadas, sem nova rodada SQL. Nenhuma migração foi necessária.

## Código e motivo

`src/lib/confirm-operation.ts` centraliza a janela nativa para as novas confirmações. Ela apresenta o resumo e devolve true/false. Os componentes encerram o envio no false, antes do UUID de pedido e da requisição. A saída normal conserva o resumo já existente e agora também o exige para Venda.

Confirmar não substitui a validação do servidor. Saldos mostrados na pergunta são da consulta atual e podem mudar enquanto outra pessoa opera. Conferir um pedido de saída/transferência já pendente continua reutilizando seus dados e UUID originais; não vira uma nova operação.

`ReceiptForm.tsx`, `ShockTesting.tsx`, `WarrantyBoxesDialog.tsx`, `WarrantyReturns.tsx` e `StockAlerts.tsx` receberam uma referência `busy`. Sua alteração é imediata, antes de qualquer espera, e bloqueia uma segunda tentativa mesmo antes de React desabilitar o botão. O bloco finally libera a trava no cancelamento, sucesso ou falha. O cadastro de fornecedor compartilha a trava da entrada para não concorrer com ela.

`StockTransfers.tsx` recebeu o resumo antes de guardar a operação; conserva a trava e recuperação existentes. `StockOutflows.tsx` ampliou a pergunta a Venda, mantendo descarte/devolução já conferidos. Não se alteraram os identificadores, RPCs, saldos ou permissões.

## Testes novos

`tests/browser/operation-prevention.spec.ts`: **16 casos novos aprovados**, Chrome/Windows, respostas simuladas. Entradas, vendas, transferências, entradas/retiradas de garantia, recebimentos em garantia e encerramentos cobrem amortecedores e molas; aprovação cobre apenas amortecedores; um caso cobre o mínimo.

Nas operações confirmadas, cada caso cancela e confere ausência de requisição/pedido pendente, depois envia duas tentativas seguidas com resposta bloqueada. Verifica uma única pergunta, uma única requisição, UUID e bloqueio visual até liberar a resposta simulada. No mínimo, verifica somente o envio único, sem pergunta extra.

A preparação dos testes ganhou sobrescritas opcionais de respostas no helper `tests/browser/helpers/keyboard.ts`, mantendo os padrões anteriores. O teste amplo já existente de transferência recebeu aceite da nova pergunta para continuar compatível, mas **não foi executado novamente**. Os quatro testes anteriores de descarte/devolução também não foram repetidos.

Build aprovado e análise dos oito arquivos alterados sem avisos. Não houve escrita no Supabase, ensaio com credenciais reais, criação de contas ou exclusão de estoque.

## Lista e próxima etapa

- **15: pode riscar a implementação solicitada dos fluxos atuais.** Resta publicar o conjunto local; os limites de ensaios reais pertencem à implantação/piloto e continuam registrados.
- **24: preparação do roteiro concluída**, execução com equipe pendente.
- **16: parcial**, com retomada e atualização periódica do estoque já feitas; continuar pelos relatórios próprios e ensaio entre aparelhos, sem repetir os casos concluídos.

Não iniciar outro item nesta rodada. A melhoria geral do design permanece para depois das 26 anotações. Referência por número: `progresso-26-anotacoes.md`.
