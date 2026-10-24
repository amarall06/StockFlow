# Cadastro de veículo, anos e tipo de amortecedor

## Como ativar

Em uma instalação que já usa a regra de molas sem testagem, execute o conteúdo completo de `supabase/migrations/202610240004_product_applications.sql` em uma consulta nova do SQL Editor. Execute essa migração uma vez. Depois recarregue o site e abra **Aplicações**. Não repita o seed de demonstração.

Selecione um código existente, clique em **Adicionar aplicação** e informe um veículo fictício com seus anos. Um produto pode atender mais de um veículo; cada linha guarda uma aplicação. Administradores podem salvar no banco; os demais perfis consultam o cadastro. Em demonstração local, a edição fica no navegador.

O tipo oferece pressurizado a gás, hidráulico convencional, regulável e não informado. Por pedido posterior do usuário, esta aba lista somente amortecedores; o estoque e histórico de molas continuam nas suas áreas. O ícone de lápis fica apenas no quadro **Cadastro salvo** dentro da aba Aplicações. Ele leva ao formulário preenchido; altere os campos e use **Salvar cadastro** para confirmar.

Os novos campos começam vazios: nenhuma informação real de veículo, ano ou tipo foi presumida. Se não houver aplicações estruturadas, a consulta mantém a descrição que já existia.

O histórico de mudanças desse cadastro tem prévia e uma janela completa dentro da própria aba. A ativação e o funcionamento estão em [estudo-historico-aplicacoes.md](estudo-historico-aplicacoes.md); a migração 005 grava as novas modificações junto com cada salvamento.

## Arquivos e funções

- `src/components/ProductCatalog.tsx`: página de edição. `ProductCatalog` controla produto selecionado, alterações pendentes e mensagens. `ProductEditor` mantém as linhas em edição e o tipo escolhido. `changeApplication` altera uma linha por sua chave; `saveDetails` valida os campos e salva no modo correto.
- `src/lib/product-details.ts`: tipos e regras de apresentação. `VehicleApplication` descreve nome e anos, `ShockType` limita os tipos permitidos, `ProductInfo` reúne o cadastro. `formatVehicleYears` produz o texto dos anos; `searchableProductText` inclui carro, anos e tipo na busca do estoque.
- `src/components/ProductApplications.tsx`: apresentação compartilhada pela tabela, resultado da bipagem e visualização do cadastro salvo. O elemento HTML `small` exibe os anos menores que o nome do veículo.
- `src/lib/inventory-api.ts`: `loadInventorySnapshot` carrega os campos novos somente quando a migração estiver disponível. `updateProductDetails` envia a edição ao banco por RPC.
- `src/components/ProductCatalog.css`: organiza formulário, linhas de veículos, visualização e aparência nos temas claro e escuro.

## Exemplos de JavaScript e React

`const` declara uma referência que não será reatribuída. Em `const codes = Object.keys(catalog).sort()`, a variável guarda a lista de códigos disponíveis.

`useState` guarda os campos durante a edição. `setApplications` solicita ao React uma nova lista; o código usa `map` e `filter` para atualizar ou remover uma linha sem modificar a lista anterior diretamente.

`onChange` recebe a nova digitação ou seleção. `onClick` executa ações como adicionar/remover uma aplicação. `onSubmit` envia o formulário; `event.preventDefault()` evita que esse envio recarregue o site.

`async` permite usar `await` para aguardar o banco. `try/catch/finally` separa sucesso, erro e encerramento do carregamento. Durante o salvamento, campos e seleção de produto ficam bloqueados para evitar misturar duas edições.

As chaves de cada linha do formulário são geradas com `crypto.randomUUID()`. Elas identificam a linha na interface; não são códigos dos produtos nem etiquetas físicas de caixas.

## Anos e validações

- 2015 e 2020: **2015–2020**.
- 2015 e 2015: **2015**.
- Inicial vazio e final 2020: **Até 2020**.
- Inicial 2015 e final vazio: **A partir de 2015**.
- Ambos vazios: **Anos não informados**.

O nome é obrigatório em cada linha adicionada. Os anos devem ser inteiros de até quatro algarismos; o inicial não pode ser maior que o final. Linhas idênticas são recusadas. É possível remover todas as aplicações e deixar somente a descrição original.

## O que a migração faz

`product_applications` guarda várias linhas por produto. A chave estrangeira `product_id` vincula cada aplicação ao cadastro correto; uma mola não herda dados do amortecedor de mesmo número. `products.shock_type` guarda o tipo opcional e impede associá-lo a códigos de molas.

A função `update_product_details` verifica a função Administrador no banco, valida a lista e substitui as aplicações em uma transação. Se algo falhar, todo o salvamento é cancelado. As políticas RLS permitem leitura apenas para contas ativas.

O formulário envia também `updated_at`. A função compara esse valor com o cadastro atual: se outra edição já tiver sido salva, solicita recarregar em vez de sobrescrevê-la silenciosamente. A descrição anterior, o código, o saldo, as localizações e o histórico de estoque não são alterados por essa operação.

## Verificação realizada

A compilação passou. Foram verificados formatação de intervalos e anos vazios, múltiplas aplicações, texto menor dos anos e preservação da descrição anterior. Na interface conectada ao banco atual, foram conferidos o aviso de migração pendente e a ausência do campo de tipo nas molas. A migração e um salvamento real dos campos novos ainda precisam ser executados no Supabase.
