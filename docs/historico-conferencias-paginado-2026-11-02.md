# Anotações 17/20/22 — envios anteriores aos 50 mais recentes

## Entrega e uso

Painel → Apresentação → Contagens compartilhadas → Histórico de envios e decisões. A consulta começa pelos 50 envios mais recentes. Quando esse limite é atingido, **Carregar mais 50 envios anteriores** amplia a consulta. O botão deixa de aparecer quando a leitura encontra menos registros que o limite solicitado; no caso de exatamente 50 registros restantes, outra consulta confirma o final.

Os envios carregados também alimentam o mapa das conferências, a fila de pendências e o detector de recorrência. Decisões e vínculos são consultados em lotes de até 50 identificadores, evitando uma URL sem limite de tamanho. Contagens vinculadas abertas no histórico continuam incluídas.

O cursor combina data e identificador em ordem decrescente e preserva os microssegundos devolvidos pelo servidor. Isso permite continuar mesmo quando vários envios têm a mesma data. Respostas com identificadores repetidos são recusadas. As contagens são imutáveis; novos envios posteriores ao início da leitura aparecem na próxima atualização.

Uma falha conserva todos os registros, decisões e detalhes abertos da consulta aprovada anterior. O mesmo botão tenta novamente a ampliação ainda não confirmada, sem aumentar silenciosamente o limite. Cada atualização reconstrói a janela solicitada antes de publicá-la; uma página parcial não vira consulta completa. A consulta periódica enfileira uma retomada se houver leitura em andamento, em vez de abortá-la a cada dez segundos. Mantido o limite total de espera de 15 segundos.

## Código

- `src/lib/presentation-counts-api.ts`: consulta em páginas por cursor, até o limite solicitado pela tela, com validação e rejeição de duplicidade.
- `presentation-count-reviews-api.ts` e `presentation-recounts-api.ts`: leituras das decisões/vínculos em lotes de 50.
- `src/components/PresentationShelfCounts.tsx`: ampliação, repetição após falha, contagem visível de registros carregados e coordenação das atualizações. Envio novo preserva o tamanho da janela ampliada.
- `SharedCountMap.tsx`, `SharedCountPending.tsx` e `RecurringDivergences.tsx`: descrições passam a representar os envios carregados, sem manter o limite textual antigo de 50.

Sem migração, nova permissão, alteração de saldo ou nova regra de aprovação. Continua sendo o histórico autenticado da apresentação, limitado ao que o usuário carregou e ao acesso autorizado. Resultados de pendências/recorrência vazios não comprovam inexistência no restante ainda não consultado. Não implanta contagem operacional real.

## Somente testes novos

`tests/browser/count-history-pages.spec.ts`: cinco casos novos aprovados uma vez, sem executar os anteriores. Sessenta e um envios com a mesma data e microssegundos exercitam paginação/desempate, decisões antigas no mapa/fila/recorrência e lotes limitados; falha da página anterior conserva os 50 registros e detalhes abertos; página repetida é recusada; Consulta em 375px amplia pelo teclado sem escrita; atualização periódica aguarda uma página em andamento.

Build de produção e análise dos sete arquivos alterados aprovados. Nenhuma escrita no Supabase ou teste concluído repetido para publicação.

## Pode riscar e falta

Pode riscar **consulta dos envios anteriores aos 50 mais recentes e integração dos registros carregados ao mapa, pendências e recorrência da apresentação** — complemento das anotações 17/20/22. Faltam os fluxos/regras operacionais reais, coordenação física da contagem, rastreabilidade operacional e piloto. A regra de recorrência ainda é configurada localmente; este recorte não a sincroniza entre aparelhos.

## Publicação

Publicado em `c154d88c3f9a8fc10cbc983323f46828b83d0bc8`, Vercel success. Domínio HTTP 200 e quatorze recursos públicos iguais ao build aprovado. Nenhum teste funcional repetido na publicação.
