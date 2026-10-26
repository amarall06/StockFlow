# Publicação e conferência móvel — 26/10/2026

## GitHub e Vercel: confirmados

O envio executado pelo usuário publicou a revisão `12470504289516194f343c4d5cb4beb5b3d6c558`, “Recupera saidas pendentes por usuario apos recarga”. O Git local ficou sincronizado com origin/main. A página do GitHub confirmou essa revisão e 24 commits.

A Vercel mostrou o deployment `Dq5q9U2pgvtkn4kXA4aAv7SfptoY` como **Ready / Latest / Production / Current**, criado em 26/10/2026 às 19:59:18 (America/Bahia), com duração de 14 segundos. O domínio atual atribuído é `https://liber-automotive.vercel.app/`. A fonte corresponde ao mesmo commit `1247050` da main. Não foi necessário redeploy manual nem alteração de permissões ou variáveis.

O usuário entrou pessoalmente no domínio publicado. A conferência autenticada confirmou 38 caixas de amortecedores, 15 de molas, total 53, oito produtos e dois alertas. O cartão Produtos abriu o catálogo; miniaturas e ampliação das duas categorias funcionaram. Saídas mostrou fontes liberadas para amortecedores e Em estoque para molas. A recarga preservou a sessão e os totais. Não houve envio de formulários, upload ou movimentação. Evidência privada adicional: `outputs/verifications/online-panel-authenticated-20261026.png`.

Evidência privada: `outputs/verifications/production-1247050-ready-20261026.png`.

## Próximo passo executado: conferência visual em tela estreita

Criado `tests/mobile-preview/index.html`, acessível pelo servidor local em `http://127.0.0.1:5173/tests/mobile-preview/index.html`. A página contém um iframe com a interface real do projeto, usando a sessão local já autenticada. Botões alternam a largura do quadro entre 390 e 360 pixels CSS. As media queries do documento interno se aplicam a esse espaço estreito.

Conferidos visualmente e pela árvore de acessibilidade:

- Painel em uma coluna, com totais de 38 amortecedores, 15 molas e 53 caixas.
- Menu horizontal rolável e abertura de Produtos e Alertas.
- Catálogo com oito produtos e miniaturas identificadas como exemplos ilustrativos.
- Abertura e fechamento da foto de amortecedor em 390 e 360 pixels, com imagem contida e texto de exemplo.
- Abertura e fechamento da imagem de mola na largura de 360 pixels.
- Alertas em 360 pixels, com dois produtos no mínimo/abaixo e acesso aos seus controles. Nenhum mínimo foi alterado.

Não foram registradas entradas, saídas, transferências, aprovações ou uploads. Nenhuma conta ou permissão foi criada/alterada. As imagens de exemplo não foram salvas como fotos reais.

Evidências privadas: `outputs/verifications/mobile-panel-390-20261026.png`, `mobile-photo-360-20261026.png` e `mobile-alerts-360-20261026.png`.

## Limites e próximos itens

Esta é uma conferência de layout local com a revisão publicada. Não é emulação completa de iOS nem teste de toque, teclado, câmera ou Safari em iPhone físico. Não cobre todas as telas ou operações em celular. O controle de viewport da ferramenta não mudou a largura efetiva da aba; por isso foi usado o quadro de largura fixa. Não declarar ausência global de overflow com base somente nesses testes visuais.

Continuam pendentes: testar no iPhone real; upload/substituição e persistência de foto apropriada; piloto com equipe e dados autorizados. Testes de contas dos demais cargos, gestão de usuários, etiquetas e restauração continuam adiados conforme instrução do usuário.

## Giro e ABC — conferência local adicional

Conferidos filtros por categoria, 30/90 dias, busca por aplicação, filtro de estoque sem vendas e temas claro/escuro. A busca por Corsa preservou a participação de 50% calculada antes da busca. Molas apresentou quatro códigos, uma caixa vendida e três códigos com estoque sem vendas. No conjunto, duas caixas vendidas e seis códigos com estoque sem vendas. O período de 180 dias passou nos testes de lógica e no banco.

Em quadro local de 360 pixels, filtros e cartões ficam em coluna; gráfico e tabela têm rolagem própria. Evidências privadas `turnover-mobile-360-20261026.png`, `turnover-mobile-bars-360-20261026.png` e `turnover-mobile-chart-360-20261026.png`. Isso não substitui ensaio em iPhone real. Backend API 14 ativo; frontend desta etapa ainda depende da publicação do novo commit.

## Para estudar

O `iframe` cria um documento com sua própria largura. Uma regra CSS como `@media(max-width:650px)` se aplica ao conteúdo interno quando o quadro tem 390 ou 360 pixels, mesmo com o navegador do computador largo. Os botões da página de conferência mudam apenas a largura desse quadro. Não modificam o código do site nem os saldos.

A página fica em `tests/`, fora de `public/`, e não é entrada do build normal. É uma ferramenta local de inspeção; não é um novo módulo do menu operacional.
