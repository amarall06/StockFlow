# Anotações 2 e 18 — planta e capacidades do estoque operacional

## Entrega

Painel → Consulta do estoque → **Planta e capacidades do estoque**. O mapa usa os saldos operacionais consultados das quatro regiões, com busca e detalhes de produtos/situações. Não recebe divergências ou sugestões físicas dos exemplos. A capacidade de cada região é configurada pelo Administrador; campos inicialmente vazios, percentual indisponível até preenchimento. As posições iniciais são um modelo editável, não levantamento físico.

O Administrador abre **Editar configuração compartilhada**, escolhe a região, informa posição/dimensões e capacidade/referência da caixa e salva. Capacidade vazia remove sua referência. Perfis de consulta leem a configuração, sem edição. Nenhum saldo é transferido, ajustado ou liberado por essa configuração.

A configuração operacional é independente da apresentação e de cópias locais antigas. Não há importação automática de capacidades locais ou exemplos. Consulta por aviso privado de mudança, a cada 10 segundos com a tela visível, ao retomar foco e ao reconectar. Alterações de saldo seguem a atualização operacional existente do Painel. Em falha, a última configuração fica preservada e novas edições são bloqueadas. Sem primeira leitura válida, o mapa operacional não é inventado a partir da apresentação.

Versão e identidade UUID protegem gravações. Edição conserva a versão de origem; conflito mantém o preenchimento para revisão. Confirmação perdida pode ser recuperada pela mesma tentativa, sem nova gravação. Uma confirmação antiga não restaura uma versão sobre outra mais recente. Não existe fila de escrita offline dessa configuração.

## Código e banco

- `src/components/InventoryDashboard.tsx`: substitui o gráfico exclusivamente local pelo bloco operacional compartilhado.
- `src/components/SharedShelfLayout.tsx`: reutiliza leitura, editor e recuperação existentes, com destino operacional, mapa e gráfico calculados dos saldos consultados.
- `src/components/FictionalShelfMap.tsx` e `src/lib/shelf-map.ts`: modo operacional não inclui divergência fictícia de LESTE nem sugestões baseadas em espaço de exemplo.
- `src/lib/shared-layout.ts` e `shared-layout-api.ts`: validação estrita da identidade e acesso ao endpoint correspondente ao modo.
- Migração `20261102215244_operational_layout.sql`, aplicada na preparação e conferida nesta continuação: `public.inventory_layouts`, registro privado de confirmações, validação de grade/sobreposição/capacidade, RLS de leitura para perfis ativos, escrita somente via função de Administrador. Função pública SECURITY INVOKER encaminha à função privada protegida. Aviso privado de mudança integrado.

O registro operacional inicia na versão 1 com capacidades `{}`; a planta inicial deriva do modelo já existente. Não foram inventados limites físicos. As configurações da apresentação continuam em sua tabela própria.

## Evidências novas

Seis casos novos de navegador em `tests/browser/operational-layout.spec.ts`, aprovados: saldos/vazios sem divergência de exemplo; duas sessões e confirmação recuperada com identidade estável; conflito mantendo preenchimento; leitura indisponível e recuperação; Consulta em 375px por teclado; resposta da apresentação rejeitada no endpoint operacional. Os cenários de navegador usam respostas controladas, não aparelhos físicos da equipe.

Novo roteiro `tests/database/operational-layout-isolation.sql` aprovado no banco real com ROLLBACK: gravação operacional não altera nem os saldos nem a tabela da apresentação. O roteiro `operational-layout-live.sql`, aprovado na preparação para versão/confirmação/permissões, foi preservado e **não foi repetido** nesta continuação. Build de produção e análise dos seis arquivos alterados aprovados, sem erros ou avisos.

Advisors mantêm avisos preexistentes de funções autenticadas SECURITY DEFINER e proteção contra senhas vazadas; novo registro privado tem RLS sem liberação, negação padrão intencional, sem privilégios de cliente. Não há novo aviso para a tabela operacional exposta. Referência: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy .

## Pode riscar e falta

Pode riscar **2 — integração das capacidades compartilhadas ao gráfico do estoque operacional** e **18 — planta compartilhada vinculada aos saldos operacionais das quatro regiões**, nos escopos de implementação/testes/publicação. Faltam capacidades/posições físicas reais, restrições e espaço conferido para sugestões operacionais, vínculo de conferências operacionais e piloto com equipe/aparelhos. Não encerra esses itens por inteiro.

A preparação não concluída do histórico foi guardada em `test-results/pendencias-historico-nao-publicadas.patch`; não integra esta publicação. A migração vazia de regras, nunca aplicada, foi retirada da fila. Não foi repetido nenhum teste concluído para publicar este recorte.

## Publicação

Aguardando confirmação.
