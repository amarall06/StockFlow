# Seu primeiro sistema: explicação do LIBER automotive

Leia uma aula de cada vez. O livro HTML do código tem busca por arquivo, explicações de
responsabilidade e o conteúdo completo dos arquivos desta versão. Não precisa decorar nada.

## Aula 1 — O que você usa quando abre o site

Há três lugares diferentes. O GitHub guarda o código e suas versões, como um caderno com
histórico. A Vercel transforma esse código em arquivos que o navegador consegue abrir e
entrega o site. O Supabase guarda as informações, controla as contas e executa operações
no PostgreSQL. Seu celular é o navegador: ele desenha a interface, mas não decide sozinho
se alguém pode vender ou transferir caixas.

Ter o link permite chegar à porta. O login identifica a pessoa. O perfil ativo e o cargo
permitem entrar em cada operação. O banco confere essa permissão em cada requisição.
Esconder um botão melhora a interface; não é uma proteção suficiente.

## Aula 2 — As linguagens, sem mistério

HTML descreve a estrutura da página: títulos, botões, formulários. CSS controla aparência,
tamanho e posicionamento. JavaScript executa ações. TypeScript acrescenta verificações
de tipos ao JavaScript antes da publicação: por exemplo, impede passar texto onde uma função
espera uma quantidade. SQL é a linguagem que conversa com o banco de dados.

React organiza a página em componentes reutilizáveis. Um componente é uma função que
recebe informações e devolve uma parte da interface. Arquivos `.tsx` misturam TypeScript
com JSX, uma sintaxe que se parece com HTML. Vite monta e serve esse projeto. Node.js
executa as ferramentas de desenvolvimento; o estoque em si fica no PostgreSQL.

## Aula 3 — O caminho do primeiro carregamento

1. `index.html` cria o documento e o espaço `root`.
2. `src/main.tsx` pede ao React que desenhe `App` nesse espaço.
3. `src/App.tsx` verifica a sessão do Supabase e busca o perfil.
4. Sem sessão, aparece o formulário de login. Conta inativa vê o aviso de acesso pendente.
5. Conta ativa carrega `src/InventoryApp.tsx`, que organiza menu, conta e módulos.
6. Os módulos maiores são carregados sob demanda com `lazy` e `Suspense`.

`import` usa uma função de outro arquivo. `export` a disponibiliza para outro arquivo.
`const` dá um nome a um valor. Uma função reúne instruções. `return` entrega seu resultado.
`async` permite esperar operações externas; `await` espera sua conclusão. `try/catch/finally`
trata sucesso, falha e limpeza, como liberar o botão de envio depois de uma falha.

## Aula 4 — Como React mantém a tela atualizada

`useState` guarda um valor da interface, como o filtro escolhido. Sua função `set...` muda
o valor e pede uma nova renderização. Renderizar significa calcular o que deve aparecer.
`useEffect` sincroniza a interface com algo externo, como uma consulta ao banco.
A função de limpeza impede que uma resposta atrasada sobrescreva a página já abandonada.
`useRef` guarda referências sem precisar redesenhar a tela, como um bloqueio de envio.
`useMemo` reaproveita um cálculo quando suas entradas não mudam.

No seletor de módulos, `value` representa a página atual. `onChange` chama `changePage`,
que muda a página e limpa buscas antigas. No celular não há mais foco automático no campo:
isso evita abrir o teclado e deslocar a tela ao escolher Molas. Campos com pelo menos 16 px
reduzem o zoom de edição do Safari; o zoom manual de acessibilidade continua permitido.

## Aula 5 — O painel e os gráficos

Os blocos de amortecedores, molas e total são botões. Eles abrem a consulta correspondente.
Os atalhos levam a alertas, garantia e saídas (ou histórico para cargos sem permissão de saída).
No celular/tablet, indicadores detalhados ficam recolhidos até clicar para expandir.

`InventoryDashboard` combina o estoque atual com o relatório de vendas e recebimentos.
`dashboard-summary.ts` calcula os números do estoque que já foram consultados.
`dashboard-api.ts` busca o relatório no banco e confere o formato recebido.
`InventoryActivity.tsx` mostra o gráfico diário; `activity-api.ts` busca e valida a série.

O gráfico usa um SVG: os pontos da linha são calculados a partir das caixas de cada dia.
Não é uma fotografia. Trocar Vendas/Entradas muda a coluna usada; trocar o período faz outra
consulta. O controle de dia mostra o valor exato e a tabela oferece os mesmos dados sem
depender da imagem. Dias sem movimento aparecem com zero, não com dados inventados.
O período usa dias de calendário da Bahia e inclui hoje, ainda incompleto. O relatório antigo
de 30 dias usa uma janela de tempo móvel; por isso os limites das duas consultas diferem.

## Aula 6 — Como o estoque é representado

Um produto tem um código e aplicações. Uma localização é uma prateleira. Um saldo é a
quantidade de caixas de um produto, em um local e em uma situação. A mesma peça pode
aparecer em várias linhas porque há caixas em prateleiras e situações diferentes.

`products` guarda o cadastro; `locations`, os locais; `stock_balances`, os saldos;
`stock_movements`, o histórico. Aplicações de veículos ficam em `product_applications`.
Recebimentos podem guardar fornecedor e lote. Lote documenta a entrada; não significa que
já exista consumo FIFO e saldo individualizado de cada lote. Garantia tem tabelas próprias
e não é somada automaticamente ao estoque normal.

Molas usam Em estoque e não passam pela aprovação de amortecedores. Amortecedores podem
aguardar testagem ou estar liberados. Vender amortecedores exige saldo liberado. Testar muda
a situação, sem criar caixas. Transferir muda o local, sem mudar a situação nem o total.

## Aula 7 — Por que gravar no banco por função

RPC é uma chamada remota de função. O navegador envia os campos; o banco identifica a
conta pela sessão, verifica cargo, valida quantidade e altera saldo e histórico na mesma
transação. Transação significa tudo acontecer junto ou tudo ser desfeito.

Um bloqueio de linha impede duas operações de consumirem o mesmo saldo sem coordenação.
UUID identifica um pedido. Idempotência significa repetir o mesmo pedido sem executar a
retirada duas vezes. É essencial quando o banco aceitou a operação e a resposta se perdeu.

`transfer-api.ts` normaliza e envia os dados. `pending-transfer.ts` guarda o pedido na aba
antes do envio. `StockTransfers.tsx` bloqueia novos pedidos enquanto o anterior está pendente.
A RPC `transfer_stock_once` confere UUID, conta e conteúdo e usa um registro privado.
Depois de confirmado, uma falha na consulta só deve atualizar o estoque, sem repetir o efeito.
`outflow-api.ts`, `pending-outflow.ts` e `StockOutflows.tsx` fazem o equivalente para saídas.
A recuperação local tem limites: fechar a aba ou limpar o armazenamento apaga essa cópia.

## Aula 8 — Segurança: quem pode fazer o quê

Supabase Auth cuida do login. `profiles` guarda o cargo e se a conta está ativa. RLS significa
Row Level Security: regras do banco que controlam a consulta e alteração de registros.
As RPCs também verificam a função ativa da conta. O cliente não escolhe seu próprio cargo.
Dados editáveis do usuário não são usados como prova de autorização.

O esquema `private` guarda partes que não devem ser expostas pela API pública. A lista de
e-mails permitidos fica ali. Contas novas começam inativas. A migração preserva as contas
existentes e bloqueia a criação de usuários fora da lista. Permitir um e-mail não envia convite.
Leia `capacidade-e-acesso.md` para o processo administrativo e suas limitações.

`SECURITY DEFINER` permite a uma função executar com os privilégios do proprietário.
É usado somente quando necessário para alterar saldo protegido; por isso a função deve
validar o cargo, fixar `search_path`, qualificar tabelas por esquema e restringir EXECUTE.
Não se deve adicionar essa opção apenas para esconder um erro de permissão.

A chave publicável identifica o projeto e foi feita para o navegador; depende de RLS.
Chaves administrativas e senhas nunca devem ser colocadas em variáveis `VITE_`, no código,
em commits, no livro ou em capturas. `.env.local` é configuração local e fica fora do Git.
`robots.txt` e `noindex` orientam buscadores; não são cadeados de segurança.

## Aula 9 — Módulos operacionais

- Visão geral/Molas: consulta por código, prateleiras, saldos, recebimentos e transferências.
- Produtos: catálogo consultável com aplicação e foto; não é uma segunda contagem de estoque.
- Aplicações: cadastro de veículos/anos/tipo de amortecedor e histórico de mudanças.
- Testagem: aprovação de caixas e seu histórico, respeitando o cargo.
- Garantia: fabricantes, quantidades e devoluções, separados do estoque normal.
- Saídas: venda, descarte e devolução a fornecedor, conforme as regras de cada motivo.
- Histórico: movimentos paginados, com responsável e data quando registrados.
- Alertas: produtos sem estoque ou no mínimo/abaixo; não faz compras automaticamente.
- Giro e ABC: classificação por volume vendido no período, não por faturamento ou lucro.
- Minha conta: nome do usuário, tema e saída da sessão. O tema é uma preferência do navegador.

Fotos são exemplos até haver uma foto cadastrada para aquele código. O Storage é privado;
URLs temporárias permitem exibição sem tornar o bucket público. Substituição exige permissão.
CSV exporta dados consultados; não é backup do banco. A proteção de fórmulas impede que
texto de cadastro comece a ser executado como fórmula por um programa de planilhas.

## Aula 10 — Como as pastas se dividem

`src/components` contém a interface de cada módulo. `src/lib` contém consultas, contratos,
validações e regras reaproveitáveis. Arquivos CSS definem as aparências correspondentes.
`supabase/migrations` é a sequência de mudanças do banco: leia na ordem da data. Uma
migração aplicada não deve ser repetida por conta própria. `tests` contém laboratórios e
testes; `scripts` reúne conferências automatizadas e utilitários. `.github/workflows`
ensina o GitHub a executar as verificações. `docs` registra decisões, aulas e resultados.
`public` guarda arquivos públicos estáticos; nunca deve receber segredos ou dumps reais.

`package.json` lista bibliotecas e comandos; `package-lock.json` fixa as versões instaladas.
`tsconfig` controla o TypeScript; `vite.config.ts`, o build. `vercel.json` define configurações
de hospedagem, como o cabeçalho contra indexação. `.gitignore` impede arquivos locais de
entrar no Git. Isso não apaga um segredo que já tenha sido enviado antes.

## Aula 11 — Desenvolvimento, testes e publicação

`npm ci` instala a lista exata de bibliotecas do lockfile. `npm run dev` inicia o servidor
local; localhost é o próprio computador de quem abre, não o site da empresa. `npm test`
compila e roda regressões. `npm run test:browser` simula usuários e respostas em um navegador.
`npm run test:database` cria e remove PostgreSQL descartável; precisa de Docker.

Um teste de unidade isola uma regra; um teste de integração verifica regras juntas; um teste
de navegador exercita a interface. Mocks são respostas simuladas, não prova de rede real.
Os testes de carga sintética medem o servidor de teste, não garantem o plano da empresa.
Nenhum conjunto finito encontra todos os erros possíveis. Usamos verificações de formatos,
permissões, concorrência, recarga, limites, estados vazios e falhas de rede para reduzir risco.

Git registra commits: cada commit é um ponto identificável por SHA. Uma branch separa um
conjunto de mudanças; uma PR permite revisar e testar antes de integrar. A Vercel cria uma
prévia e, ao integrar na main, publica a produção conforme a integração configurada.
Mudanças do banco devem ser compatíveis e aplicadas antes do frontend que passa a usá-las.
O banco não volta automaticamente ao estado anterior se o frontend sofrer rollback.

## Aula 12 — Exercícios sem colocar a empresa em risco

Use apenas os dados fictícios e o banco descartável dos testes.

1. Ache um botão no TSX, localize seu `onClick` e siga até a função que ele chama.
2. Escolha Molas no menu móvel e confirme que nenhum campo recebe foco sem seu toque.
3. Mude o período do gráfico, compare a linha com a tabela e explique de onde veio cada ponto.
4. No laboratório, simule uma resposta perdida; confirme que o reenvio usa o mesmo UUID.
5. Compare o código de uma tabela com a política RLS que a protege.
6. Abra o resultado do CI e diga quais testes usam simulação e quais usam PostgreSQL real.
7. Confira que o repositório de backup é privado. Explique por que isso não copia banco e fotos.

Quando encontrar algo desconhecido no livro, procure primeiro o arquivo da função importada,
leia o tipo de entrada e o resultado esperado, e só depois entre no corpo da função.

## Continuação — Entendendo o novo visual

As imagens enviadas guiaram o estilo, mas o site continua sendo composto de controles reais.
`src/Design.css` concentra cores e dimensões compartilhadas. Uma variável CSS como
`--liber-surface` é um nome para uma cor: no tema claro ela vale branco; no escuro vale
uma superfície escura. O mesmo componente passa a respeitar as duas paletas.

O layout do painel usa CSS Grid para organizar os módulos no computador. As media queries
mudam essa organização no celular e tablet; não criam outro estoque e não duplicam dados.
Os cartões chamam os mesmos handlers de navegação. Ícones SVG acompanham o tamanho da tela.

Em `InventoryActivity.tsx`, a escolha Barras/Linhas muda a representação dos mesmos dados.
Para cada dia, a altura da barra depende de `caixas / maior valor`. A linha usa os mesmos
valores convertidos em coordenadas. A tabela permite conferir os números sem depender da
visão do gráfico. Não é necessário instalar outra biblioteca para desenhar esses SVGs.
