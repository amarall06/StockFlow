# Fabricantes da garantia

## Ativar e usar

Execute uma vez o conteúdo completo de `supabase/migrations/202610240007_warranty_manufacturers.sql` em uma nova consulta do SQL Editor, depois da migração 006. Recarregue o site e abra **Garantia**.

A lista começa com Moripar, Trebor e New Parts, nomes fornecidos pelo usuário. Administradores podem cadastrar outros nomes e editar os existentes. As demais contas ativas consultam a lista e não veem os formulários ou botões de alteração.

O cadastro é compartilhado entre amortecedores e molas. Não há conversão de prefixos de montadora para fabricante. O controle de caixas por fabricante está preparado na migração 008, descrita em [estudo-caixas-garantia.md](estudo-caixas-garantia.md). O fluxo detalhado de cada devolução/peça permanece para uma etapa posterior.

## Código

- `src/components/WarrantyManufacturers.tsx`: página Garantia, busca de nomes, lista de fabricantes, formulário e mensagens. `editManufacturer` preenche o formulário com a linha escolhida. `saveManufacturer` trata o envio e solicita atualização da lista após o banco confirmar o salvamento.
- `src/lib/warranty-api.ts`: `loadWarrantyManufacturers` consulta a lista autorizada pela conta. `saveWarrantyManufacturer` padroniza espaços, valida o tamanho e chama a função SQL, distinguindo nome duplicado e conflito de edição.
- `src/components/WarrantyManufacturers.css`: formulário, cartões, tema escuro e ajuste em telas pequenas.

`useState` guarda busca, nome, edição e mensagens. `useEffect` consulta o Supabase quando a página é aberta ou a lista é atualizada. Uma marca de requisição impede que uma resposta antiga substitua outra mais recente. `useRef` aponta para o campo de nome para receber o foco ao clicar em Editar.

`filter` procura os nomes na lista carregada. `map` transforma os fabricantes encontrados em cartões; cada cartão usa o ID do fabricante como chave. O ID é estável mesmo quando o nome é corrigido.

## Banco e permissões

`warranty_manufacturers` mantém ID, nome, autor/data de criação e autor/data da última atualização. O nome é único sem diferenciar maiúsculas/minúsculas. A função padroniza espaços repetidos e exige entre 1 e 100 caracteres.

A consulta exige conta ativa pela política RLS. O navegador não tem permissão de escrita direta nessa tabela: `save_warranty_manufacturer` verifica Administrador, valida os campos e grava os autores pela sessão autenticada. Não há operação de exclusão nessa etapa.

Na edição, a função compara `updated_at` com a versão que o formulário abriu. Se outra pessoa já tiver alterado o fabricante, o sistema pede para atualizar a lista antes de salvar, evitando sobrescrever mudanças silenciosamente.

## Verificação

A compilação passou e não houve novos erros na verificação estática. A exibição por cargo e o aviso antes da ativação foram verificados. Após a atualização, a interface conectada ao Supabase carregou os três fabricantes Moripar, New Parts e Trebor e exibiu o formulário de edição para a conta administradora. Não foi salvo outro fabricante nem alterado o formulário que o usuário estava usando durante essa conferência; o cadastro/edição de uma nova referência ainda deve ser conferido em seu primeiro uso.
