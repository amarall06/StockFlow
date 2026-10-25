# Ponto de retomada — 24/10/2026

## Projeto e dados

Projeto local ativo: `C:/Users/fs_am/Documents/Codex/2026-10-23/files-mentioned-by-the-user-projeto/outputs/StockFlow`. Uma pasta anterior também existe em `E:/Projeto estoque`; não presumir que ela contenha esta versão atualizada sem conferir.

O site usa Vite em `http://127.0.0.1:5173/`. Os dados fictícios de estoque e as contas ficam no Supabase configurado em `.env.local`. Esse arquivo é ignorado pelo Git. A cópia dos arquivos do site não representa um backup independente do banco hospedado ou das contas de autenticação.

## Concluído e conferido

- Login, conta ativa e nome persistente após recarregar, confirmado pelo usuário.
- Estoques em caixas para amortecedores e molas, consulta por código e transferência persistente no Supabase.
- Molas sem testagem, situação Em estoque e números independentes dos amortecedores.
- Histórico de movimentações com filtros para os dois tipos de produto.
- Aplicações de veículos/anos e tipo de amortecedor. A aba Aplicações mostra somente amortecedores, com lápis no cadastro salvo.
- Prévia e janela completa do histórico de aplicações, com antes/depois e responsáveis.
- Fabricantes Moripar, New Parts e Trebor carregados do Supabase na garantia, com cadastro/edição para administradores.
- Lua no tema claro, sol no escuro e lápis nas ações Editar. Tema disponível inclusive no login, salvo no navegador.

## Etapa de garantia conferida; projeto retomado em 25/10/2026

O usuário retomou o projeto em 25/10/2026. Etiquetas, impressão e QR foram adiados. Em seguida pediu um ícone de testagem junto da quantidade de caixas, com responsável e data.

Preparados `ShockTestButton` e `ShockTestingDialog`, histórico paginado por produto e aprovação de quantidades inteiras de amortecedores por Administrador/Testador. A aprovação reduz aguardando e soma liberadas no mesmo local, preservando o total. Molas não recebem o ícone nem aceitam testagem. Não há identificação de caixa física sem etiqueta; o histórico mostra quantidade e local no momento do teste. Não foram inventadas datas ou responsáveis para saldos antigos. Reprovação/retirada para garantia não foi integrada a esta operação.

Ativação confirmada pelo usuário e pela interface: `supabase/migrations/202610250002_shock_testing.sql` (API 9). Em 25/10/2026 às 11:40 (Bahia), foi aprovada uma caixa fictícia AGM-35 em A01 pela conta Felipe Amaral. A01 passou de 3 aguardando para 2 aguardando + 1 liberada. O total de amortecedores permaneceu 38 caixas; aguardando passou de 25 para 24 e liberadas de 13 para 14. Nome, data e saldos persistiram após recarregar o site. Molas continuaram sem ícones de teste, com 15 caixas. Saldos antigos sem autoria/data foram mostrados sem inventar dados. Não desfazer a aprovação fictícia apagando seu histórico. Testes com outra conta/cargo, concorrência e repetição de rede ainda não foram exercitados no Supabase. Guia: `docs/estudo-icone-testagem.md`.

A página local voltou a ficar acessível. Ícones, janela de aprovação, histórico e ausência de testagem em molas foram conferidos visualmente na sessão autenticada.

Caixas por fabricante e categoria na garantia, com Adicionar e Retirar. Migração: `supabase/migrations/202610240008_warranty_boxes.sql`.

Migração 008 confirmada na interface conectada. Entradas e retiradas fictícias de amortecedores e molas na Trebor foram conferidas; a entrada de amortecedores persistiu após recarregar o site. A interface bloqueou retirar 2 caixas com saldo 1. Os testes restauraram o saldo inicial zero da Trebor; Moripar (1 amortecedor) e New Parts (1 mola) mantiveram seus saldos. Concorrência e repetição após falha de rede não foram simuladas.

Os saldos de garantia não alteram automaticamente o estoque normal ou o saldo para venda. A contagem é por fabricante/categoria, com registros detalhados de devolução vinculados às entradas e aos encerramentos. Somente administradores movimentam garantia até definir os demais cargos.

## Próximas funcionalidades

Painel inicial ativado pela migração `supabase/migrations/202610250006_inventory_dashboard.sql` (API 13). O usuário relatou índice já existente (42P07), mas a conferência após recarregar confirmou a migração aplicada e o relatório funcionando; não repetir nem apagar objetos. Validados all/shocks/springs: conjunto 53 caixas normais, oito códigos, dois alertas; amortecedores 38 caixas, quatro códigos, um alerta; molas 15 caixas, quatro códigos, um alerta. Vendas em 30 dias: duas caixas/duas vendas no conjunto e uma por categoria; entradas recentes DEMO-A/DEMO-M com Fornecedor fictício. Visão final restaurada para todas as categorias. Sem alterações de estoque nesta conferência. Consulta para contas ativas; demais operações não viram vendas. Não atribui demanda a veículos nem calcula ABC/idade. Outras contas, período vazio e mais de dez códigos ainda sem ensaio no banco. Guia `docs/estudo-painel-inicial.md`.

Estoque mínimo ativado pela migração `supabase/migrations/202610250005_stock_minimums.sql` (API 12). Conferidos AGM-35 mínimo fictício 18 com total 18 (12 aguardando + 6 liberadas) e MGM-35 mínimo fictício 5 com total 5, ambos alertando e persistindo após recarga. AFR-57 testado com zero e depois vazio; voltou a não configurado. Limites atuais mantidos: AGM-35=18, MGM-35=5; demais sem mínimo. Não houve alteração de quantidades (38 amortecedores, 15 molas). Administrador configura; outras contas ativas consultam. Estoque normal de todas as localizações entra no cálculo; garantia excluída. Zero de produto sem saldo e prateleira inativa foram verificados localmente, não por alteração dos dados no Supabase. Outras contas/concorrência/reenvio ainda não ensaiados no banco. Etiquetas e usuários continuam adiados. Guia: `docs/estudo-estoque-minimo.md`.

Saídas ativadas pela migração `supabase/migrations/202610250004_stock_outflows.sql` (API 11). Conferidas vendas fictícias de 1 caixa AGM-35/A01/Liberado (DEMO-VENDA-A) e 1 caixa MGM-35/A03/Em estoque (DEMO-VENDA-M), com notas de teste sem venda real. Retirada acima do saldo e descarte sem nota bloqueados pela interface; nenhum descarte salvo. Persistência após recarga: 38 caixas de amortecedores (25 aguardando/13 liberadas), 15 molas; AGM-35 liberado em A01 zerado, MGM-35 em A03 com 2 caixas. A01 ainda tem 2 AGM-35 aguardando, A03 tem 10 aguardando, B01 tem 6 liberadas. Preservar históricos de entradas, aprovação e vendas fictícias. Somente Administrador registra saídas nesta fase. Descarte/devolução efetivos, outras contas, concorrência e repetição em rede ainda sem ensaio no banco. Não afeta garantia nem escolhe lote. Estorno/correção e saldo por lote futuros. Guia: `docs/estudo-saidas-estoque.md`.

Continuação de 25/10: fornecedores/lotes ativados pela migração `supabase/migrations/202610250003_receipt_suppliers.sql` (API 10). Conferidos Fornecedor fictício e entradas de 1 caixa AGM-35/A03/DEMO-A aguardando teste e 1 caixa MGM-35/A03/DEMO-M Em estoque. Histórico preservou fornecedor, lote, quantidade, local e responsável Felipe Amaral após recarregar. Totais agora: 39 caixas de amortecedores (25 aguardando e 14 liberadas) e 16 de molas; A03 tem 10 AGM-35 aguardando e 3 MGM-35 Em estoque. Preservar essas entradas fictícias. Formulário permite campos opcionais; lote exige fornecedor. Cadastro de fornecedor somente Administrador. Não há ainda saldo restante por lote, consumo FIFO ou saídas por motivo. Guia: `docs/estudo-fornecedores-lotes.md`. Ensaios de outros cargos, novo produto nesta RPC, concorrência e falha de rede ainda pendentes antes de uso real.

Migração `supabase/migrations/202610250001_warranty_returns.sql` (API 8) aplicada e confirmada pela interface. Conferidos no Supabase: recebimento fictício de AGM-35 em conferência, atualização para garantia (Trebor +1 amortecedor), destino obrigatório e encerramento (Trebor -1); recebimento fictício MGM-12 diretamente em garantia (Trebor +1 mola), ausência de testagem e encerramento (Trebor -1). Os dois registros foram mantidos como TESTE FICTÍCIO, encerrados. Saldo da Trebor restaurado a zero; outros fabricantes e estoque normal preservados. Instruções em `docs/estudo-devolucoes-garantia.md`. Concorrência, repetição por falha de rede e sessão de outro cargo ainda não foram exercitadas no banco.

1. Evoluções futuras da garantia: divisão parcial de recebimentos, paginação além dos 100 mais recentes e verificações adicionais de concorrência e acesso. Não presumir destino de itens errados ou aleatórios.
2. Testagem de amortecedores por caixa inteira, com QR único, pessoa e data. Molas não passam por teste.
3. Fornecedor/lote e saídas por motivo. Transferência interna não conta como venda.
4. Limite mínimo por produto e alertas de ruptura. Considerar todas as caixas do estoque normal, incluindo aguardando teste, como o usuário escolheu; garantia separada.
5. Resumo inicial, entradas recentes e demanda dos últimos 30 dias após registrar as saídas.
6. Giro/Curva ABC e estoque parado. Definir a métrica e os dados de valor/quantidade; não inventar demanda nem capital imobilizado.

## Adiado pelo usuário

Usuários, convites e painel administrativo separado. A exigência futura de nome e sobrenome sem números e a revisão das opções visíveis por cargo estão documentadas. O nome atual já é editável, mas a validação de nome completo não foi implementada. Não retomar a etapa adiada sem o usuário pedir.

## Verificação e preservação

A última compilação passou. Há aviso de tamanho do JavaScript e avisos de efeitos React já existentes no lint; não são erros de compilação. Foram conferidos ícones acessíveis, retirada vazia bloqueada, seleção de categoria com saldo e aviso antes da migração de garantia.

Preservar fontes, imagens, documentação, SQL e configuração local. Dependências e cache npm podem ser reconstruídos com `package-lock.json`. O Git local possui remoto origin em https://github.com/amarall06/StockFlow.git. A publicação anterior foi conferida; esta atualização de documentação ainda é local.

## Publicação online — 25/10/2026
Site ativo: https://liber-automotive.vercel.app/. Envio direto dos cinco arquivos de dist para o projeto liber-automotive na Vercel (amarall06s-projects). Código do build: 2e726fa. Login HTTPS conferido sem erros no console; usuário ainda precisa entrar e conferir os dados. GitHub ainda sem o commit de preparação devido a erro local de credenciais/certificados no push. Não há publicação automática por Git. Detalhes em docs/publicacao.md. Não alterar permissões do Supabase para resolver falhas de acesso.

