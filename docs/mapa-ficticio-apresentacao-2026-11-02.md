# Anotação 18 — mapa e apresentação inteiramente fictícios

02/11/2026. O usuário pediu um mapa fictício Norte/Sul/Leste/Oeste e ampliou o objetivo para mostrar o resultado aos superiores com informações fictícias, substituindo-as por reais posteriormente.

## Entrega

Página independente `/demonstracao.html`, sem login e sem uso do Supabase. Contém 85 caixas fictícias, 65 disponíveis e 20 aguardando testagem; produtos AGM-35/MGM-35 com descrições de demonstração; quatro prateleiras, capacidades editáveis localmente, gráfico e mapa interativo. Há aviso explícito de que todos os dados da página são fictícios. A capacidade da apresentação usa uma chave própria no navegador e não reaproveita configurações de contas da empresa.

No Painel autenticado, o mesmo mapa aparece somente no cenário de demonstração do gráfico de capacidade. Um link abre a apresentação em nova aba. A consulta do estoque real não recebe posições físicas fictícias.

O mapa coloca Norte acima, Sul abaixo, Oeste à esquerda e Leste à direita, com corredor ilustrativo central. Busca por código ou parte dele, sem distinção de maiúsculas, destaca todas as prateleiras correspondentes. AGM-35 aparece em Norte e Leste; MGM-35 em Sul. Uma busca sem resultado não altera os saldos apresentados. Os cartões indicam ocupação, saldo zero e divergência por texto, além de bordas/cores; os detalhes mostram produtos, situações e caixas. Teclado Tab/Enter e retorno do foco ao fechar detalhes.

Leste tem uma **contagem fictícia separada**: referência de 33, contado 31, faltam 2 caixas. Isso não é o excesso de capacidade de 3 caixas do exemplo anterior e não é uma conferência aprovada. Alterar capacidade atualiza o detalhe do mapa sem alterar essa contagem. Oeste está sem caixas no exemplo; não é classificado como espaço físico livre validado.

## Código e finalidade

- `src/lib/shelf-map.ts`: disposição, busca, validação e referência de contagem fictícia, sem mutação dos saldos de exemplo.
- `src/components/FictionalShelfMap.tsx`/CSS: mapa, legenda textual, cartões selecionáveis, busca e detalhes. Integração no modo fictício de `ShelfCapacity.tsx`, que compartilha as capacidades locais já existentes.
- `demonstracao.html`, `src/presentation.tsx`, `Presentation.css`: entrada de apresentação com indicadores e produtos fictícios, tema claro/escuro e área adaptável ao celular. Reutiliza os dados e o componente de capacidade/mapa, sem importar a entrada autenticada.
- `vite.config.ts`: duas entradas de build, mantendo o sistema em `/` e a apresentação em `/demonstracao.html`. A seleção de entrada em `scripts/check-performance.mjs` passou a procurar explicitamente `index.html`, pois a primeira entrada do manifesto agora pode ser a apresentação. Os casos antigos desse script não foram executados.
- `InventoryDashboard.tsx`: link para a apresentação.

Nenhum produto, prateleira, movimento, regra operacional ou conta foi criado no servidor. Esta entrega demonstra painel/capacidade/mapa; não implementa os fluxos ainda pendentes de pedidos, reservas, aprovação de contagem, QR ou sincronização privada do servidor.

## Verificações novas

- `scripts/check-shelf-map.mjs`: busca normalizada/parcial, vários locais, ausência/vazio sem apagar saldos, contagem distinta da capacidade, validação e imutabilidade.
- `scripts/check-presentation-build.mjs`: entradas de sistema/apresentação distintas, recursos JS/CSS presentes e apresentação sem dependência da entrada autenticada/módulo de estoque real.
- `tests/browser/fictional-shelf-map.spec.ts`: cinco casos novos aprovados — geometria e detalhes; busca com múltiplos locais/limpeza/ausência; integração da capacidade sem alterar contagem; apresentação sem login, teclado e auditoria A/AA em 375 px nos dois temas. Monitoramento de rede confirmou zero chamadas ao Supabase na página de apresentação.

Nenhuma suíte ou caso concluído de etapas anteriores foi repetido. Build final e análise dos módulos novos aprovados. A página ainda precisa de conferência física/Safari real quando for adotada pela equipe; auditoria automatizada não encerra acessibilidade manual.

## O que pode riscar

Implementação/verificação do **mapa fictício interativo da 18** e preparação da página de apresentação com informações fictícias. Publicado em `f38cc9c`, conforme registro abaixo.

Para a 18 real faltam: mapa/posições e códigos reais, ligação à consulta autorizada, divergências de conferências aprovadas, persistência compartilhada das configurações e ensaio na empresa. Dados reais não devem ser deduzidos desta planta de demonstração. As demais anotações continuam com os estados de `progresso-26-anotacoes.md`.


## Publicação confirmada

Código `f38cc9c92daf72595161a395e3db5b0ec52a5248`, main, `amarall06/StockFlow`. Vercel success: https://vercel.com/amarall06s-projects/liber-automotive/3iK5hELEFjVt52V6XwhwpAavpUBr

Apresentação: https://liber-automotive.vercel.app/demonstracao.html (sem login). Sistema: https://liber-automotive.vercel.app/. Ambas HTTP 200 e entradas correspondentes ao build multipágina. Dezesseis recursos públicos de entrada/Painel/apresentação e dependências iguais por SHA-256 ao build aprovado; diagnóstico local ignorado em `test-results/publicacao-f38cc9c/hashes.json`. Nenhum caso concluído foi repetido para publicar; `[skip ci]` evitou repetição das suítes completas, com compilação normal da Vercel. Sem acesso/escrita ao Supabase.

Pode riscar implementação/verificação/publicação do mapa fictício da 18 e da apresentação. Roteiro para mostrar aos superiores: `roteiro-apresentacao-ficticia.md`. Continua sendo um protótipo de painel/capacidade/mapa; as demais funcionalidades pendentes dos 26 não foram marcadas concluídas.
