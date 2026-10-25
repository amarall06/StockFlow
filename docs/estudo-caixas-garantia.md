# Caixas em garantia por fabricante

## Ativar

Execute uma vez o conteúdo completo de `supabase/migrations/202610240008_warranty_boxes.sql` em uma nova consulta do SQL Editor, depois da migração 007. Recarregue o site e abra **Garantia**. Não repita as migrações anteriores nem o seed.

Cada fabricante mostra o total de caixas e os saldos separados de amortecedores e molas. Os saldos começam zerados; a migração não inventa quantidades. Um administrador pode usar **Adicionar caixas** ou **Retirar caixas**, escolher a categoria e a quantidade inteira, acrescentar uma observação opcional e confirmar.

As demais contas ativas consultam os saldos. A ampliação das permissões de garantia para outros cargos ainda depende de definição; a etapa de administração de usuários continua adiada.

## Regras

- Saldo por fabricante e categoria, em caixas inteiras. Este cadastro não exige código de produto nem presume que uma caixa devolvida tenha duas peças completas.
- Entrada soma; retirada desconta somente dessa garantia. A retirada não retorna caixas automaticamente ao estoque normal ou ao saldo para venda.
- O banco impede retirar mais que o disponível ou informar quantidade negativa/zero.
- Toda operação mantém direção, quantidade, saldo resultante, observação, conta responsável e horário do servidor.
- Não foi criado outro botão de histórico na garantia, respeitando o pedido de deixar esse atalho apenas em Aplicações.
- Molas e amortecedores têm contagens próprias. Molas continuam sem testagem.

## Código

`loadWarrantyManufacturers` em `src/lib/warranty-api.ts` carrega os saldos junto com os fabricantes quando a migração estiver ativa. A falta de movimentações representa saldo inicial zero; falha de consulta mostra erro, sem fingir que o saldo zerou.

`WarrantyManufacturers.tsx` apresenta o total de cada fabricante e abre a janela correta de entrada ou retirada. O resultado é recarregado do banco depois de cada confirmação.

`WarrantyBoxesDialog.tsx` guarda categoria, quantidade, observação e estado de envio. `submit` valida os campos e aguarda `changeWarrantyBoxes`. O diálogo impede novo envio enquanto a operação está em andamento. Na retirada, escolhe inicialmente uma categoria com saldo quando somente molas têm caixas disponíveis.

`requestId` é um identificador do envio, não uma etiqueta de caixa. Se uma resposta de rede falhar e o mesmo envio for repetido, a função pode confirmar a operação anterior sem movimentar as caixas duas vezes. Alterar os campos começa outro envio.

## Banco

`warranty_box_balances` mantém um saldo não negativo por fabricante e categoria. `warranty_box_movements` mantém os eventos. As tabelas são separadas de `stock_balances` e `stock_movements` do estoque normal.

`change_warranty_boxes` verifica Administrador, bloqueia o fabricante para serializar operações concorrentes, confere a identificação do envio, calcula o novo saldo e grava o evento. A atualização e o histórico ocorrem na mesma transação: se uma parte falhar, tudo é cancelado. RLS controla a consulta, e a aplicação não tem escrita direta nas tabelas.

## Conferência após ativar

Use quantidades fictícias: adicione 2 caixas de amortecedores em um fabricante, retire 1 e recarregue. O fabricante deve permanecer com 1 caixa dessa categoria. As caixas de molas e dos outros fabricantes não devem mudar. Uma retirada maior que o disponível deve ser recusada.

Migração 008 confirmada na interface conectada ao Supabase. Foram adicionadas e retiradas uma caixa de amortecedores e uma de molas na Trebor, restaurando o saldo inicial zero. A entrada de amortecedores persistiu após recarregar o site. A interface bloqueou retirar 2 caixas com saldo 1 e selecionou Molas automaticamente quando somente essa categoria tinha saldo. Os outros fabricantes mantiveram seus saldos. Concorrência e repetição após falha de rede não foram simuladas.

### Como o código funciona

`const` cria uma referência que não será reatribuída. `const [quantity, setQuantity] = useState('1')` guarda o texto digitado entre renderizações. `setQuantity` atualiza esse valor e solicita uma nova renderização. O `onChange` do campo chama `setQuantity(event.target.value)` a cada edição.

O `onClick` de Adicionar caixas abre a janela. O botão de confirmação usa `type="submit"`, acionando o `onSubmit` do formulário. A função `submit` converte o texto com `Number(quantity)`, verifica caixas inteiras positivas e usa `await changeWarrantyBoxes(...)` para aguardar o banco. O banco atualiza saldo e registro da movimentação na mesma transação. Depois, `onSaved` fecha a janela e recarrega os saldos.

## Ícones em todo o site

`ThemeToggle.tsx` é o botão compartilhado pelo cabeçalho de todas as páginas e pelas telas de login, carregamento e acesso. No modo claro ele mostra uma meia-lua; no escuro, um sol. O título e `aria-label` informam a ação, embora o botão não tenha texto visível. O estado do tema fica em `App` e é salvo no navegador para permanecer ao recarregar.

`EditButton.tsx` padroniza o lápis de edição em Aplicações e no cadastro de fabricantes. Botões de salvar e cancelar continuam com texto, distinguindo as ações. O lápis para cadastro salvo de aplicações continua apenas nessa aba.
