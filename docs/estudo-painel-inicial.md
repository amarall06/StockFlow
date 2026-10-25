# Painel inicial de estoque

## Ativação concluída

A migração `supabase/migrations/202610250006_inventory_dashboard.sql` está aplicada e a API 13 foi confirmada pela interface. Não repetir neste banco. Em ambiente novo, aplicar a cadeia em ordem, uma vez cada. Painel é a tela inicial e também fica no menu; os módulos anteriores continuam acessíveis.

Foi relatado erro 42P07 ao tentar criar novamente o índice `stock_movements_dashboard_recent`. A conferência após recarregar mostrou painel e RPC funcionando; portanto não houve necessidade de apagar o índice nem reaplicar o SQL. O erro indica que o objeto já existia, não perda dos dados do estoque.

## Informações mostradas

Filtro por amortecedores e molas juntos, somente amortecedores ou somente molas. O resumo mostra caixas no estoque normal, quantidade de códigos cadastrados, produtos zerados e produtos com saldo positivo no mínimo/abaixo. A prévia de reposição mostra até seis códigos e aponta para os estoques onde se configuram os mínimos.

Vendas: caixas e número de registros de venda dos últimos 30 dias, até dez códigos com mais caixas vendidas, ordenados por quantidade e código. O período é definido pelo horário do banco e mostrado na tela. Transferências, descartes, devoluções, garantias e ajustes não entram em demanda de vendas. Não se contam peças avulsas: os registros atuais são em caixas. Sem vendas, aparece um estado vazio, sem gráfico fictício.

O ranking é por código, não por modelo de veículo. Um produto pode atender vários veículos, e a venda atual não identifica qual veículo motivou a compra. Atribuir a venda a cada veículo duplicaria a demanda. Essa associação precisa de um dado específico na venda antes de existir um gráfico por modelo.

Entradas recentes: até dez recebimentos efetivamente registrados, com código, caixas, data, local, fornecedor e lote quando informados. Essa lista é independente dos 30 dias das vendas e pode mostrar recebimentos mais antigos. Saldos de carga inicial como Ajuste de inventário não são apresentados como lotes recebidos. Dados ausentes aparecem Não informado.

O painel é de consulta para contas ativas. Não cadastra usuários, não muda cargos, não grava estoque nem executa compras. As informações permanecem fictícias até o usuário fornecer dados autorizados. As vendas de demonstração já registradas aparecem normalmente na demonstração; não interpretá-las como atividade real da empresa.

## Atualização e limites

Atualizar painel consulta novamente o estoque e os relatórios. Mudar categoria refaz o relatório e o resumo daquela categoria. Retornar ao painel após outra operação também carrega o relatório. Falhas de consulta mostram erro, sem substituir dados ausentes por vendas zeradas inventadas. Não há atualização automática contínua ou notificações por e-mail nesta etapa.

Os saldos e as movimentações são consultas separadas; representam as últimas leituras da tela, não uma transação única de fotografia simultânea. O horário exibido junto das movimentações identifica a consulta do relatório. Limites, falta e saldo seguem as regras da etapa anterior, com garantia fora do estoque normal.

Não é Curva ABC financeira: não há custo ou preço nas vendas atuais. Também não mede idade do estoque remanescente, pois entradas e saídas ainda não são vinculadas por lote.

## Entendendo o código

`inventory_dashboard` é uma função SQL de leitura. Verifica conta ativa e categoria, calcula o começo do período de 30 dias e soma apenas eventos `sale`. O total é calculado antes de limitar o ranking a dez produtos. Outra consulta pega os dez recebimentos mais recentes. O índice por operação/data ajuda essas buscas. Nenhuma informação é enviada a serviços de gráficos externos.

`loadDashboardReport` chama essa função com a categoria escolhida. `validateDashboardReport` confere datas, quantidades e listas antes de exibi-las. Se houver falha ou resposta incompleta, mostra erro em vez de inventar números.

`dashboardStockSummary` reaproveita `calculateStockAlerts` para calcular os cartões das duas categorias. A função começa pelo catálogo, incluindo produtos sem saldo. Mantém produtos zerados separados dos produtos com saldo positivo no limite.

`InventoryDashboard` usa `useState` para categoria, revisão, carregamento e resposta. O `onChange` do filtro chama `setCategory`; o `useEffect` consulta o novo relatório e descarta respostas antigas de filtros anteriores. `onClick` em Atualizar painel chama `refresh`, que aguarda o estoque com `await` e incrementa a revisão para consultar as movimentações.

`DashboardActivity` apresenta o relatório confirmado. `map` percorre produtos e recebimentos para montar as linhas. As barras usam `quantidade / maiorQuantidade * 100` para comparar os códigos; o número continua escrito ao lado, sem depender da cor para leitura. Datas são formatadas sem mostrar o nome do estado/fuso, conforme solicitado.

O menu e a marca inicial chamam `changePage('dashboard')`. O App começa nessa página após o login. Os botões de consulta levam ao estoque de amortecedores ou molas, preservando suas regras.

## Verificação

`node scripts/check-dashboard.mjs` verifica resumos por categoria, produtos sem saldo, mínimos, validação da resposta, categoria da RPC, barras com quantidades, fornecedor/lote, estados vazios e bloqueio antes de ativar. Não executa SQL nem consulta o banco.

Compilação passou e lint não trouxe avisos novos. Conferido no Supabase após recarregar: duas caixas vendidas em dois registros, uma AGM-35 e uma MGM-35; entradas DEMO-A e DEMO-M com Fornecedor fictício. Resumo conjunto de 53 caixas normais em oito códigos, sem produtos zerados e com dois alertas de mínimo. Filtro Amortecedores mostrou 38 caixas, quatro códigos, um alerta, uma venda e entrada DEMO-A. Filtro Molas mostrou 15 caixas, quatro códigos, um alerta, uma venda e entrada DEMO-M. A consulta não gravou estoque nem movimentações. A visão final foi restaurada para as duas categorias.

Ainda não ensaiados no banco: outra conta/cargo, categoria/período completamente sem vendas e volume superior a dez códigos no ranking. Estados vazios e resumos foram verificados localmente. Não declarar esses ensaios adicionais como já executados.
