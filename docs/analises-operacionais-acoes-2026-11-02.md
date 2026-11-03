# Análises operacionais das anotações 20 e 23 — 02/11/2026

## Entrega

Painel inicial → Atalhos → Análises e conferências.

**20 — quadro de atividade ligado à planta operacional:** regiões consultadas exibem frequência/caixas, intensidade relativa e acesso à região correspondente na planta. A escolha abre Mais informações, seleciona a prateleira operacional, preserva sua seleção se já estiver aberta e leva o foco até ela. A intensidade usa o período/categoria já consultados, não capacidade ou divergência física. Regiões conhecidas sem atividade exibem zero com texto explícito. Se a planta não estiver disponível, aparece orientação de consulta/atualização; nenhuma região da apresentação é usada como substituta.

**23 — lista operacional acionável e exportável:** busca por código, aplicação ou região; filtro de produtos com saldo e sem movimentação no período; contador e exportação CSV somente dos resultados selecionados. O arquivo registra instante/início da consulta, período, categoria, saldo consultado, regiões, última movimentação conhecida (inclusive anterior à janela) e presença de movimento no período. Ausência de histórico permanece vazia e indicada na tela. Isso não representa idade física das caixas. A lista também abre as regiões atuais na planta.

A tabela detalhada de atividade, os filtros de período/categoria e as consultas existentes foram mantidos. Não há novas consultas nem escrita no banco, transferência, reserva, mudança de capacidade ou ajuste de saldo. Não foram inventados dados físicos e nenhuma biblioteca foi instalada.

## Código

- `src/components/InventoryInsights.tsx`: filtros locais, CSV, cartões regionais e atalhos a partir dos dados já consultados.
- `src/components/InventoryInsights.css`: cartões e controles usando os tokens existentes, dois temas e celular, com rolagem interna das tabelas.
- `src/components/InventoryDashboard.tsx`: navegação para a região operacional com foco e mensagem de indisponibilidade.
- `src/components/FictionalShelfMap.tsx`: atributo identificador da região no botão existente, sem alterar seu comportamento, saldos ou disposição.

## Verificações

Seis casos novos aprovados em `tests/browser/operational-analysis-actions.spec.ts`: frequência/volume e seleção da região correta; filtros e CSV efetivamente baixado com histórico anterior; claro e escuro em celular com teclado/contraste; categoria/período/nenhum resultado; planta indisponível sem recorrer à apresentação. As falhas iniciais foram de preparação dos testes (nome acessível dos seletores e ordem de interceptação da resposta simulada) e foram corrigidas. As rodadas seguintes executaram somente casos ainda pendentes ou com falha. Nenhuma suíte anterior foi executada.

Build de produção e análise dos arquivos aprovados. Capturas `docs/design/analises-light-mobile.png` e `analises-dark-mobile.png` usam dados controlados de teste, não novos dados adicionados ao site. Revisão React: estado local dos filtros, hooks incondicionais, chaves estáveis, navegação apenas no evento, foco explícito e classificação/cálculos existentes preservados.

## Como conferir

1. No Painel, abra Atalhos → Análises e conferências.
2. Ative Somente sem movimentação e busque um produto ou região. Exporte o CSV e confira que só contém a seleção.
3. Troque Frequência de operações por Caixas movimentadas e veja a intensidade relativa de cada região.
4. Use Ver NORTE/SUL/LESTE/OESTE na planta. A região correspondente deve ficar selecionada e com foco.
5. No celular, os cartões empilham e as tabelas rolam dentro do bloco.

## Pode riscar e limites

Pode riscar **20 — quadro operacional de atividade por região com acesso à planta** e **23 — filtros, atalhos e CSV da lista operacional sem movimentação**. Não encerra conferências operacionais aprovadas, validação da planta física, rastreabilidade por caixa/entrada ou piloto real.

A prioridade definida pelo usuário é concluir primeiro o que não depende de dados reais. Etapas com medidas/capacidades físicas, regras operacionais da empresa, contas da equipe, fotos ou aparelhos reais ficam por último, sem bloquear as demais entregas técnicas.

## Publicação

Publicado em `16453bb03798bdbacb18e15b2e7f1a0bb26f4ef9`, Vercel success. Domínio https://liber-automotive.vercel.app/ com HTTP 200 e dezenove recursos públicos idênticos ao build aprovado, incluindo análises, mapa, fonte e licença. Nenhum teste funcional repetido na publicação.
