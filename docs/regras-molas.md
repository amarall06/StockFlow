# Regras de molas

Regras confirmadas: molas são contadas em caixas, não passam por testagem e, quando devolvidas por clientes, normalmente são enviadas para garantia. O número do código da mola é independente do número do amortecedor.

## Cadastro independente

Os exemplos locais novos são MGM-12, MRE-48, MFR-63 e MFI-91. Código, aplicação e localização são cadastrados separadamente dos amortecedores. Os códigos fictícios já carregados no Supabase permanecem com seus números; a nova regra não renumera registros existentes.

`src/lib/product-category.ts` identifica molas apenas pelos prefixos confirmados. Essa função é compartilhada pelo estoque e pelo histórico; ela não relaciona produtos pelo número.

## Situação de estoque

O tipo `StockRow` aceita **Em estoque**, correspondente a `in_stock` no banco. `stockStatusCode` converte o texto da tela para o código SQL. A tela de molas não exibe cartões de testagem nem solicita uma situação de teste na entrada.

`in_stock` indica presença no estoque normal; não representa um teste ou certificação de qualidade. A migração não declara automaticamente elegibilidade para venda no campo `is_available_for_sale`.

## Atualização de uma instalação existente

Execute somente `supabase/migrations/202610240003_springs_without_testing.sql` em uma nova consulta do SQL Editor e recarregue o site. Não repita o seed para fazer essa atualização.

A migração cria a situação, converte os saldos antigos de molas de aguardando testagem/liberado para **Em estoque**, agrupa eventuais saldos no mesmo local e mantém o total. Registra ajustes no histórico e preserva os movimentos anteriores. Tudo ocorre em uma transação: um erro cancela o conjunto de alterações.

A função SQL `receive_stock` reconhece molas no servidor e registra suas entradas como `in_stock`. As permissões de recebimento e transferência continuam valendo. O cadastro com saldo inicial chama essa função e segue a mesma regra.

Até instalar essa migração, a tela avisa que as situações antigas precisam ser atualizadas e bloqueia novas entradas e transferências de molas, evitando gravá-las como se passassem por testagem.

## Devoluções e garantia

Planejar a devolução também para molas, sem etapa de teste. O recebimento deve confirmar o destino, pois o encaminhamento para garantia foi descrito como habitual, não obrigatório em todos os casos. O módulo de garantia ainda precisa de implementação própria; não foi criado encaminhamento automático nem retorno automático ao saldo normal.
