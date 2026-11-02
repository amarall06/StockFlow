# Anotação 22 — divergências recorrentes na apresentação

02/11/2026. Novo detector, separado da simples divergência do rascunho e do prazo de testagem já entregues. Sem Supabase.

## Acesso e demonstração

Painel → Visualização do Painel → Apresentação → Divergências recorrentes.

Regra inicial do cenário: pelo menos 3 conferências distintas com diferença em 30 dias corridos, incluindo a referência fixa e visível 02/11/2026. Administrador configura mínimo de 2 a 100 ocorrências e janela de 1 a 3650 dias neste navegador/conta. Não define a política real da empresa.

Com a regra inicial, AGM-35/LESTE/Liberado apresenta três ocorrências (08/10, 20/10, 31/10), com diferenças -2, +1 e -3, soma absoluta 6 caixas. Ao reduzir o mínimo para 2, MGM-35/SUL/Em estoque também aparece: +1 e -1, soma absoluta 2. Diferenças de sinais opostos não apagam ocorrências. A soma absoluta histórica não é saldo atual nem ajuste recomendado.

Só entram conferências revisadas do cenário, por combinação produto/prateleira/situação. Rascunho, resultado igual, registro antigo ou futuro não entram. A mesma sessão não duplica a ocorrência; duplicata conflitante é recusada. Cada aviso permite abrir as evidências (sessão/data/esperado/contado/diferença) e localizar a prateleira no mapa.

O histórico de exemplo é fixo; não vem dos rascunhos de contagem reais e não implementa aprovação da 17. Nenhum saldo, bloqueio de espaço ou aprovação real é alterado. Sem pop-up adicional, envio a terceiros ou agendamento.

## Código

- `src/lib/recurring-divergences.ts`: histórico de exemplo, janela inclusiva, agrupamento por produto/local/situação, deduplicação, evidências, regra e armazenamento local versionado por conta. Verifica cópia antes de salvar e confirmação da escrita; não é transação global.
- `src/components/RecurringDivergences.tsx` e CSS: formulário do Administrador, resultado/evidências acessíveis e navegação ao mapa pelo mecanismo já existente. Consulta visualiza sem editar.
- `StockPresentation.tsx`: integração no Painel original com identidade da apresentação. Dados ilegíveis são preservados e bloqueiam a avaliação; falha de gravação mantém regra anterior e texto preenchido.

## Somente verificações novas

`scripts/check-recurring-divergences.mjs` aprovado: recorrência e soma absoluta, molas e sinais opostos, deduplicação e conflito, janela inclusiva e futuro, separação por local/situação, datas/limites inválidos, imutabilidade, isolamento por conta, conflito de cópia, quota e limpeza de assinatura.

Sete casos novos de `tests/browser/recurring-divergences.spec.ts`, todos aprovados em 19,9 s: evidências e mapa sem escrita; regra/recarga/molas/período vazio; falha de gravação; configuração inválida preservada; Consulta; teclado e auditoria automática A/AA em 375 px nos temas claro e escuro. API simulada, sem dados ou contas reais. Build e análise dos arquivos alterados aprovados. Nenhum teste/suíte anterior executado.

## Pode riscar e falta

Pode riscar implementação/testes do detector de recorrência na apresentação. Na 22 faltam regra operacional validada, conferências/datas/identidade reais e histórico compartilhado, autorização, resolução de avisos, detector de retirada física incompleta e piloto. A aprovação de contagens da 17 e a integração de divergências ao mapa de calor real da 20 não foram entregues por esse protótipo.

## Publicação confirmada

Publicado em `5e1c31f30dbfc939a6775e5fbbf578bbd1eee537`, https://liber-automotive.vercel.app/ . Vercel success: https://vercel.com/amarall06s-projects/liber-automotive/2dFa9LRj8h4WAvhsjeAFbaKbAMAv . Domínio HTTP 200 com entrada atual e quatorze recursos públicos iguais ao build aprovado, conferidos por hash. Nenhum teste funcional repetido na publicação. Commits `[skip ci]` evitam a suíte antiga. Pode riscar implementação/testes/publicação do detector local de recorrência da 22; demais dependências reais permanecem.
