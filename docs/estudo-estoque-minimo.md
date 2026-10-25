# Estoque mínimo e alertas de reposição

## Ativação concluída

A migração `supabase/migrations/202610250005_stock_minimums.sql` foi aplicada pelo usuário e a API 12 confirmada pela interface. Não repetir neste banco. Em ambiente novo, aplicar a cadeia em ordem, uma vez cada. Produtos existentes começam sem limite; os limites fictícios de teste foram configurados explicitamente depois.

## Uso

Alertas de reposição aparece nas páginas de amortecedores e molas. Administrador configura o mínimo por código; outras contas ativas consultam. O botão Configurar mínimos permite escolher qualquer produto da categoria, inclusive sem alerta atual. Nos cartões em alerta, o lápis abre o produto correspondente.

O limite usa caixas inteiras. Vazio significa não configurado; zero continua sendo um limite configurado. O alerta aparece quando o total é menor ou igual ao mínimo. Produtos cadastrados sem saldo aparecem como Sem estoque mesmo sem um mínimo configurado. O quadro distingue contagem de produtos zerados de produtos com saldo positivo no limite ou abaixo dele, evitando contar o mesmo produto nas duas situações.

Amortecedores: somar todas as caixas Aguardando testagem e Liberado para venda, em todas as localizações. Os cartões mostram separadamente a quantidade comercial disponível e a aguardando teste. Disponível para venda igual a zero não significa estoque total zerado se existem caixas esperando teste. Molas: considerar somente Em estoque, sem campos de testagem. Garantia não entra nessa soma.

Saldos existentes em prateleiras inativas também entram no total, evitando alertas falsos de falta. Prateleiras inativas não passam a ser opções de destino para novas entradas. O painel não altera a disponibilidade ou a situação dessas caixas.

A prévia mostra até seis alertas; Ver todos expande a lista. Atualizar alertas refaz a consulta de estoque. Entradas, saídas, transferências e aprovações feitas pelo site também atualizam o estado usado pelos alertas. Não existe notificação por e-mail/push nesta etapa: o aviso é na tela.

## Código explicado

`ProductInfo` ganhou `minimumBoxes` e `minimumUpdatedAt`. O primeiro guarda o limite ou `null`; o segundo guarda a versão daquele limite para detectar edições concorrentes. A versão é separada do cadastro de aplicações, evitando conflito entre alterações de assuntos diferentes.

`loadInventorySnapshot` só solicita as colunas novas quando a API é 12 ou superior. Agora lê todas as localizações para conservar os saldos em locais inativos, mas retorna somente locais ativos na lista dos formulários de entrada/destino.

`calculateStockAlerts` usa um `Map` para somar os saldos por código. Depois percorre o catálogo, incluindo códigos sem linha de estoque. Retorna total, liberadas/disponíveis, aguardando, mínimo e gravidade. `zero` vem antes de `low`; produtos sem alerta ficam como `ok`. Os cartões recebem uma lista ordenada por gravidade e código.

`parseMinimum` converte um campo vazio em `null`, preserva zero e recusa valores negativos/fracionados. `saveStockMinimum` valida e chama o banco, tratando conflito de edição, falta de permissão e resposta ausente.

Em `StockAlerts`, `useState` guarda a janela aberta, a expansão da lista e as mensagens. O botão usa `onClick` para abrir o formulário do produto. Exemplo: `setEditing(row.code)` faz o React renderizar `MinimumDialog` com aquele código.

`MinimumDialog` guarda em um único rascunho código, valor e versão lida. Ao trocar o produto, o `onChange` atualiza os três juntos. A versão não é substituída silenciosamente se o estoque for consultado de novo enquanto o usuário digita. `onSubmit={submit}` valida e usa `await` para aguardar a gravação. `useRef` conserva a identificação do envio para uma repetição após falha de rede.

No SQL, `set_product_minimum` confere Administrador ativo, bloqueia o cadastro, compara a versão e altera somente os campos do mínimo. Eventos guardam valor anterior, valor novo, responsável e horário. Uma alteração concorrente exige atualizar antes de sobrescrever. A tabela de eventos não adiciona outro botão de histórico na interface. A consulta aos mínimos usa a leitura já autorizada do catálogo.

## Verificações

`node scripts/check-stock-alerts.mjs` testa: soma em vários locais, limite inclusivo, diferença entre vazio e zero, produto sem saldo, caixas esperando teste sem falso alerta de ruptura, garantia excluída, molas, preservação dos dados de entrada, saldo em local inativo, compatibilidade com API anterior e opções por cargo.

Conferido no Supabase: AGM-35 com mínimo fictício 18 gerou alerta ao atingir 18 caixas no total (12 aguardando + 6 liberadas), somando várias localizações. MGM-35 com mínimo fictício 5 gerou alerta nas molas, sem campos de testagem. Ambos os limites e alertas persistiram após recarregar. AFR-57 recebeu limite zero, contado como configurado, e depois teve o campo esvaziado, voltando a não configurado. Os limites atuais mantidos são AGM-35 = 18 e MGM-35 = 5; os demais continuam sem mínimo. Nenhuma quantidade foi alterada: permanecem 38 caixas de amortecedores e 15 de molas.

Ainda não exercitados no banco: produto completamente sem saldo (validado no cálculo local), conta de outro cargo, saldo em local inativo (validado com snapshot simulado), concorrência e repetição em falha de rede. Não afirmar esses ensaios adicionais como já realizados.
