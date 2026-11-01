# Anotação 16 — atualização automática do Histórico

Etapa local de 01/11/2026. Sem publicação nesta rodada. Atualização periódica das telas previstas concluída na implementação; a anotação 16 inteira ainda depende de ensaio real entre aparelhos e da definição de atualização instantânea.

## Comportamento

O módulo Histórico de movimentações consulta novamente a página atual a cada 30 segundos com a aba visível e ao retornar à aba/janela ou recuperar conexão. Mantém filtros aplicados e número da página, sem recarregar a página do navegador.

Os campos do formulário são rascunhos até clicar em Filtrar. A atualização automática continua usando a seleção já aplicada; não aplica nem apaga o texto que está sendo digitado. Falha mantém os registros, nomes e navegação da última consulta válida e mostra aviso. A próxima leitura bem-sucedida remove esse aviso.

Trocar de filtro/página ou atualizar manualmente invalida o observador anterior. Uma resposta antiga não substitui a seleção nova. Sair do módulo remove o temporizador. Não há sobreposição com a primeira consulta nem aplicação de resultado automático sob diálogo aberto.

Manter o número da página não fixa os registros: a paginação continua por posição, portanto novos eventos podem deslocar linhas entre páginas. A consulta conserva a ordenação por data e ID, os filtros de categoria no servidor, a leitura autorizada por RLS e a busca literal do código. A revisão não altera o tamanho da página (25 registros mais uma linha para detectar a próxima página).

## Código e onde foi colocado

`src/components/MovementHistory.tsx`: o efeito existente reutiliza `startResumeRefresh`, configurado com 30.000 ms. A função `loadHistory` agora devolve registros, nomes autorizados e indicação de próxima página, sem escrever no estado no meio da consulta. `publish` aplica esse conjunto somente se o efeito ainda é o atual.

`queryKey` reúne filtros aplicados, página e revisão. `automaticError` associa o aviso a essa chave. `initialPending` impede a leitura periódica enquanto carrega a primeira consulta; `hasReport` permite distinguir falha inicial de falha após existir resultado válido. A limpeza invalida respostas antigas e chama `stop()` para remover os ouvintes e o temporizador.

Nenhuma mudança de SQL, permissão, formato de movimentação ou unidade. Continua a consulta de nomes autorizados em profiles; não há consulta a auth.users. Os históricos dentro de diálogos de testagem e aplicações conservam seus fluxos anteriores e não são substituídos pelo temporizador do módulo Histórico.

## Verificações novas

`tests/browser/history-auto-refresh.spec.ts`: **cinco casos novos aprovados** no Chrome/Windows, relógio controlado e respostas simuladas:

1. Atualiza a segunda página, mantém categoria/código/operação e renova os responsáveis; confere parâmetros enviados ao servidor.
2. Falha mantém registros e botão de próxima página; novo intervalo recupera.
3. Campos ainda não aplicados permanecem preenchidos, sem entrar na consulta automática.
4. Resposta atrasada da página anterior não substitui a seguinte.
5. Sair do módulo remove suas consultas periódicas.

Nenhum teste anterior repetido. Build aprovado. Análise do componente mantém o aviso preexistente de setState no efeito, sem novos avisos. Não houve escrita no banco real ou ensaio em dois aparelhos.

## O que riscar e continuidade

Pode riscar a subparte **Histórico com atualização automática**. Estoque, Giro/ABC, relatórios do Painel e Garantia já estavam implementados localmente. Não riscar a anotação 16 inteira: atualização periódica de 30 segundos não é recebimento instantâneo por evento. Falta confirmar a necessidade desse modo e validar comunicação/atualização entre aparelhos reais após publicação.

A 15 segue concluída na implementação local; a 24, quanto à preparação do roteiro. O conjunto acumulado continua sem publicação. Piloto, foto real e Safari físico preservam suas dependências externas. Design geral depois das 26 anotações.
