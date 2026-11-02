# Anotação 19 — lista de retirada local

02/11/2026. Complemento do modo missão, com dados de exemplo e sem Supabase.

## Acesso e comportamento

Painel → Visualização do Painel → Apresentação → Modo missão. Após iniciar uma missão, use **Baixar lista de retirada PDF** ou **Baixar lista de retirada CSV**. Consulta também pode baixar a missão existente, sem operar a separação.

Cada cópia contém pedido/cliente, situação, data de geração e atualização, sequência do roteiro, prateleira/produto/situação, código textual de leitura e caixas solicitadas/separadas/pendentes. O PDF pode ser impresso pelo visualizador habitual. CSV usa o gerador existente com BOM, separador ponto e vírgula e proteção de textos contra fórmulas.

Missão cancelada é identificada como CANCELADA e não utilizável para retirada. A exportação não altera missão, disponibilidade ou estoque e não confirma venda/expedição. É uma fotografia local do momento; um arquivo antigo não muda depois de cancelamento ou progresso. Conferir sempre a missão atual. Código textual não é etiqueta única de caixa ou QR físico.

## Onde foi colocado

- `src/lib/pick-list.ts`: cria a cópia de dados e os arquivos PDF, com quebra de linha/página e carregamento do gerador PDF somente quando solicitado.
- `src/components/PickMissions.tsx`: botões de download, bloqueio de clique duplicado durante geração e mensagens de sucesso/falha. Dados inválidos não oferecem exportação; falhas preservam a missão.
- `scripts/check-pick-list.mjs`: verificações novas de totais, situação, códigos e isolamento da cópia; gera PDF de inspeção.
- `tests/browser/pick-list.spec.ts`: quatro casos novos, todos aprovados: PDF/conteúdo/imutabilidade; CSV parcial recuperado e troca de pedido; cancelamento nos dois formatos; Consulta e dados inválidos. Nenhum teste anterior executado. Primeira tentativa impedida pelo cache; segunda não iniciou os casos por ausência do Chromium empacotado. Execução efetiva com cache separado e Chrome instalado. Compilação e análise aprovadas. PDF renderizado e inspecionado visualmente.

## Pode riscar e pendências

Pode riscar implementação/testes da lista de retirada PDF/CSV da apresentação local da 19. A 19 inteira permanece parcial: pedidos reais, reserva global transacional, operadores/aparelhos concorrentes, autorização/histórico no servidor, identidade física QR, regras de expedição e piloto. Nenhuma alteração no Supabase.

## Publicação e conferência

Publicado em `64e92a299aa3332c27ced62249652967d9bfbc7c` no site original, https://liber-automotive.vercel.app/ . Domínio HTTP 200 e dezesseis recursos públicos iguais ao build aprovado, incluindo o gerador PDF. Implantação: https://vercel.com/amarall06s-projects/liber-automotive/5aM5AGxD2PWeLypRSB3VXYgFnGqR . Não foram repetidos testes funcionais na publicação. Commits `[skip ci]` evitam a suíte antiga. Os quatro casos novos finalizaram com sucesso; o processo de desenvolvimento precisou ser encerrado manualmente após a execução. Nenhuma alteração de dados reais. Pode riscar implementação, verificação e publicação da lista local PDF/CSV da 19; pendências reais continuam acima.
