# Anotação 19 — modo missão local

02/11/2026. Pedido: modo missão de separação no próprio site, com dados de exemplo, sem Supabase, somente testes novos e publicação. A interface mantém os textos normais da apresentação já solicitados pelo usuário.

## Onde acessar e o que demonstra

**Painel → Visualização do Painel → Apresentação → Modo missão — separar pedidos.**

Três pedidos de exemplo, com clientes e demandas criados para o cenário:

| Pedido | Cliente de exemplo | Amortecedores AGM-35 | Molas MGM-35 |
| --- | --- | ---: | ---: |
| PED-1001 | Oficina Horizonte | 8 caixas | 4 caixas |
| PED-1002 | Auto Peças Central | 9 caixas | 5 caixas |
| PED-1003 | Oficina Avenida | 7 caixas | 4 caixas |

Iniciar monta o roteiro em locais com saldo vendável: amortecedores liberados e molas em estoque. Leste fica bloqueada pela divergência do cenário; caixas aguardando teste não são oferecidas. Cada etapa mostra prateleira, produto, situação, quantidade solicitada/separada e um botão para selecionar/focalizar a localização na planta.

## Leitura, quantidade e conclusão

O código textual esperado contém localização, produto e situação, no formato `LIBER|NORTE|AGM-35|LIBERADO`. Pode ser digitado ou enviado por leitor que emita texto. O Enter no campo de leitura apenas confere o código; não registra quantidade automaticamente. A confirmação exige ação posterior e valida novamente o conteúdo.

A quantidade informada é **total acumulado do item**, não acréscimo. Permite separação parcial, recusa redução/valor acima do pedido e evita somar duas vezes a mesma informação. Progresso sobrevive à navegação/recarga. Só conclui quando todos os itens estão integralmente conferidos. “Separação concluída” não é venda, expedição ou baixa no saldo.

## Disponibilidade local e cancelamento

As quantidades totais de missões ativas **e já separadas** permanecem destinadas ao pedido na disponibilidade local. Assim, os pedidos 1001 e 1002 juntos impedem iniciar 1003 com os mesmos saldos. Finalizar separação não libera caixas como se fossem disponíveis para outro pedido.

Cancelar uma missão ativa exige confirmação na interface e conserva o registro com situação cancelada. Libera somente a destinação do cenário local; a mensagem pede conferência do destino físico das caixas já separadas. Não altera saldos. Uma missão cancelada pode ser reiniciada com novo planejamento; o protótipo conserva o estado mais recente por pedido, não um histórico completo de tentativas.

## Código e finalidade

- `src/lib/pick-missions.ts`: pedidos de exemplo, roteamento e disponibilidade por produto/local/situação, leitura, totais, transições e armazenamento com versão por conta/cenário. Valida a recuperação e preserva dados ilegíveis. Gravação compara a cópia lida e confirma o retorno do armazenamento; quota/conflito não viram sucesso. Comparação sequencial local não é bloqueio transacional entre abas/aparelhos simultâneos.
- `src/components/PickMissions.tsx`/CSS: seleção do pedido, roteiro, formulário de leitura/quantidade, conclusão/cancelamento e feedback acessível. Administrador/Estoquista podem operar; Consulta visualiza sem iniciar/confirmar. Esses controles locais não substituem autorização no servidor.
- `src/lib/map-navigation.ts` e `FictionalShelfMap.tsx`: evento local com identidade da apresentação, foco e rolagem até a prateleira. Assinatura removida ao sair/trocar contexto.
- `StockPresentation.tsx` e `InventoryDashboard.tsx`: montagem no site original, usando os mesmos saldos de exemplo da apresentação. Chave distinta da consulta do estoque; não há chamada de gravação a API, nem cadastro de pedidos no Supabase.

## Somente verificações novas

`scripts/check-pick-missions.mjs`: roteiro elegível, bloqueio de início duplicado, leitura incorreta, limite de quantidade, conclusão prematura, parcial/total repetido sem incremento, redução recusada, disponibilidade mantida após concluir, cancelamento, estoque imutável, recuperação/identidade/dados inválidos, quota, versão local e navegação/limpeza por conta. Aprovado.

`tests/browser/pick-missions.spec.ts`: **oito casos novos aprovados** — roteiro/localização no mapa sem movimentar estoque; código incorreto e parcial recuperada; conclusão/destinação/cancelamento entre pedidos; falha de gravação; conteúdo inválido preservado/Consulta bloqueada; Estoquista operando sem editar capacidades; leitura por Enter/teclado/axe A/AA em 375 px nos temas claro e escuro. API interceptada, nenhum dado ou conta real utilizado.

Build e análise dos módulos novos aprovados. Nenhuma suíte/caso concluído das etapas anteriores foi executado. Publicação confirmada abaixo.

## Pode riscar e o que falta

Pode riscar implementação e verificação do **protótipo local da 19**: pedidos de exemplo, roteiro, localização, leitura textual, confirmação parcial/total, progresso recuperável e conclusão/cancelamento locais. Publicação concluída em `2b91830`.

Para uso real faltam: cadastro/vínculo dos pedidos, reservas globais transacionais e concorrência entre operadores/aparelhos; autorização e histórico no servidor; identidade única das etiquetas/caixas e leitura QR física/câmera quando definida; regras validadas de separar/expedir/vender/cancelar/devolver; integração da expedição com estoque e ensaio físico da equipe. O texto de leitura do protótipo identifica saldo/local/situação e **não é uma identidade única de caixa física**. Não foi prometida disponibilidade global a partir dos dados locais.

## Publicação confirmada

Código `2b9183069bd9430d99210eb39bb0a39a42e28fc1`, publicado no site original em 02/11/2026. Vercel success: https://vercel.com/amarall06s-projects/liber-automotive/7J2LVT2JhXvu4mxjjRQifgCRQ4Sa . Domínio https://liber-automotive.vercel.app/ respondeu HTTP 200 com a entrada atual. Quatorze recursos públicos conferidos por hash, todos iguais ao build aprovado. Nenhum teste funcional repetido na publicação; commits com `[skip ci]` evitam a suíte antiga. Acesso: Painel → Visualização do Painel → Apresentação → Modo missão.
