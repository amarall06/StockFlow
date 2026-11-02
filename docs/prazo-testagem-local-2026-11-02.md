# Anotação 22 — prazo de testagem na apresentação

02/11/2026. Novo detector local, sem Supabase, sem repetir entregas ou testes anteriores.

## Acesso e regra do cenário

Painel → Visualização do Painel → Apresentação → Pendências de testagem.

Os 20 amortecedores aguardando testagem do cenário são distribuídos em quatro grupos NORTE/AGM-35: 8 desde 31/10, 7 desde 25/10, 3 desde 17/10 e 2 sem data. Referência fixa e visível: 02/11/2026. São grupos de exemplo, não rastreabilidade real de lotes ou caixas.

Prazo inicial da apresentação: 7 dias corridos, editável de 1 a 3650 pelo Administrador neste navegador/conta. Tempo estritamente maior que o prazo sinaliza atraso; igualdade fica dentro. Com 7 dias: 10 atrasadas, 8 dentro e 2 sem data. Com 14: 3 atrasadas, 15 dentro e 2 sem data. Sem data não é classificado como dentro nem atrasado. Data futura pede conferência; data inválida é recusada pelo modelo. Molas e itens que não aguardam teste são excluídos.

A configuração do cenário não define prazo real da empresa. Nenhuma aprovação, transferência, venda ou alteração de estoque é realizada. Sem avisos enviados para terceiros, novos pop-ups ou agendamento. A pendência aparece no painel da apresentação.

## Código e finalidade

- `src/lib/testing-delay.ts`: grupos/data de referência, regra em dias de calendário, validação e armazenamento versionado por conta. Comparação da cópia antes de gravar, confirmação de retorno da gravação e assinatura de eventos/foco com limpeza. Não equivale a sincronização global/transação entre aparelhos.
- `src/components/TestingDelay.tsx` e CSS: avaliação por grupo, totais, prazo editável, mensagens acessíveis e layout móvel. Erro de recuperação preserva dados e bloqueia avaliação; erro ao salvar conserva avaliação anterior e preenchimento.
- `StockPresentation.tsx`: integração no Painel existente, com identidade local da apresentação e edição restrita ao Administrador. Consulta/Estoquista visualizam sem editar; restrição local não substitui autorização no servidor.

## Evidências novas

`scripts/check-testing-delay.mjs` aprovado: totais para 7/14 dias, ausência de data, limite exato, data futura, datas impossíveis, exclusão de molas/liberados, valores de prazo inválidos, imutabilidade, isolamento por conta, conflito de versão, quota e limpeza de assinatura.

`tests/browser/testing-delay.spec.ts`: seis casos novos aprovados em 17,3 s. Prazo/recarga/estado sem atraso e sem escrita; falha de gravação; configuração inválida preservada; Consulta sem edição; teclado/375 px/auditoria automática A/AA nos temas claro e escuro. API simulada, nenhuma conta ou dado real. Build e análise aprovados. A compilação inicial apontou tipo excessivamente amplo da situação; corrigido antes da execução dos casos. Nenhuma suíte anterior repetida.

## Pode riscar e falta

Pode riscar implementação e testes do detector local de prazo de testagem da 22, na apresentação. Faltam regra de prazo/marco/calendário validada pela empresa, datas e identidade reais, persistência/autorização e avisos compartilhados no servidor, resolução de pendências, retirada física incompleta/divergência recorrente e piloto. Não riscar a 22 inteira.

## Publicação confirmada

Publicado em `8ddf8fdc4c12cfd8507bded53293b11b3d879872`, https://liber-automotive.vercel.app/ . Vercel success: https://vercel.com/amarall06s-projects/liber-automotive/CwHuTygUvStRthMYx41FHSmfTkbu . Domínio HTTP 200 com entrada atual e quatorze recursos públicos iguais ao build aprovado, conferidos por hash. Nenhum teste funcional repetido na publicação. Commits `[skip ci]` evitam a suíte antiga. Pode riscar implementação, testes e publicação do detector local de prazo da 22; as dependências reais descritas acima permanecem.
