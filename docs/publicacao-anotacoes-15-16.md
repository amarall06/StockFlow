# Publicação das anotações 15 e 16 — 01/11/2026

## Conjunto preparado

Base remota conferida: `a6b874b12fda792f04c5e6ee60d5b6efcf432f7e`, main de `amarall06/StockFlow`. Destino existente: Vercel, equipe `amarall06s-projects`, projeto `liber-automotive`, domínio https://liber-automotive.vercel.app/.

Anotação 15: confirmações das operações atuais que alteram caixas e travas imediatas de envio, preservando validações de saldo, UUIDs e recuperação existentes. Guia `fechamento-anotacao-15.md`.

Anotação 16: leitura automática a cada 30 segundos com aba visível e ao retomar janela/aba ou conexão. Inclui estoque das telas de consulta, Giro/ABC, relatórios do Painel, Garantia e Histórico. Preserva filtros, rascunhos e diálogos conforme os guias individuais, mantém dados em falha e descarta respostas antigas. Não é recebimento instantâneo de eventos do servidor e não inclui escrita offline.

## Evidência reaproveitada

Nas etapas anteriores deste chat foram aprovados **51 casos novos**: 45 de navegador e 6 isolados. Somam: confirmação inicial de saídas (4), retomada (3 navegador + 3 isolados), atualização periódica (2 navegador + 3 isolados), prevenção das operações (16), Giro automático (4), Painel automático (5), Garantia automática (6) e Histórico automático (5). Os relatórios de cada etapa registram o alcance, as correções de testes e os limites.

A última compilação, após a implementação do Histórico, passou. A análise não introduziu novos avisos; permanecem os avisos de efeitos React já conhecidos. Nenhum teste funcional, rodada SQL ou ensaio de concorrência foi repetido nesta etapa de publicação. O commit usa `[skip ci]` para não acionar a bateria completa que repetiria os testes, conforme orientação do usuário. Isso não deve ser apresentado como CI completo executado para esta revisão.

## Conferência da publicação

O envio deve ser confirmado pela main remota e pelo status Vercel associado ao commit. A conferência pública compara hashes dos arquivos publicados com a última compilação aprovada: inicial, InventoryApp e módulos alterados de relatórios/operações. Essa leitura de arquivos não acessa contas ou dados autenticados.

Enquanto não houver evidência registrada do envio e dos hashes, não tomar as publicações antigas como prova de que este conjunto já está online. A confirmação efetiva será acrescentada após a publicação.

## Pendências preservadas

Não houve migração, escrita no Supabase, limpeza de estoque ou upload de foto. A anotação 15 pode ser marcada como implementação concluída; a 16 inteira continua parcial por definição do modo instantâneo e ensaio real entre aparelhos. Preparação do roteiro (24) entregue; piloto, foto real e Safari físico não realizados nesta revisão.

Depois da publicação, a próxima etapa da 16 deve tratar a definição de recebimento instantâneo e o ensaio entre aparelhos, sem repetir os testes locais aprovados nem declarar validação humana com base nas simulações. Design geral continua para depois das 26 anotações.
