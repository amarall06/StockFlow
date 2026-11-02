# Publicação das subpartes prontas — 01/11/2026

Código `a726b26c4df43b6f424aa80e340db8246fa80a29`, branch main, repositório `amarall06/StockFlow`.

Produção: https://liber-automotive.vercel.app/
Vercel success: https://vercel.com/amarall06s-projects/liber-automotive/58myHFBJqjgB2nhpfung4hd2tezZ

Publicados os escopos implementados de 3 (resumos por situação), 13 (avisos), 17 (contagem/CSV local), 20 (divergências locais), 22 (confirmação de saída pendente), 23 (última movimentação fora da janela) e seus recortes de formulário/teclado/celular (25/26). A aprovação de contagem e sincronização instantânea no servidor não foram ativadas.

Seis arquivos servidos no domínio conferiram por SHA-256 com o build anteriormente aprovado: JavaScript inicial `index-lHKtys_x.js`, `InventoryApp-CBCRGH13.js`, `InventoryDashboard-CP94aNvI.js` e os três CSS associados. Domínio HTTP 200. Comparação registrada localmente em `test-results/publicacao-a726b26/hashes.json` (arquivo de diagnóstico ignorado pelo Git).

As evidências funcionais são as já aprovadas em `anotacao-23-ultima-movimentacao.md` e `anotacoes-sem-servidor-2026-11-01.md`. Nenhum desses testes foi repetido para publicar. Commit usou `[skip ci]` para não reexecutar as suítes completas de GitHub Actions; a Vercel realizou sua compilação de publicação normalmente. O conector Vercel estava indisponível; envio pela integração Git e conferência pelo status público do commit e arquivos públicos.

Pode riscar implementação e publicação dos escopos acima, conservando as limitações das anotações. Contagem permanece rascunho por conta/aparelho, sem ajuste de saldo e sem aprovação. Os itens inteiros que dependem de servidor, regras, dados físicos ou piloto continuam parciais. Nenhuma escrita no Supabase nem alteração de credenciais nesta publicação.
