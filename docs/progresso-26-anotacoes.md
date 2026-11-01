# Progresso das 26 anotações

Atualizado em 01/11/2026. Numeração igual à lista original de `anotacoes-2026-10-31.md`. “Parcial” não deve ser riscado como pedido inteiro concluído. Mudanças das anotações 15 e 16 ainda são locais, sem publicação.

| Nº | Pedido | Estado atual |
| --- | --- | --- |
| 1 | Pop-up de estoque baixo | Não iniciado; faltam regras de destinatários e repetição. |
| 2 | Gráfico com referência de cheio | Não iniciado; capacidade/meta a definir. |
| 3 | Separação de testados/não testados | Parcial existente: situações separadas; organização física não definida. |
| 4 | Identificação de testadores | Parcial existente: pessoa/data e função Testador; gestão e contas reais adiadas. |
| 5 | Relatórios PDF e Excel | Não iniciado; CSV não equivale a PDF/XLSX. |
| 6 | Retorno dos Correios | Regra a definir com a empresa. |
| 7 | Segurança do site | Parcial/contínuo; controles existentes e revisão local não encerram toda a segurança. |
| 8 | Zerar estoque fictício | Adiado para transição final aprovada. |
| 9 | Etiquetas de testados | Adiado. |
| 10 | Aplicativo Windows/Android | Não iniciado. |
| 11 | Ampliar dashboard | Parcial existente: painel e atividade já disponíveis; ampliação solicitada não concluída. |
| 12 | Cancelamento de pedidos | Não iniciado; reservas e retorno físico a definir. |
| 13 | Alertas automáticos de pendências | Não iniciado. |
| 14 | Offline | Não iniciado; escopo de consulta e escrita a definir antes de implementar. |
| 15 | Prevenção e confirmação de operações | **Implementação local concluída: pode riscar esse escopo.** Confirmação das operações de caixas e trava imediata de envio completadas; 16 casos novos aprovados, preservados saldo/UUID/recuperação existentes. Publicação e piloto seguem pendentes. Guia `fechamento-anotacao-15.md`. |
| 16 | Sincronização entre aparelhos | **Implementação periódica local concluída nas telas previstas:** estoque, Giro/ABC, Painel, Garantia e Histórico. Pode riscar essas subpartes. A anotação inteira permanece **parcial**: faltam publicação, definição da necessidade de atualização instantânea e ensaio real entre aparelhos. |
| 17 | Conferência de prateleiras | Não iniciado. |
| 18 | Mapa interativo | Não iniciado; depende de mapa físico. |
| 19 | Modo missão e separação de pedidos | Não iniciado; depende de pedidos, reservas e QR. |
| 20 | Mapa de calor | Não iniciado. |
| 21 | Sugestão de espaços livres | Não iniciado; depende de capacidade física validada. |
| 22 | Detector por regras | Não iniciado; limites e prazos a definir. |
| 23 | Produtos sem movimentação | Não iniciado no escopo novo; ABC sem vendas não substitui última movimentação/idade física. |
| 24 | Preparar roteiro do piloto | **Concluído: pode riscar a preparação do roteiro.** Documento `roteiro-piloto.md` entregue. Execução com equipe permanece pendente. |
| 25 | Ampliar testes automáticos | Parcial: adicionados casos de vazio, sessões, CSV/filtros, falha de rede, teclado e retomada. Não encerra os ensaios reais/áreas ainda não cobertas. |
| 26 | Formulários, mensagens, contraste, teclado e telas pequenas | Parcial: revisões locais concluídas nos fluxos registrados; Safari/iPhone físico e revisão completa continuam pendentes. |

## Última etapa

Anotação 16, Histórico: atualização da página/filtros aplicados, preservação de rascunhos, dados mantidos em falha, descarte de respostas antigas e limpeza ao sair. Cinco casos novos aprovados, build aprovado e somente aviso de análise preexistente. Nenhum caso anterior repetido. Guia `estudo-historico-atualizacao-automatica.md`.

### Registros anteriores

Anotação 16, Garantia: fabricantes/saldos e devoluções atualizam automaticamente sem perder buscas/andamento; rascunhos e diálogos pausam a leitura; falhas conservam dados e respostas antigas são descartadas. Seis casos novos aprovados, build aprovado e análise dos dois componentes sem avisos. Nenhum caso anterior foi repetido. Guia `estudo-garantia-atualizacao-automatica.md`. Próxima etapa: Histórico.

Anotação 16, relatórios do Painel: vendas/entradas e atividade diária atualizam automaticamente, preservam filtros, conservam dados em falha e descartam respostas antigas. Cinco casos novos aprovados, build aprovado e análise dos dois componentes sem avisos; nenhum caso anterior repetido. Guia `estudo-painel-atualizacao-automatica.md`. Próxima etapa: consultas de Garantia.

Anotação 16, primeiro relatório próprio: Giro/ABC atualizado automaticamente sem perder filtros e conservando resultado em falha. Quatro casos novos aprovados, build aprovado, análise do componente sem avisos; casos anteriores não repetidos. Guia `estudo-giro-atualizacao-automatica.md`. Próxima etapa: relatórios do Painel.

Anotação 15 encerrada na implementação dos fluxos atuais: 16 casos novos de navegador aprovados isoladamente, build aprovado e análise dos arquivos alterados sem avisos. Nenhum caso anterior foi repetido. Guia `fechamento-anotacao-15.md`. O usuário pediu concluir 15 antes de avançar; próximo trabalho é retomar 16.

Anotação 16, atualização periódica: `src/lib/resume-refresh.ts` e integração em `src/InventoryApp.tsx`. Dois casos novos no navegador e três novos isolados aprovados; casos anteriores não repetidos. Build aprovado. Guia: `estudo-atualizacao-periodica.md`. Na etapa anterior, a retomada por foco/conexão já foi concluída e registrada em `estudo-retomada-consultas.md`.

## Próximos passos

Na 16, as telas previstas já receberam atualização periódica. Próximas etapas: publicar o conjunto, definir necessidade de recebimento instantâneo de eventos e preparar/executar ensaio real entre aparelhos. Não repetir os casos locais aprovados de estoque, Giro/ABC, Painel, Garantia ou Histórico. Depois, mecanismo comum de avisos (1, 13, 22), conforme sequência original e definições necessárias. Não iniciar múltiplas funcionalidades na mesma rodada.

Foto real, Safari físico e execução do piloto continuam dependências externas. Usuários, etiquetas e restauração preservam o adiamento. **A melhoria geral do design fica para depois das 26 anotações**, conforme pedido do usuário; correções necessárias ao uso das funcionalidades podem acompanhar suas etapas.
