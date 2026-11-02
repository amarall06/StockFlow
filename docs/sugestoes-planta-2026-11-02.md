# Anotação 21 e planta integrada ao site — 02/11/2026

O usuário pediu sugestões de espaços, apresentação dentro do site original, textos sem a palavra “fictício” e planta semelhante à referência visual enviada. Os dados continuam sendo o cenário local de apresentação já autorizado; não foram transformados em informações reais nem enviados ao Supabase.

## Entrega no site original

Em **Painel → Visualização do Painel → Apresentação**, os indicadores/produtos/capacidades/mapa são exibidos no próprio sistema. O Painel mantém uma opção distinta para a consulta do estoque. Ao escolher apresentação, as consultas próprias do relatório do Painel são interrompidas; a sessão e os demais módulos continuam com seus controles normais.

`StockPresentation.tsx` reúne o conteúdo compartilhado. O atalho para `/demonstracao.html` foi retirado do Painel. A página anterior foi mantida apenas para compatibilidade com links já compartilhados e reutiliza o mesmo conteúdo; não foi criada outra página nesta etapa.

Os rótulos agora são “Mapa de prateleiras”, “Capacidade”, “Sugestões de espaço”, “Indicadores do estoque” etc., sem “fictício” na interface, conforme pedido. A seleção “Apresentação” continua separando os dois contextos. Chaves locais continuam distintas por conta/cenário; números do cenário não alteram os saldos consultados.

## Sugestão de espaço — 21

`src/lib/space-suggestions.ts` calcula destinos para toda a quantidade solicitada. Considera categoria, situação, padrão da caixa, capacidade restante, espaço físico conferido e divergência pendente. Disponibilidade é o menor valor entre capacidade restante e espaço conferido; saldo zero sozinho não basta. Não reserva, divide automaticamente ou transfere caixas.

Regras e valores do cenário de apresentação:

| Local | Uso | Espaço conferido de exemplo | Condição |
| --- | --- | ---: | --- |
| NORTE | Amortecedores aguardando/liberados | 0 caixas | Capacidade ocupada |
| SUL | Molas em estoque | 30 caixas | Capacidade restante lógica de 48; limite físico de exemplo de 30 |
| LESTE | Amortecedores liberados | 10 caixas | Bloqueada por divergência de contagem |
| OESTE | Amortecedores/molas | 40 caixas | Capacidade lógica 50; limite físico de exemplo de 40 |

Todos usam “Caixa padrão”. Esses registros de conferência/restrição são dados demonstrativos criados localmente, não conferências reais realizadas pela equipe. Quantidade inválida, capacidade ausente, caixa incompatível e divergência impedem recomendação. A ordem é menor sobra após acomodar toda a quantidade; empate pelo código. Não foi inventada distância real da entrada.

`SpaceSuggestions.tsx`/CSS oferecem categoria, situação, quantidade, destinos, justificativas de exclusão e botão que seleciona/focaliza a prateleira no mapa. A lista recalcula quando a capacidade é editada, sem manter uma indicação antiga falsa.

## Planta inspirada na referência — 18

`FictionalShelfMap.tsx`/CSS exibem uma área quadriculada escura com retângulos selecionáveis, corredores, recebimento e expedição. No computador, propriedades/detalhes ficam à direita; no celular ficam abaixo e a planta possui rolagem própria. Texto, bordas e estados de seleção complementam a cor.

Controles funcionais de ampliar, reduzir e ajustar visualização. Administrador pode editar coluna/linha/largura/altura, aplicar posição, salvar a planta neste navegador ou restaurar posições. `floor-plan.ts` valida quatro locais, grade de 48 × 32 células, limites, dimensões mínimas e não sobreposição de prateleiras. A grade é esquemática, sem escala física real. `FloorRackEditor.tsx` fornece alternativa por formulário/teclado; não há ferramenta de arrastar falsa ou botão sem ação.

Persistência local versionada, por conta/cenário, sem sobrescrever uma edição sequencial detectada em outra aba. Falha de armazenamento não é tratada como sucesso. Dados inválidos são preservados e bloqueiam salvar sobre eles. Isso não é controle transacional entre aparelhos; corredores/áreas operacionais ainda não têm validação física de circulação/peso/segurança.

## Verificação — somente novos testes

- `scripts/check-space-and-floor-plan.mjs`: elegibilidade, categoria/situação/padrão, quantidade integral, limite físico independente de saldo zero, divergência, ranking, capacidade ausente, validação de saldo, limites/sobreposição da planta, cópia por conta, quota e conflito. Aprovado.
- `tests/browser/space-floor-plan.spec.ts`: sete novos casos aprovados — apresentação no site original e rótulos; amortecedores/Oeste e exclusões; molas/ranking/limites; recálculo por capacidade; salvar/reabrir planta e rejeitar sobreposição; teclado/zoom/375 px/axe A/AA em claro e escuro.
- `tests/browser/floor-plan-desktop.spec.ts`: um novo caso aprovado para propriedades laterais, orientação e captura de tela. Imagem conferida visualmente em `test-results/floor-plan-desktop.png` (diagnóstico ignorado pelo Git).

**Oito testes novos de navegador e verificações isoladas aprovados**, sem executar testes concluídos de etapas anteriores. As expectativas antigas de rótulos foram atualizadas para a nova nomenclatura, sem executar seus casos. Build e análise dos novos módulos aprovados; configurações temporárias usam cache separado.

## O que pode riscar e o que falta

Pode riscar a **implementação e verificação local da 21 no cenário de apresentação**, a integração ao Painel original e a nova visualização/configuração local da planta da 18. Publicado em `3faabef`, conforme registro abaixo.

Para uso real faltam: capacidades/ocupação e espaço físico conferidos, dimensões/peso/restrições e posições validados pela equipe; fonte autorizada e compartilhada no servidor; atualização concorrente e eventual reserva transacional antes de mover caixas; divergências de contagens aprovadas; piloto físico. As regras de exemplo não encerram essas definições. Não houve mudança no Supabase nem aplicação de movimentações reais.


## Publicação confirmada

Código `3faabef393fa082003375d12069cad7ea668acb1`, main, `amarall06/StockFlow`. Vercel success: https://vercel.com/amarall06s-projects/liber-automotive/6sJfjX6eb4Az1wseQbc59H4RKwCw

Site original https://liber-automotive.vercel.app/ HTTP 200, entrada correspondente ao build. Quatorze recursos públicos de entrada/Painel/apresentação e dependências iguais por SHA-256 ao build aprovado; diagnóstico local ignorado em `test-results/publicacao-3faabef/hashes.json`. Oito testes novos de navegador e cenários isolados aprovados. Nenhum teste concluído foi repetido na publicação; `[skip ci]` preserva essa instrução e a Vercel compilou normalmente.

Pode riscar implementação/verificação/publicação do protótipo local da 21, da planta editável no recorte da 18 e da integração da apresentação ao site original. Acesso: Painel → Visualização do Painel → Apresentação. Continuam pendentes dados físicos validados, compartilhamento/concorrência/reservas no servidor e piloto.
