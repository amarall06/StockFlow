# Saídas do estoque normal

## Ativação concluída

A migração `supabase/migrations/202610250004_stock_outflows.sql` foi aplicada pelo usuário e a API 11 conferida pela interface. Não repetir neste banco. Em ambiente novo, aplicar a cadeia em ordem, uma vez cada. A aba Saídas aparece para Administrador; bancos anteriores mostram aviso sem liberar gravação.

## Fluxo e permissões

Escolha categoria, motivo, código/local/situação de origem e quantidade inteira de caixas. O formulário mostra o saldo atual e o saldo esperado após a saída. Referência é opcional. Descarte e devolução ao fornecedor exigem observação, incluindo motivo e destino. O sistema não pressupõe o nome do fornecedor nem o destino de uma caixa.

Nesta primeira versão, apenas Administrador registra saídas. Não foram ampliadas permissões dos demais cargos: a administração de usuários continua adiada. Outras contas ativas podem consultar os eventos no Histórico, conforme as políticas de leitura existentes.

Venda de amortecedores usa somente Liberado para venda. Molas usam Em estoque e não passam por teste. Descarte e devolução ao fornecedor podem retirar amortecedores aguardando teste ou liberados. A quantidade nunca pode ultrapassar o saldo. Quando uma linha zera, ela deixa de aparecer no estoque.

Uma venda é registrada como `sale`, descarte como `discard` e devolução ao fornecedor como `supplier_return`. Transferência, garantia e ajustes continuam separados. A saída não cria entrada em outro local e não movimenta o saldo da garantia. Ao retirar caixas da garantia, usar a própria área de garantia. Não registrar a mesma retirada nas duas áreas.

O histórico mostra operação, quantidade, origem, situação anterior, responsável, data, observação e referência quando informada. O nome do responsável é copiado do perfil no momento da saída, preservando a autoria legível se o nome do perfil mudar depois. Não há edição ou exclusão de eventos pela tela; correções e estornos exigirão uma operação auditada futura.

## Limites desta fase

As saídas usam saldo agrupado por código/local/situação. Ainda não escolhem lote, não calculam FIFO nem apuram o saldo remanescente de um lote. Não presumir que a primeira caixa retirada era a última recebida. A identificação por caixa e QR continua adiada.

As vendas registradas fornecem dados para análises futuras de demanda em quantidade. Descartes e devoluções não devem entrar nessa demanda. Valores, custo e faturamento não estão sendo registrados nesta fase; não calcular capital imobilizado ou ABC financeira sem esses dados.

## Código para estudar

`outflowLabels` associa cada código interno ao texto da tela. `OutflowReason` limita as opções no TypeScript. `eligibleOutflows` filtra os saldos que podem sair pela operação escolhida; para venda de amortecedores, exclui aguardando teste. Essa regra também existe no SQL, onde não depende do navegador.

`normalizeOutflow` valida caixas inteiras e a observação de operações que não são vendas. Converte o nome da situação para o código do banco e transforma os opcionais vazios em `null`. `registerOutflow` chama a RPC e traduz erros de saldo, permissão e dados inválidos.

`StockOutflows` usa `useState` para categoria, origem, motivo, quantidade e mensagens. Exemplo: `const [quantity, setQuantity] = useState('1')`; o campo chama `setQuantity` no `onChange`. O estado começa como texto porque vem de um input; `Number(quantity)` o converte antes da validação.

`keyOf` combina código, local e situação para identificar a linha escolhida, sem misturar duas situações do mesmo produto. `selected` busca o saldo ainda disponível com essa chave. Não substitui automaticamente uma origem que deixou de existir por outra prateleira.

O `onClick` do menu chama `changePage('outflow')`. O formulário usa `onSubmit={submit}` para validar e aguardar a gravação com `await registerOutflow(...)`. `try/catch/finally` separa o sucesso, o erro e o encerramento do carregamento.

`useRef` conserva a identificação da tentativa em `requestId`. Repetir o mesmo envio após uma falha de resposta não pode retirar caixas novamente. Alterar os campos inicia outra tentativa; em caso de dúvida, consultar o histórico antes de mudar os dados.

`recorded` marca uma gravação já confirmada. Se a atualização da consulta falhar depois de gravar, o formulário fica bloqueado e Atualizar estoque apenas repete a consulta. Isso evita tratar uma falha de leitura como se a saída não tivesse sido salva.

No banco, `register_stock_outflow` verifica Administrador ativo, motivo, categoria e situação. O usuário e a data vêm da sessão e do servidor. A função bloqueia o saldo de origem com `for update`, recusa quantidade excessiva, desconta e grava o histórico na mesma transação. Se qualquer passo falhar, tudo é desfeito. O identificador de envio único e o bloqueio por requisição evitam repetição simultânea. Não há escrita direta do cliente nos saldos.

## Verificação

`node scripts/check-outflows.mjs` verifica venda apenas de liberados, molas Em estoque, caixas inteiras, retirada excessiva, observação obrigatória, opções de motivos na interface e bloqueio do formulário por cargo/ativação. Não acessa o banco.

Compilação passou e lint não trouxe avisos novos. Conferido no Supabase: venda fictícia de 1 caixa AGM-35/A01/Liberado para venda, referência DEMO-VENDA-A, e de 1 caixa MGM-35/A03/Em estoque, referência DEMO-VENDA-M. As notas indicam testes fictícios sem venda real. O saldo liberado de AGM-35 em A01 zerou e saiu da seleção. A mola em A03 passou de 3 para 2 caixas. A tela bloqueou retirada de 2 caixas onde havia 1 e impediu descarte sem observação (nenhum descarte foi salvo).

Após recarregar: 38 caixas de amortecedores, sendo 25 aguardando e 13 liberadas; 15 caixas de molas. Os eventos de venda foram preservados no histórico com origem, situação, referência, observação e responsável. Não desfazer esses testes apagando eventos.

Atualização de 25/10: descarte e devolução nas duas categorias, conta sem permissão, reenvio no banco e concorrência por bloqueio foram ensaiados em transações com rollback. Foram 19 verificações de saídas, mais 37 da matriz de cargos, e duas conexões reais no ensaio de bloqueio/retomada. Saldos, perfis e histórico foram preservados. Não foi simulado reenvio após queda HTTP real nem disputa com COMMIT do vencedor. Ver `relatorio-testes-operacionais.md` para evidências e limites. O item associado de correções/estornos saiu da pauta por pedido posterior do usuário.
