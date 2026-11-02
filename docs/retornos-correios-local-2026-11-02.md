# Anotação 6 — recebimento local de retornos dos Correios

02/11/2026. Novo protótipo na apresentação, separado de Garantia/devolução de cliente já existentes. Sem Supabase.

## Acesso e cenário

Painel → Visualização do Painel → Apresentação → Retornos dos Correios.

Três remessas de exemplo: RET-2001/REM-401, Oficina Horizonte, AGM-35, 4 caixas; RET-2002/REM-402, Auto Peças Central, MGM-35, 3; RET-2003/REM-403, Oficina Avenida, AGM-35, 2. São exemplos independentes, sem consulta aos Correios e sem vínculo transacional com missões/pedidos reais.

Administrador/Estoquista registram quantidade recebida, condição, observação de 5 a 500 caracteres e declaração explícita de conferência do volume. A quantidade é obrigatória (não preenchida automaticamente) e, no cenário, aceita inteiro de zero até o esperado na remessa. Íntegro e quantidade confere exige quantidade exata; diferença exige condição divergente ou avaria. Zero registra volume sem as caixas esperadas, nunca entrada de saldo.

Registro confirmado fica **aguardando decisão de destino**, com data/hora, condição, observação e quantidade, recuperável nesta conta/navegador. A mesma remessa não pode ser recebida novamente pelo fluxo. Consulta pode ler registros, sem formulário. Nenhuma soma no estoque de 85 caixas, liberação para venda, aprovação de teste, cancelamento de saída ou encaminhamento para Garantia é realizado. Decisão de destino continua pendente.

## Código

- `src/lib/postal-returns.ts`: remessas de exemplo, regras de recebimento, estado versionado e validação de recuperação. Bloqueia duplicação por identidade da remessa. Armazenamento por conta com comparação da cópia antes de salvar, confirmação da escrita e assinatura/limpeza. Não é controle transacional entre aparelhos.
- `src/components/PostalReturns.tsx` e CSS: formulário explícito, seleção da remessa, resumo e registro legível. Erro de gravação mantém formulário; conteúdo ilegível é preservado e bloqueia recebimento. A conferência declarada não é prova automática do recebimento físico.
- `StockPresentation.tsx`: montagem no Painel original com identidade da apresentação e permissão local de operação. Funções autorizadas reais precisam ser definidas e aplicadas no servidor.

## Somente verificações novas

`scripts/check-postal-returns.mjs` aprovado: conferência obrigatória, quantidade incompatível/negativa/fracionária/excessiva, observação inválida, remessa desconhecida, íntegro completo, parcial avariado, zero divergente, normalização, imutabilidade, duplicação, recuperação/identidade/estado proibido, isolamento por conta, conflito de cópia, quota e limpeza de assinatura.

Sete testes novos em `tests/browser/postal-returns.spec.ts`, aprovados em 33,5 s: parcial/recarga/sem duplicação ou baixa; condição/quantidade zero/declarado; falha de gravação; conteúdo ilegível preservado; Consulta; teclado/auditoria automática A/AA em 375 px nos temas claro/escuro. API simulada, sem contas/dados reais. Build e análise aprovados. Nenhum teste anterior executado.

## Pode riscar e falta

Pode riscar implementação/testes do recebimento local para conferência da 6. Faltam regra aprovada da empresa para recebimento/identidade/condição/destino, responsáveis/permissões reais, integração com remessa/pedido/expedição, persistência e histórico compartilhados, liberação autorizada/transacional sem duplicar saldo, documentação e ensaio físico. Não riscar a 6 inteira; retorno direto para venda não foi adotado.
