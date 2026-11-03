# Redesign visual — etapa 1: tokens, layout comum e Painel inicial

## Escopo e decisões

Referências recebidas: Painel inicial, Produtos, Garantia e Alertas, cada uma em claro/escuro. Esta etapa redesenha **somente o Painel**, além da base visual comum. Produtos, Garantia e Alertas terão suas composições próprias nas próximas etapas. Prioridade de design autorizada pelo usuário, substituindo o adiamento anterior até encerrar as 26 anotações.

O usuário aprovou recolher as informações complementares em **Mais informações** e pediu acesso fácil por atalhos. O resumo mostra quatro indicadores, movimentação/vendas e três cartões de reposição/entradas/alertas. O menu **Atalhos** abre módulos existentes e leva diretamente a planta, exportações, análises ou filtros. Mais informações mantém os componentes montados: recolher não desliga suas consultas nem apaga seus estados. Apresentação continua acessível pelo seletor existente, agora dentro de Atalhos.

Dados vêm das mesmas propriedades e consultas existentes. Valores das imagens não foram inseridos na interface. As capturas abaixo usam respostas controladas de teste; não representam o estoque de produção.

## Base e arquivos

- `src/styles/design-tokens.css`: cores fornecidas, dimensões, raios, sombras e fonte Inter. `--liber-accent` claro continua `#C2571F`; o preenchimento de botão usa `#C1561F`, variação mínima para atingir 4,5:1 com branco (o original fica em aproximadamente 4,49:1).
- `public/fonts/InterVariable.woff2` e `Inter-LICENSE.txt`: Inter local, sem biblioteca ou dependência externa em tempo de uso; licença SIL OFL da fonte oficial.
- `src/components/InventoryLayout.tsx`: único layout comum com menu, cabeçalho, avisos, conteúdo e sobreposições. O controlador original fornece os mesmos elementos e eventos. `PageHeading` é reutilizável.
- `src/components/Interface.tsx`: Card, Badge, Button, Table, Progress, Tabs e grupo de ações. Abas genéricas ficam preparadas para os filtros das próximas telas; a primeira tela usa o agrupamento recolhido aprovado.
- `src/styles/reference-layout.css`: composição da referência, hierarquia visual, ícones, listas/tabelas com rolagem interna e adaptação a telas menores.
- `InventoryDashboard.tsx` e `InventoryActivity.tsx`: reorganização de apresentação e geometria responsiva dos gráficos SVG existentes. Séries, valores, fórmulas do resumo e parâmetros das consultas preservados. Valores também acessíveis em tabela.
- `src/lib/use-theme.ts` e chamada em `App.tsx`: segue o tema do aparelho enquanto não houver escolha manual; escolha manual permanece no armazenamento já usado pelo sistema.
- `InventoryApp.tsx`, `NavigationIcon.tsx` e `main.tsx`: uso do layout comum e dos estilos, mantendo eventos, permissões e navegação existentes.

Sem instalação de bibliotecas. Sem alterações em APIs, banco, migrações, regras de saldo, operações, permissões, serviço offline ou arquivos do service worker. Diálogos e confirmações operacionais continuam nos componentes existentes. Alterações de tema são exclusivamente de interface.

## Telas menores

Mantidas cores, cartões, tipografia e identidade. Em celular, menu lateral vira o diálogo de navegação existente; cartões empilham; Atalhos abre abaixo do próprio botão e permite fechar por segundo toque ou Escape; listas e tabelas rolam dentro dos cartões. Em 320px, nome longo é abreviado visualmente e títulos quebram quando necessário, sem ocultar o acesso. Tablet usa grade adaptada. Fonte e coordenadas do SVG se ajustam para evitar datas sobrepostas.

## Verificação exclusivamente nova

**18 casos novos aprovados**, distribuídos em `dashboard-redesign.spec.ts` (17) e `dashboard-redesign-captures.spec.ts` (1, gerando quatro capturas). Nenhuma suíte anterior executada. Foram repetidos somente casos novos que falharam durante esta implementação.

Cobertura: claro/escuro em 1440px e 375px; cores, fonte, quatro indicadores com dados consultados e alinhamento; auditoria automática WCAG A/AA no resumo e com Mais informações aberta; acesso a planta/relatórios/Garantia; filtros e parâmetros originais; tema do aparelho e escolha persistida; menu móvel/teclado; estados vazio/erro/carregando; geometria e legibilidade do gráfico; perfil Consulta sem Saídas; 320px e 768px sem transbordamento; menu Atalhos em celular baixo, sem cobrir seu botão e fechável por toque.

A auditoria encontrou e corrigiu listas roláveis sem foco, uma mensagem vazia escondida por regra CSS antiga e rótulos de gráfico sobrepostos no celular. Houve correção de seletor no teste para o título real do relatório. Gravações são bloqueadas nas respostas controladas; nenhum dado foi escrito no Supabase. Nenhum erro de console nas sessões saudáveis verificadas. Build de produção aprovado; análise sem erros, com dois avisos preexistentes de estado em efeitos nos controladores, não alterados por este redesign.

Testes feitos em Chrome instalado. Auditoria automática e capturas não substituem ensaio físico em Safari/iPhone nem verificam todas as operações de escrita já existentes; regras e implementações desses fluxos não foram modificadas.

## Capturas finais com dados de teste

- [Painel claro](design/painel-light.png)
- [Painel escuro](design/painel-dark.png)
- [Celular claro](design/painel-light-mobile.png)
- [Celular escuro](design/painel-dark-mobile.png)
- [Celular 320px](design/painel-320px.png)
- [Tablet 768px](design/painel-768px.png)

## Como conferir no site

1. Abra Painel inicial e compare os quatro indicadores com os respectivos estoques. Clique em cada cartão para abrir sua consulta.
2. Abra **Atalhos → Garantia**, depois volte ao Painel pelo menu. Confira também Produtos, Histórico e Aplicações pelos acessos existentes. Saídas aparece somente para o perfil autorizado.
3. Use **Atalhos → Planta e capacidades**, **Exportar relatórios** ou **Filtros e atualização**. Mais informações deve abrir no recurso escolhido. Filtros continuam atualizando os dados; o resumo de totais mantém sua referência conjunta de amortecedores e molas.
4. No gráfico, use **⋯ → Opções do gráfico** para alternar série/visualização e consultar a tabela. Em Entradas recentes, **⋯** mostra fornecedor, lote e localização; **Ver todas** abre Histórico.
5. Em Opções da conta, alterne o tema e recarregue. No celular, abra Menu e Atalhos, escolha um destino e confira a leitura dos cartões sem rolagem horizontal da página.

Próxima tela: **Produtos**, usando a base já criada. Não considerar as quatro telas concluídas por esta etapa.

## Publicação

Aguardando confirmação.
