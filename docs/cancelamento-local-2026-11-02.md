# Anotação 12 — cancelamento com motivo na apresentação

02/11/2026. Novo recorte local ligado às missões da 19, sem Supabase. Não substitui cancelamento transacional de pedidos reais.

Acesso: Painel → Visualização do Painel → Apresentação → Modo missão → Cancelar missão local.

## Entrega

- Formulário explícito exige motivo de 5 a 300 caracteres. Espaços não constituem motivo.
- Se houve separação registrada, exige declaração de conferência do retorno às prateleiras de origem antes de liberar a destinação do exemplo. Sem essa declaração, a missão continua ativa.
- Mantém quantidades já separadas no registro cancelado, com motivo, disposição e data. Recuperável na mesma conta/navegador. Sem gravação no estoque ou servidor.
- Falha de gravação não vira sucesso, preserva missão ativa e texto preenchido.
- Consulta não recebe o formulário. Missão já separada/encerrada não é cancelada por esse fluxo.
- Cancelamentos antigos sem metadados continuam legíveis. Reiniciar uma missão cancelada substitui seu estado local mais recente; não há histórico completo de tentativas nem auditoria autenticada no servidor. Declaração do usuário não comprova retorno físico automaticamente.

## Código

`src/lib/pick-missions.ts`: metadados opcionais compatíveis com armazenamento anterior, validação na recuperação e função cancelPickMission com motivo/retorno.

`src/components/PickMissions.tsx` e CSS: formulário acessível, confirmação das caixas e registro legível. O fluxo anterior de confirmação genérica foi substituído, não duplicado.

## Verificação exclusivamente nova

`scripts/check-pick-cancellation.mjs` aprovado: motivo vazio/longo, texto normalizado, retorno obrigatório com parcial, registro recuperável, disposição incoerente recusada, tentativa após encerramento recusada e compatibilidade de registro legado.

Quatro testes novos de navegador em `pick-cancellation.spec.ts`, todos aprovados (13,9 s): motivo/recarga/sem escrita; parcial com declaração de retorno; falha de armazenamento preservando texto; teclado e auditoria automática A/AA em 375 px. Build e análise aprovados. Os dois testes anteriores que acionavam a confirmação antiga foram apenas adaptados ao novo formulário para manter coerência futura, sem executá-los.

## Pode riscar e falta

Pode riscar o protótipo local de cancelamento com motivo e declaração de retorno da 12. Faltam pedidos reais, reserva global e concorrência transacional, identidade/responsável autenticado, histórico compartilhado completo, motivo/destino conforme regra aprovada da empresa, expedição/venda/devolução e ensaio físico. Não riscar a 12 inteira.
