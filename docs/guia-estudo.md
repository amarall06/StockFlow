# Guia de estudo do LIBER automotive

Este índice organiza o código e os guias para estudar com o projeto aberto. Os dados continuam fictícios. Comece pela visão das pastas e siga uma função de ponta a ponta, sem tentar decorar o projeto inteiro.

## Como as partes se conectam

Continuação nova: [desempenho, carregamento por módulo e CSV](estudo-desempenho-exportacao.md). A autenticação permanece em `App.tsx`; a interface operacional foi movida para `InventoryApp.tsx`.

| Parte | Função no projeto | Onde começar |
| --- | --- | --- |
| HTML | Documento inicial e ponto de montagem do aplicativo. | `index.html` |
| React e TSX | Componentes, campos, botões e atualização da tela. JSX se parece com HTML, mas permite expressões JavaScript. | `src/main.tsx`, `src/App.tsx`, `src/components/` |
| CSS | Espaçamentos, cores, tipografia, temas e adaptação da largura. | Arquivos `.css` em `src/` |
| TypeScript | JavaScript com tipos para detectar incompatibilidades no desenvolvimento. | Arquivos `.ts` e `.tsx` |
| API | Conversa com o Supabase e tratamento das respostas. | `src/lib/`, especialmente arquivos `*-api.ts` |
| PostgreSQL | Dados persistidos, validações, permissões e transações. | `supabase/migrations/` |
| Testes | Comparam resultados com regras esperadas em ambientes controlados. | `scripts/`, `supabase/tests/`, `tests/` |
| Vite/npm | Servidor de desenvolvimento, dependências e geração de `dist`. | `package.json`, `package-lock.json` |
| Git/GitHub/Vercel | Histórico do código, envio remoto e publicação. O banco é separado. | [Publicação](publicacao.md) |

## Vocabulário com exemplos

| Recurso | Significado | Exemplo e cuidado |
| --- | --- | --- |
| `const` | Declara uma referência que não será reatribuída. | `const caixas = 18`. Um objeto declarado com const ainda pode ter propriedades alteradas. |
| `let` | Declara uma variável que poderá receber outro valor. | `let acumulado = 0`, usado na classificação ABC. |
| `function` | Agrupa uma tarefa que pode ser chamada. | `rankTurnover(report)` transforma o relatório em linhas classificadas. |
| `=>` | Outra sintaxe de função. | `produto => produto.stock_boxes > 0` é uma condição para filtrar. |
| `useState` | Mantém estado entre renderizações e solicita atualização visual. | `const [dias, setDias] = useState(90)`; use `setDias(30)` para atualizar. |
| `onClick` | Recebe a função executada no clique. | `onClick={() => setDias(30)}`. Escrever `onClick={setDias(30)}` executaria durante a renderização. |
| `onChange` | Recebe alterações em um campo. | `onChange={event => setSearch(event.target.value)}`. |
| `useEffect` | Sincroniza o componente com algo externo, como consulta à API. | No giro, depende de categoria/período e ignora respostas antigas após a limpeza. |
| `useRef` | Mantém uma referência sem causar renderização por si só. | Elemento para focar o detalhamento; UUID pendente em fluxos de saída. |
| `useMemo` | Reaproveita um cálculo conforme suas dependências. | Classificar o relatório antes de buscar/filtrar a tabela. |
| `map` | Cria uma nova lista a partir de outra. | Transformar produtos em linhas; em JSX, usar uma `key` estável. |
| `filter` | Mantém elementos que cumprem uma condição. | Mostrar somente produtos com estoque e sem vendas. |
| `reduce` | Acumula uma lista em um resultado. | Somar caixas: `rows.reduce((soma, p) => soma + p.sold_boxes, 0)`. |
| `async/await` | Organiza operações que terminam depois. | Esperar uma consulta não bloqueia todas as interações do navegador. |
| `try/catch/finally` | Trata sucesso, falha e limpeza. | Mostrar erro e liberar o indicador de atualização mesmo se a rede falhar. |
| Props | Dados que um componente recebe do componente pai. | `catalog` fornece aplicações para a tabela de giro. |
| `type` | Descreve formatos no TypeScript. | `TurnoverDays = 30 | 90 | 180`; não substitui validação do servidor. |
| RPC | Chama uma função do banco pela API. | `supabase.rpc('inventory_turnover', {...})`; o banco verifica o perfil. |

## Roteiro de leitura por funcionalidade

1. **Painel e navegação:** [painel inicial](estudo-painel-inicial.md) e [cartões/menu](estudo-painel-navegacao.md). Estude como um clique escolhe a página e como os totais são calculados.
2. **Catálogo e aplicações:** [cadastro](estudo-cadastro-aplicacoes.md) e [histórico](estudo-historico-aplicacoes.md). A aplicação de veículo/ano é de amortecedores; códigos das molas são independentes.
3. **Entradas e saídas:** [fornecedores/lotes](estudo-fornecedores-lotes.md) e [saídas](estudo-saidas-estoque.md). O campo de lote no recebimento não implementa saldo remanescente por lote.
4. **Falha de rede:** [recuperação das saídas](estudo-recuperacao-saidas.md) e [laboratório](laboratorio-perda-confirmacao.md). A repetição deve preservar UUID e conteúdo para não retirar duas vezes.
5. **Testagem:** [ícone, responsável e data](estudo-icone-testagem.md). Caixa inteira de amortecedores; molas não passam por teste.
6. **Garantia:** [fabricantes](estudo-fabricantes-garantia.md), [caixas por fabricante](estudo-caixas-garantia.md) e [devoluções](estudo-devolucoes-garantia.md).
7. **Fotos:** [miniatura, ampliação e armazenamento](estudo-fotos-produtos.md). Exemplo ilustrativo não é foto identificadora de produto real.
8. **Alertas:** [mínimos](estudo-estoque-minimo.md). Incluem caixas aguardando teste no estoque normal e excluem garantia.
9. **Indicadores:** [giro e ABC](estudo-giro-abc.md), com exemplos comentados linha a linha e regras da classificação.
10. **Permissões:** [regras](regras-acesso-administracao.md) e [relatório operacional](relatorio-testes-operacionais.md). Esconder um botão não substitui bloquear a operação no banco.

Os guias explicam as responsabilidades e trazem trechos comentados; não são uma cópia integral de todos os arquivos com comentário em cada linha. Leia o código real ao lado do guia. Evite comentários que apenas repetem a sintaxe: os mais úteis explicam uma regra, como “molas não passam por teste”.

## Exercícios seguros para estudar

- Copie o exemplo em memória do guia de ABC e altere as quantidades. Confira participação e média diária com uma calculadora.
- No mesmo exemplo, inclua um produto com zero vendas e veja por que ele fica fora da classificação.
- Estude uma mudança de CSS usando o servidor local e confira claro/escuro e tela estreita.
- Rode `node scripts/check-turnover.mjs` para conferir as regras locais sem alterar o banco.

O servidor local usa a configuração Supabase de `.env.local`; ele pode acessar o mesmo banco do site publicado. Para experimentos de escrita, use um ambiente isolado. O laboratório de saídas tem transporte local próprio e está documentado separadamente.

## Continuar em outro computador

Clone o repositório, instale Node.js compatível, execute `npm install` e configure `.env.local` com os valores públicos do projeto conforme `.env.example`. Depois rode `npm run dev`. A pasta `node_modules` é reconstruída; não precisa copiá-la. Nunca coloque senha do banco, chave administrativa ou backup no Git. Antes de editar em dois computadores, sincronize as alterações para evitar versões divergentes.

O GitHub guarda código. O Supabase guarda dados/contas e arquivos privados. A Vercel publica o build da branch configurada. Fazer commit local não faz push, fazer push não aplica migrações SQL, e um backup do banco não inclui automaticamente os arquivos de fotos.

Situação e limitações atuais: [etapas](etapas-projeto.md), [preparação da empresa](preparacao-empresa.md) e [conferência publicada/móvel](verificacao-publicacao-mobile.md).
