# Como funciona a página Histórico

O componente fica em `src/components/MovementHistory.tsx` e os estilos em `src/components/MovementHistory.css`. A consulta usa a sessão de login atual e as políticas RLS que já existem no banco. Não cria nem altera movimentações.

## Estados e efeitos

- `useState` guarda o texto dos filtros, a página, as linhas recebidas, os nomes disponíveis, o carregamento e o erro. Ao chamar um setter como `setRows`, o React redesenha a tela com o novo valor.
- `useEffect` carrega os dados quando os filtros aplicados, a página ou o contador de atualização mudam. A função de limpeza marca a consulta antiga como desatualizada, impedindo que uma resposta atrasada substitua outra mais recente.
- `revision` é um contador: o botão Atualizar aumenta seu valor, fazendo o efeito consultar novamente.

## Funções

- `loadHistory` é `async`, pois espera o Supabase responder. `await` aguarda a consulta sem bloquear a interface. Se o banco devolver erro, `throw` encaminha o problema para `catch`, que mostra a mensagem na tela.
- `applyFilters` recebe o evento do formulário. `event.preventDefault()` evita recarregar a página. `trim()` remove espaços nas pontas e `toUpperCase()` padroniza o código. Os filtros só são aplicados quando a pessoa clica em Filtrar ou pressiona Enter.
- `dateFormatter.format` converte o horário recebido do banco em uma data legível no formato brasileiro e no fuso do dispositivo.
- `map` transforma cada movimentação em uma linha da tabela. `row.id` identifica a linha para o React por meio de `key`.
- `flatMap` reúne os responsáveis das linhas e `Set` remove identificadores repetidos antes de consultar seus perfis.

## Consulta e paginação

`from('stock_movements')` seleciona a tabela de histórico. `select` escolhe seus campos e busca os códigos relacionados em produtos e localizações. Os nomes `product`, `origin` e `destination` são apelidos dessas relações na resposta.

`eq` filtra o tipo de operação; `ilike` procura parte do código sem diferenciar letras maiúsculas e minúsculas. `order` coloca os registros mais recentes primeiro e usa o identificador como segundo critério quando os horários coincidem.

O filtro Categoria permite consultar amortecedores, molas ou os dois. Os prefixos de molas vêm de `src/lib/product-category.ts`, compartilhado com a tela de estoque. O filtro é aplicado no Supabase antes da paginação, para não ocultar registros que estejam em outra página.

`PAGE_SIZE` é uma constante com valor 25. `range` busca 26 linhas: mostramos 25 e usamos a linha extra para saber se o botão Próxima deve ficar ativo. A tela carrega apenas uma página por vez.

## Responsável e permissões

A tabela de movimentações guarda `performed_by`, que identifica a conta responsável. Os nomes vêm da tabela `profiles`, respeitando suas políticas: cada pessoa pode consultar seu próprio perfil, e administradores podem consultar os demais. Se o nome estiver vazio ou não puder ser consultado, a tela mostra os oito primeiros caracteres do identificador. Não buscamos e-mails nem senhas em `auth.users`.

Os saldos fictícios iniciais têm notas de carga de demonstração e não foram atribuídos a uma pessoa. Entradas e transferências feitas pelo site registram o identificador da conta autenticada no banco.
