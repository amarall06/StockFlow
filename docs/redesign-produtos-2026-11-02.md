# Redesign da tela Produtos — 02/11/2026

Tela adaptada às referências clara e escura, usando os tokens, a fonte Inter local e o layout comum já publicados. Não foram instaladas bibliotecas nem alteradas regras, permissões, rotas, APIs, banco, autenticação ou funcionamento offline.

## O que mudou e onde

- `src/components/ProductsOverview.tsx`: componente visual separado, com cabeçalho comum, cartão, filtros por categoria, busca por código/aplicações e tabela reutilizável. Recebe o catálogo e o estoque já carregados; usa `calculateStockAlerts`, a mesma regra de saldo e mínimo do sistema.
- `src/components/ProductsOverview.css`: aparência restrita a Produtos, incluindo cores dos dois temas, fontes, espaçamento, selos e adaptação para celular. A tabela rola dentro do cartão, sem alargar a página; controles têm ao menos 44px.
- `src/components/InventoryNavigation.tsx`: mantém a exportação anterior de Produtos, preservando o carregamento e os demais módulos.
- `src/InventoryApp.tsx`: passa o estoque existente ao componente, sem buscar ou gravar novos dados.
- `tests/browser/products-redesign.spec.ts`: apenas casos novos desta tela.

## Decisões para preservar os dados

O usuário aprovou Localização padrão no lugar de Posição: não há campo dianteiro/traseiro no cadastro atual. Não foi inventada posição. Quantidade considera o estoque normal conforme a regra existente, separando a Garantia. Mínimo ausente aparece como Não informado/Sem mínimo definido; saldo zero aparece como Sem estoque.

Novo produto, exclusivo do Administrador, oferece Amortecedor ou Mola e abre o fluxo existente de cadastro e entrada inicial. Não cria produto nem saldo ao navegar. Atalhos mantém a edição/consulta de aplicações e os dois estoques. O código abre foto, aplicações, disponibilidade/testagem e acesso ao estoque da categoria, sem remover recursos anteriores.

## Verificação

Doze casos novos aprovados: dois temas desktop com contraste/acessibilidade, dois temas no celular com teclado e alvos de toque, filtros/busca/nenhum resultado, detalhes/foto/estoque, dois cadastros existentes, permissão de consulta e mínimos/saldo zero, 320px/tablet, acabamento tipográfico/menus por teclado/capturas e catálogo vazio. Casos parametrizados e capturas finais usam dados controlados de teste; esses valores não foram incluídos no site.

Somente os novos casos pendentes ou que falharam foram executados nas rodadas seguintes. As falhas foram de preparação do teste (nome do menu, saldo de produto removido na simulação e capitalização do título), corrigidas sem mudar regras do sistema. Nenhuma suíte anterior foi executada. Build aprovado; análise dos arquivos sem erros, com um aviso preexistente de efeito em InventoryApp. Revisão React: hooks incondicionais, chaves estáveis por código, botões reais, expansão acessível, estado local de filtros e nenhuma nova consulta/efeito de dados.

Capturas finais em `docs/design/produtos-light.png`, `produtos-dark.png` e versões `-mobile.png`.

## Como conferir no site

1. Abra Produtos; alterne os temas nas opções da conta.
2. Filtre Amortecedores/Molas e busque um código ou aplicação existente. Confira saldo, mínimo e localização.
3. Toque no código para abrir foto e aplicações. Use Ver estoque para acessar o estoque correspondente.
4. Abra Atalhos para acessar aplicações ou os estoques. Como Administrador, Novo produto abre o formulário existente após escolher o tipo; conferir não exige salvar.
5. No celular, abra Produtos pelo Menu. Deslize a tabela para ver as colunas à direita; a página permanece ajustada à largura da tela.

## Publicação

Aguardando confirmação da versão desta etapa no domínio de produção. Próximas telas do redesign: Garantia e Alertas. Esta entrega conclui Produtos, sem encerrar pendências operacionais das 26 anotações.
