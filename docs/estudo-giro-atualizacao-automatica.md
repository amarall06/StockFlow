# Anotação 16 — atualização automática do relatório Giro/ABC

Etapa local de 01/11/2026, sem publicação. É o primeiro relatório próprio a receber atualização automática; não conclui a sincronização de todos os relatórios.

## Comportamento

Com Giro/ABC aberto, a consulta é refeita a cada 30 segundos enquanto a aba está visível e ao retornar à janela/aba ou recuperar conexão. A leitura usa a categoria e o período atuais. Busca, classificação e seleção de estoque sem vendas permanecem no componente de resultados; uma consulta automática não muda sua chave nem remonta a tabela.

Uma falha automática conserva o último relatório da mesma seleção e apresenta aviso. Uma consulta posterior bem-sucedida substitui os dados e remove o aviso. Trocar categoria/período ou sair do módulo limpa o observador antigo; sua resposta tardia não pode substituir a seleção nova.

Não há leitura automática durante a consulta inicial, atualização manual ou diálogo aberto. A consulta manual mantém o fluxo anterior de renovar o catálogo e depois recarregar o relatório. O catálogo completo de aplicações continua sendo renovado pelo fluxo de estoque/manual; o temporizador desta etapa lê o relatório, não todas as fontes da aplicação.

## Código e localização

`src/components/InventoryTurnover.tsx`, componente `InventoryTurnover`, efeito de carregamento do relatório: reutiliza `startResumeRefresh` com 30.000 ms. `initialPending` evita sobreposição com a primeira consulta. A função `publish` aplica resultados só enquanto o efeito está atual e remove o aviso automático. `hasReport` distingue falha inicial de falha após já existir resultado válido.

`automaticError` guarda mensagem e chave da seleção, para não mostrar aviso de um filtro anterior. `manualPending`, uma referência estável, pausa a atualização automática durante o comando manual e bloqueia repetição imediata desse comando. A limpeza do efeito chama `stop()` além de invalidar a primeira consulta antiga.

`TurnoverResults` conserva a chave por seleção; os resultados automáticos usam a mesma chave. Por isso seus estados de busca/classificação permanecem, e a tabela recebe o relatório novo.

## Testes novos

`tests/browser/turnover-auto-refresh.spec.ts`: **quatro casos novos aprovados** no Chrome/Windows, relógio controlado, respostas simuladas:

1. Resultado atualiza mantendo período, categoria, busca e classificação.
2. Falha automática conserva resultados; próximo intervalo recupera e retira aviso.
3. Intervalos não acrescentam consultas durante a leitura inicial lenta.
4. Resposta automática antiga não substitui uma nova categoria.

Três casos passaram na primeira execução. O teste de leitura inicial foi ajustado para considerar a possível execução duplicada inicial de efeitos em StrictMode; passou isoladamente na segunda tentativa. Só o caso novo que falhou foi executado novamente. Nenhum teste anterior foi repetido. Build aprovado e análise do componente sem avisos. Sem escrita no banco ou ensaio entre aparelhos reais.

## Lista

- Riscar a subparte **atualização automática do relatório Giro/ABC**.
- A anotação 16 inteira continua parcial: resumo/atividade diária do Painel, Garantia/Histórico e ensaio real entre aparelhos ainda não foram encerrados.
- A 15 continua concluída na implementação local; a 24, quanto a preparar roteiro. Publicação e dependências humanas permanecem registradas.

Próxima etapa sugerida: resumo de vendas/entradas e atividade diária do Painel, sem repetir os casos de estoque e Giro já aprovados. Design geral continua para depois das 26 anotações.
