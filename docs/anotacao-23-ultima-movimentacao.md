# Anotação 23 — última movimentação conhecida

Implementação local em 01/11/2026, ainda não publicada.

`src/lib/inventory-insights-api.ts` mantém a consulta paginada do período e procura um único evento anterior para cada código com saldo sem evento na janela. Respeita autorização normal da sessão, operações em caixas, código exato e ordenação decrescente de data/ID. Não carrega todo o histórico nem mistura eventos antigos no calor/contadores do período.

`src/lib/last-product-movement.ts` remove códigos repetidos, limita a quatro leituras simultâneas e recusa produto/data incompatíveis. Ausência é nula; erro interrompe a atualização e conserva o comportamento existente de falha, sem transformar recusa em ausência de histórico.

`src/components/InventoryInsights.tsx` mostra a última movimentação conhecida inclusive fora do período, e distingue “sem movimentação no período” de “sem histórico disponível”. A consulta é refeita se os códigos com saldo mudarem. Preserva categoria, período e métrica. Isso não demonstra idade física, lote ou última movimentação não visível à conta.

Verificação somente nova: `scripts/check-last-product-movement.mjs` aprovado (histórico/ausência, deduplicação/concorrência, vazio, recusa, código e datas inválidas); dois testes novos de navegador em `tests/browser/product-last-known.spec.ts` aprovados, cobrindo data anterior, molas/amortecedores, filtros reais da requisição, contagem/calor sem alteração, nenhuma escrita e falha sem falso histórico vazio. Build e análise dos três arquivos aprovados. O cache Vite habitual estava bloqueado; usada configuração temporária com cache separado. Nenhum teste concluído repetido.

Mocks antigos ajustados apenas para distinguir a nova consulta histórica, sem reexecutar seus casos. Pode riscar a subparte local “última movimentação fora da janela”. A 23 continua parcial por rastreabilidade/idade física das caixas e publicação dessa subparte.

Na conferência final, vinculada também a resposta à lista de códigos com saldo, impedindo informação anterior durante mudança dessa lista. Tipagem aprovada novamente. Os dois casos novos passaram após o ajuste; uma expectativa do caso novo foi corrigida para admitir as consultas iniciais do modo de desenvolvimento. Somente o caso novo que falhou foi repetido. Configurações temporárias removidas e servidor de verificação encerrado.
