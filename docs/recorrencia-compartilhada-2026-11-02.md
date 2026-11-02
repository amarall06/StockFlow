# Anotação 22 — recorrência de conferências compartilhadas

Recorte escolhido por reaproveitar o detector, envios e decisões já existentes: Painel → Apresentação → Contagens compartilhadas → Recorrência das conferências compartilhadas.

Considera somente contagens aprovadas, distintas por identidade do envio, produto, região e situação. Pendências, pedidos de recontagem e resultados sem diferença não contam. A data de envio é convertida para America/Bahia; a data de referência acompanha a última consulta confirmada. Falha de atualização preserva resultados/data anteriores e exibe aviso.

Cada evidência abre a contagem original no histórico. A localização usa a planta existente. O mínimo/período seguem a regra local por conta/navegador já disponível; sua edição permanece restrita ao Administrador na interface. O detector anterior dos exemplos permanece separado e usa sua data fixa. Não há novas requisições, escrita, migração ou ajuste de saldo.

## Código

- `src/lib/shared-divergence-checks.ts`: converte os envios aprovados já validados para o formato do detector, com data da Bahia e identidade original.
- `src/components/RecurringDivergences.tsx`: recebe origem compartilhada, referência, aviso de consulta anterior e ação para abrir evidência; comportamento anterior preservado pelos padrões.
- `src/components/PresentationShelfCounts.tsx`: fornece contagens/decisões existentes e registra a data de consulta confirmada.

## Somente testes novos

`tests/browser/shared-recurrence.spec.ts`: aprovações com diferença/evidência/planta sem escrita; nova decisão e falha preservando evidências; Consulta em 375px sem edição e pendências excluídas; virada do dia com referência preservada na falha e renovada após sucesso. Os três primeiros casos foram executados uma vez; o caso da virada foi acrescentado após ajuste da referência e executado sozinho; a primeira simulação avançava além da validade da sessão de teste, então foi corrigida para cruzar somente a meia-noite da Bahia sem expirar a sessão. Reexecutado apenas esse caso novo que falhou. Nenhuma suíte anterior repetida. Build e análise dos arquivos alterados aprovados.

## Pode riscar e falta

Pode riscar **22 — detector de recorrência com contagens aprovadas compartilhadas da apresentação e evidências navegáveis**. Não encerra a anotação inteira: restam regras/dados físicos reais, histórico completo, configuração da regra entre aparelhos, resolução operacional, retirada física incompleta e piloto. A avaliação atual abrange até 50 envios recentes e os vínculos abertos; ausência de ocorrência nessa amostra não comprova ausência no histórico completo.

Publicado em `dfc442a50756f7b20d3fa1c5aa73e6854e42ca74`. Domínio HTTP 200 e quatorze recursos públicos iguais ao build aprovado; sem repetir testes funcionais na publicação.
