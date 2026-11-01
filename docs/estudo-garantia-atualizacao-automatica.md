# Anotação 16 — atualização automática da Garantia

Etapa local de 01/11/2026. Sem publicação nesta rodada. Fabricantes/saldos e devoluções recebidas passam a atualizar nas consultas; Histórico e ensaio real entre aparelhos continuam pendentes.

## Comportamento

As duas consultas atualizam a cada 30 segundos com aba visível, ao retornar à aba/janela e ao recuperar conexão. São preservadas a busca de fabricante, a busca de devolução e a seleção de andamento. O CSV de fabricantes usa os dados renovados e a busca atual.

Editar ou preencher um fabricante, salvar e abrir qualquer diálogo pausam a atualização automática. O rascunho não é substituído. Cancelar a edição ou limpar um cadastro novo permite atualizar no próximo intervalo; fechar o diálogo também libera a atualização. Uma resposta que chegou depois da abertura do diálogo não é aplicada sob ele.

Falha mantém a última consulta válida e apresenta aviso. Uma consulta seguinte bem-sucedida remove o aviso. Fabricantes/saldos e devoluções são independentes: uma falha de saldo não bloqueia a leitura das devoluções. Uma atualização manual invalida as respostas do observador anterior, impedindo que um resultado mais antigo substitua o mais recente.

Permanece o limite de 100 devoluções mais recentes. As consultas não formam uma fotografia transacional única do banco, não movimentam caixas e não implementam eventos instantâneos entre aparelhos.

## Código e onde foi colocado

`src/components/WarrantyManufacturers.tsx`: o efeito de `loadWarrantyManufacturers` reutiliza `startResumeRefresh` com 30.000 ms. `initialPending` evita sobreposição com a primeira leitura; `hasReport` permite conservar dados em falha automática; `publish` aplica os resultados atuais e remove o aviso. Mensagem e resultado são associados à revisão e à disponibilidade de saldos.

Uma referência `interaction` acompanha nome em rascunho, edição e salvamento diretamente nos manipuladores. `canAutoRefresh`, um callback estável, consulta essa referência e a existência de diálogo aberto. A mesma regra é compartilhada com a consulta de devoluções. Não é necessário reiniciar a consulta a cada letra digitada. O guard de salvamento também impede entrar duas vezes no mesmo manipulador enquanto aguarda resposta.

`src/components/WarrantyReturns.tsx`: o componente de lista recebeu `canAutoRefresh` opcional e observador próprio de `loadWarrantyReturns`. A revisão invalida resultados antigos; o aviso automático não substitui as linhas. O formulário `ReturnDialog`, suas confirmações, UUIDs e regras de movimentação permaneceram com o fluxo já existente.

Não foram alterados banco, RPCs, permissões, regras de garantia ou unidade em caixas.

## Verificações novas

`tests/browser/warranty-auto-refresh.spec.ts`: **seis casos novos aprovados**, Chrome/Windows, relógio controlado e respostas simuladas:

1. Atualização de amortecedores/molas e devoluções, mantendo buscas/andamento; CSV baixado contém os valores renovados e somente o fabricante filtrado.
2. Falhas mantêm os dois resultados; próximo intervalo recupera e remove avisos.
3. Falha nos saldos não impede atualizar devoluções.
4. Edição e cadastro de fabricante pausam as duas consultas e preservam rascunhos.
5. Diálogos de caixas/devolução pausam leituras e preservam campos; fechar libera a próxima atualização.
6. Respostas antigas não substituem uma atualização manual mais recente.

Cinco passaram na primeira execução. O caso de rascunho em diálogo exigiu corrigir a localização do textarea preenchido no teste; os diagnósticos mostraram diálogo modal visível e valor intacto. Somente esse caso novo ainda não aprovado foi repetido durante a investigação e depois passou. Nenhum teste anteriormente concluído foi executado. Build aprovado e análise dos dois componentes sem avisos. Sem escrita real no Supabase ou ensaio em dois aparelhos.

## Lista

Pode riscar a subparte da **16: Garantia com atualização automática**. A anotação inteira permanece parcial: falta Histórico, definição da necessidade de atualização instantânea e ensaio real entre aparelhos. Estoque, Giro/ABC e relatórios do Painel já estavam tratados.

A 15 segue concluída na implementação local; a 24, quanto à preparação do roteiro. Publicação do conjunto, foto real, Safari físico e execução do piloto mantêm seus estados registrados. Design geral depois das 26 anotações.
