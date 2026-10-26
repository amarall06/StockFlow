# Giro e Curva ABC — guia da etapa

## O que a tela calcula

O menu **Giro e ABC** consulta amortecedores, molas ou as duas categorias nos últimos 30, 90 ou 180 dias. A unidade é caixa. O resumo mostra caixas vendidas, códigos com vendas e códigos que têm estoque normal mas nenhuma venda no período. O terceiro cartão abre o detalhamento filtrado.

A ABC usa quantidade vendida, não faturamento. Ordena os produtos por caixas vendidas: o grupo inicial que alcança 80% fica em A; o grupo seguinte até 95%, em B; o restante, em C. O produto que cruza um limite fica no grupo que começou antes dele. Quantidades empatadas permanecem na mesma classe; os limites podem ser ultrapassados. Com apenas duas vendas iguais, ambos os produtos ficam em A. Um produto sem vendas recebe “Sem vendas”, fora da classificação.

Participação = caixas do produto ÷ caixas vendidas na seleção × 100. Média diária = caixas do produto ÷ dias do período. Buscar um código/aplicação ou filtrar uma classe só muda as linhas visíveis, sem recalcular as classes e percentuais. Trocar categoria ou período recalcula a seleção inteira.

“Última venda” usa todo o histórico registrado até a consulta, mesmo que anterior ao período escolhido. “Sem venda registrada” não mede a idade física das caixas. O módulo não calcula valor imobilizado, margem ou giro financeiro e não atribui uma venda a um veículo específico quando um código tem várias aplicações.

## Onde está cada responsabilidade

| Arquivo | Responsabilidade |
| --- | --- |
| `src/components/InventoryTurnover.tsx` | Filtros, estados, gráfico SVG, resumo e tabela. |
| `src/components/InventoryTurnover.css` | Layout, cores, tema escuro e rolagem em telas pequenas. |
| `src/lib/turnover.ts` | Tipos, validação, classificação ABC e dias desde a última venda. |
| `src/lib/turnover-api.ts` | Chamada autenticada à função do Supabase. |
| `supabase/migrations/202610260001_inventory_turnover.sql` | Agregação somente de leitura e versão API 14. |
| `supabase/tests/operational-turnover.sql` | Testes transacionais do banco, terminando em ROLLBACK. |
| `scripts/check-turnover.mjs` | Testes locais das contas, resposta da API e renderização. |

## Percurso de uma consulta

O `onChange` do seletor atualiza `category` ou `days` com `useState`. O `useEffect` chama `loadTurnover`. Essa função usa `supabase.rpc`, recebe JSON e valida o formato e o período. `rankTurnover` produz as classes; React atualiza o resumo, o gráfico e a tabela.

O efeito guarda uma variável `current`. Na limpeza, ela vira `false`; uma resposta antiga não pode sobrescrever uma consulta mais recente. O botão Atualizar refaz a consulta do catálogo/estoque e incrementa `revision`. Não registra saídas ou altera saldos.

## Código comentado para acompanhar a lógica

Este exemplo didático reduz a função real a participação e média diária. A versão de produção também trata classes, empates, validações e datas.

```javascript
const dias = 30; // Cria uma referência constante para o tamanho do período.
const produtos = [ // Inicia a lista usada apenas neste exemplo em memória.
  { codigo: 'AGM-35', vendidas: 8 }, // Representa oito caixas de amortecedores vendidas.
  { codigo: 'MGM-12', vendidas: 2 }, // Representa duas caixas de molas vendidas.
]; // Encerra a lista; const impede reatribuir a referência, não torna objetos imutáveis.
const total = produtos.reduce((soma, produto) => soma + produto.vendidas, 0); // Soma as vendas começando em zero.
const linhas = produtos.map((produto) => ({ // Produz uma nova lista com uma linha por produto.
  ...produto, // Copia os campos existentes sem alterar o objeto original.
  participacao: total ? produto.vendidas / total * 100 : 0, // Calcula 80% e 20%; evita dividir por zero.
  mediaDiaria: produto.vendidas / dias, // Divide a quantidade por todos os dias do período.
})); // Fecha a criação dos objetos e a chamada de map.
console.table(linhas); // Mostra a tabela no console; não escreve no banco.
```

Um exemplo React comentado, para relacionar estado, evento e interface:

```tsx
import { useState } from 'react'; // Importa a função de estado do React.
export function FiltroDeEstudo() { // Declara um componente que pode ser usado em JSX.
  const [dias, setDias] = useState(90); // Guarda o valor atual e a função que solicita sua atualização.
  return ( // Devolve a descrição visual que o React vai renderizar.
    <button type="button" onClick={() => setDias(30)}> {/* Executa a função somente no clique. */}
      Mostrar 30 dias; atual: {dias} {/* As chaves inserem o valor JavaScript no texto. */}
    </button> /* Fecha o botão e termina a expressão visual. */
  ); // Encerra o retorno do JSX.
} // Encerra o componente.
```

Comentários dentro de JSX usam `{/* comentário */}`; fora dele, JavaScript aceita `//` ou `/* */`. No componente real, o seletor usa `onChange`, e a consulta é feita no efeito; o exemplo acima só demonstra um clique.

`useMemo(() => rankTurnover(report), [report])` reutiliza o cálculo enquanto `report` não muda. Não é uma proteção de acesso: as permissões pertencem ao banco. `useRef` guarda o elemento do detalhamento para focar/rolar ao clicar no resumo. `useId` fornece identificadores para o título e a descrição acessíveis do gráfico. `type` e `Record` são recursos de TypeScript para conferir formatos durante o desenvolvimento; a validação da resposta continua necessária em execução.

## SQL e segurança

`inventory_turnover` considera somente movimentos `sale` com unidade `box`, dentro da janela e sem datas futuras. Entrada, transferência, descarte, devolução e peças avulsas ficam fora das vendas. O saldo atual soma `awaiting_test`, `released_for_sale` e `in_stock`, sem garantia. `LEFT JOIN` mantém produtos sem movimentos no relatório.

A função exige perfil ativo, permite as cinco funções existentes e recusa acesso anônimo. `SECURITY DEFINER` executa com o dono da função; por isso há verificação explícita de perfil, parâmetros restritos e `search_path` vazio. Não existe escrita de estoque nesse endpoint. A migração foi aplicada no Supabase em 26/10/2026 com retorno de sucesso e API 14; não é necessário colá-la novamente para usar a tela. Deploy da Vercel não executa migrações SQL automaticamente.

## O que foi verificado

Passaram os testes locais de limites, empates, ausência de vendas, períodos, dados inválidos e resposta assíncrona da API. No Supabase, 19 verificações passaram, incluindo os cinco cargos ativos, conta inativa, acesso anônimo, limites de datas e exclusão de movimentos indevidos. Fixtures e simulações ficaram dentro de transação revertida.

Depois dos testes, a referência continuou com 53 caixas, oito produtos e 26 movimentos. Hashes de saldos, perfis e histórico permaneceram iguais. Evidências privadas em `outputs/verifications/turnover-sql-tests-20261026.json` e `turnover-preservation-20261026.json`, fora do repositório.

A interface local foi conferida nas duas categorias, busca por Corsa, temas claro/escuro e quadro de 360 pixels. O gráfico e a tabela rolam horizontalmente. Isso não substitui teste em aparelho iPhone real nem logins reais dos outros cargos. Publicação do frontend depende do envio do novo commit e confirmação Ready na Vercel.
