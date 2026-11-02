# Correção do Painel e consolidação regional — 02/11/2026

Prioridade solicitada: revisar o site, principalmente o Painel, e manter somente NORTE, SUL, LESTE e OESTE como prateleiras operacionais.

## Alterações

- `src/lib/regional-locations.ts`: correspondência única dos códigos antigos e ordem das regiões.
- `src/InventoryApp.tsx`: remove cadastro livre de prateleiras; exemplos e cópias locais de desenvolvimento passam às regiões, somando linhas equivalentes. Retira conversão fixa de duas peças por caixa, sem referência cadastrada. Efeitos de consulta acompanham a conta atual.
- `src/components/InventoryDashboard.tsx` e `ShelfCapacity.tsx`: consulta operacional não possui mais seletor interno para trocar pelos saldos de apresentação; a apresentação continua acessível no seletor principal.
- `src/components/InventoryActivity.tsx`: pontos da linha e marcador alinhados com os dias e contidos na área do gráfico.
- `src/components/InventoryInsights.css`: tabela longa tem rolagem interna, evitando que 95 produtos alonguem excessivamente o Painel.
- Consultas de perfil, estoque, vendas e atividade diária têm prazo de 15 segundos, com os tratamentos de erro existentes.
- Entradas recentes e mapa de calor agrupam os códigos antigos nas regiões. Histórico e exportação de movimentos mantêm os códigos originais para auditoria.

## Banco aplicado

Migração `20261102211726_four_regional_shelves.sql`; API 17. A01/A03 → NORTE; B01/B02 → SUL; C02 → LESTE; D04 → OESTE.

Foram transferidas 53 caixas em 13 lançamentos auditados. Os 113 movimentos anteriores permaneceram idênticos; agora existem 126 movimentos. Oito localizações padrão de produtos foram atualizadas. Cópia anterior e resultados guardados em `private.regional_shelf_reorganizations`, inacessível às contas do site.

| Região | Caixas após consolidação |
| --- | ---: |
| NORTE | 2225 |
| SUL | 2144 |
| LESTE | 2191 |
| OESTE | 2203 |
| Total | 8763 |

Quantidade por produto, situação e unidade preservada. Códigos antigos desativados, sem saldo; quatro regiões protegidas contra remoção/desativação. Banco rejeita novos locais ativos e novos saldos/padrões em locais antigos. Rascunhos offline pendentes não são apagados ou reescritos: confirmações antigas continuam recuperáveis; pedidos ainda não enviados com endereço antigo exigem revisão no fluxo existente.

## Verificação nova

Sete casos novos de navegador aprovados em `tests/browser/regional-dashboard-audit.spec.ts`: Painel com 95 produtos/quatro regiões e geometria da linha; navegação por módulos/perfil/apresentação; celular 375px; falha de rede e recuperação; API 17/locais arquivados/tema escuro; requisição sem resposta encerrada em 15s; alertas, unidade em caixas e limite de altura da tabela com 95 produtos. Não executadas as suítes anteriores. Falhas iniciais do roteiro corrigidas nos seletores de navegação e rótulos; repetidos apenas os casos novos que falharam.

Novo roteiro `tests/database/regional-shelves.sql` aprovado no banco real, com ROLLBACK: totais por produto/situação/unidade, integridade do histórico anterior, quatro regiões, rejeição de local extra, desativação de região, padrão e saldo em local arquivado. Build de produção aprovado. Lint sem erros; dois avisos anteriores de atualização de estado em efeitos permanecem.

Revisão automatizada de navegação usa sessão e respostas controladas, sem alterar estoque pelas telas. Não equivale a executar todos os fluxos reais, em todos os aparelhos. Não há evidência de erro 500 nos registros examinados. Anotações e pilotos anteriores continuam com suas dependências registradas.

Advisors: proteção padrão da cópia privada sem políticas é intencional; permanecem avisos preexistentes de funções autenticadas SECURITY DEFINER e de proteção contra senhas vazadas. A função constante de versão agora usa SECURITY INVOKER.

## Publicação

Aguardando confirmação do deploy deste recorte.
