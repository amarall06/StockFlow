# Progresso das 26 anotações

Atualizado em 01/11/2026. Numeração original preservada. Código `a7954af` publicado (guia de instalação da 10), incluindo o contraste/formulários da 26 em `62b59f9`, incluindo o complemento offline `080869d`, incluindo os escopos anteriores de `a726b26`; relatório `publicacao-contagem-e-alertas.md`. A publicação offline anterior está em `publicacao-anotacao-14.md`. As notas locais antigas abaixo são históricas. Parcial não equivale ao pedido inteiro concluído. Continuar entre pendências sem repetir testes concluídos.

| Nº | Pedido | Estado atual |
| --- | --- | --- |
| 1 | Pop-up de estoque baixo | **Implementação local concluída: pode riscar esse escopo.** Aviso comum às telas, amortecedores/molas, acesso autorizado, memória por conta/sessão, sem repetição por consulta e sem roubar foco. Publicado em `221171e`. |
| 2 | Gráfico com referência de cheio | Não iniciado; capacidade/meta a definir. |
| 3 | Separação de testados/não testados | **Separação visual por situação nos resumos de prateleiras concluída e publicada: pode riscar esse escopo.** Amortecedores aguardando/liberados e molas em estoque, em caixas. Organização física ainda não definida. |
| 4 | Identificação de testadores | Parcial existente: pessoa/data e função Testador; gestão e contas reais adiadas. |
| 5 | Relatórios PDF e Excel | **Exportação manual local concluída: pode riscar esse escopo.** PDF/XLSX reais no Painel, semana/mês/ano, saldo atual normal + movimentações do período em caixas. Não inclui fechamento histórico transacional, envio ou agendamento. Publicado em `221171e`. |
| 6 | Retorno dos Correios | Regra a definir com a empresa. |
| 7 | Segurança do site | Parcial/contínuo. Novos cabeçalhos locais e dependências de exportação sem vulnerabilidades conhecidas na instalação; controles existentes não encerram auditoria de banco/armazenamento/recuperação. |
| 8 | Zerar estoque fictício | Adiado para transição final aprovada. |
| 9 | Etiquetas de testados | Adiado. |
| 10 | Aplicativo Windows/Android | **Orientação interna Windows/Android/iPhone concluída e publicada, inclusive sem convite automático; cinco testes novos aprovados. Publicado em `a7954af`, Vercel success e cinco arquivos públicos iguais ao build aprovado.** **Preparação local PWA concluída:** manifesto, ícones, janela própria e convite de instalação. Publicado; falta validar instalação real Windows/Android. Offline é item separado. |
| 11 | Ampliar dashboard | **Implementação local dos indicadores em caixas concluída: pode riscar esse escopo.** Disponível para venda, aguardando teste e garantia separados, preservados totais/atividade/alertas. Não converte caixas em peças sem quantidade validada por caixa. Publicado em `221171e`. |
| 12 | Cancelamento de pedidos | Não iniciado; reservas e retorno físico a definir. |
| 13 | Alertas automáticos de pendências | Parcial local: avisos automáticos de inconsistências da consulta, usando o fluxo existente. Aviso global de rascunhos offline por conta e acesso à conferência implementados, com um teste novo aprovado. **Aviso de contagem local e de confirmação de saída pendente concluídos e publicados; pode riscar esses escopos.** Faltam demais regras de pendências operacionais/prazos/resolução. |
| 14 | Offline | **Subpartes locais concluídas, pode riscar esses escopos:** consulta após reabrir (15 minutos por conta); vendas, descarte/devolução ao fornecedor; entradas com fornecedor/lote; transferências; caixas de Garantia; recebimento/edição/andamento/encerramento de devoluções consultadas. Envios individuais e recuperação com UUID, sem aplicação de saldo offline. Último lote: seis testes novos aprovados. **Aprovação de testagem offline: preparo/envio/recuperação concluídos localmente, com oito testes novos aprovados; pode riscar esse escopo.** Aviso da 13 incluído. **Cadastros novos offline: produto com entrada inicial, fornecedor e fabricante implementados localmente, com oito testes novos aprovados; pode riscar esse escopo.** Produto recupera UUID; fornecedor/fabricante recuperam por consulta e vínculo explícito, mantendo para revisão ambiguidades não resolvidas, sem recriação automática. 13 avançou com conferência global. **Publicação/worker e reabertura pública HTTPS concluídos; composição nova no banco real validada com ROLLBACK, sem dados permanentes. Ainda faltam:** piloto autenticado e instalação/atualização em aparelhos reais; fotos exigem conexão. Detalhes e limites em `continuacao-automatica-anotacoes.md`. Não riscar a 14 inteira. |
| 15 | Prevenção e confirmação de operações | **Implementação concluída e publicada: pode riscar esse escopo.** Confirmação das operações de caixas e trava imediata de envio completadas; 16 casos novos aprovados nas etapas anteriores, preservados saldo/UUID/recuperação existentes. Piloto mantém sua pendência geral. Guia `fechamento-anotacao-15.md`. |
| 16 | Sincronização entre aparelhos | **Atualização periódica publicada nas telas previstas. Receptor privado instantâneo publicado e testado em simulação.** Faltam política/gatilhos no servidor, ativação e ensaio entre aparelhos reais. Não riscar 16 inteira. |
| 17 | Conferência de prateleiras | **Rascunho local concluído e publicado: pode riscar contagem/recuperação, comparação e CSV para revisão.** Branco diferente de zero, referência preservada, alerta se saldo consultado mudar, sem ajuste. Faltam envio, aprovação, histórico compartilhado e piloto físico. |
| 18 | Mapa interativo | Não iniciado; depende de mapa físico. |
| 19 | Modo missão e separação de pedidos | Não iniciado; depende de pedidos, reservas e QR. |
| 20 | Mapa de calor | Parcial local: tabela por prateleira com frequência/volume, intensidade relativa e períodos 30/90/180/365 dias. **Resumo de divergências do rascunho local concluído e publicado: pode riscar esse escopo**, separado de movimentações, filtrável por categoria, sem tratar rascunho como aprovado. Faltam conferências aprovadas compartilhadas e eventual mapa físico. |
| 21 | Sugestão de espaços livres | Não iniciado; depende de capacidade física validada. |
| 22 | Detector por regras | Parcial local: detecta saldo inválido, falta de cadastro legível e situação incompatível; rejeita consulta inconsistente, sem corrigir dados. **Aviso global de saída com confirmação/atualização pendente concluído e publicado.** Não comprova retirada física incompleta. Faltam prazos em teste, regras de retirada física e divergência recorrente. |
| 23 | Produtos sem movimentação | Parcial local: códigos com saldo sem qualquer operação no intervalo, última movimentação dentro da janela e prateleiras atuais. **Última conhecida fora da janela implementada e publicada; pode riscar essa subparte.** Falta idade física/rastreabilidade. Guia `anotacao-23-ultima-movimentacao.md`. Não equivale a apenas ausência de vendas. |
| 24 | Preparar roteiro do piloto | **Concluído: pode riscar a preparação do roteiro.** Documento `roteiro-piloto.md` entregue. Execução com equipe permanece pendente. |
| 25 | Ampliar testes automáticos | **Mais 30 casos novos de acessibilidade de formulários/diálogos aprovados nesta rodada, sem repetir os concluídos.** **Mais 13 casos novos de navegador e cenários isolados aprovados nesta etapa, sem repetir anteriores.** Parcial: mais 70 verificações novas nesta continuação (22 navegador + 48 isoladas), incluindo o receptor Realtime iniciado antes do pedido de sequência automática. Casos antigos não repetidos. Ensaios reais e demais áreas seguem pendentes. |
| 26 | Formulários, mensagens, contraste, teclado e telas pequenas | **Contraste de sete telas e sete diálogos revisado nos temas claro/escuro; 30 casos novos aprovados. Pode riscar esse recorte automatizado, publicado em `62b59f9`, com arquivos públicos conferidos.** **Página offline revisada: campos em 375 px, atalhos/foco de teclado e auditoria automática A/AA aprovados em três testes novos. Complemento publicado em `080869d`; pode riscar esse recorte.** **Nova contagem validada por teclado e em 375 px; pode riscar esse recorte local.** Parcial: aviso sem foco automático, acesso por teclado e novo caso em largura de 375 px aprovados, além das revisões anteriores. Safari/iPhone físico e revisão completa pendentes. |

## Rodada atual — instalação e revisão dos 26

Guia interno de instalação concluído e aprovado em cinco testes novos, sem repetir anteriores; publicado em `a7954af`, com arquivos públicos conferidos. Relatório `guia-instalacao-2026-11-01.md`. Dependências práticas da empresa: `definicoes-da-empresa-26-anotacoes.md`. Instalação/atualização em aparelhos reais continuam pendentes.

## Rodada anterior — formulários e contraste

Correções de contraste em sete CSS, 30 casos novos aprovados e nenhum teste antigo repetido. Publicado em `62b59f9`, Vercel success e onze arquivos públicos iguais ao build aprovado. Guia `acessibilidade-formularios-2026-11-01.md`. Não envolve banco real nem reformulação geral de design.

## Lista consolidada do que falta

Consultar `pendencias-atuais-26-anotacoes.md`, com os 26 números, o que pode riscar e as dependências que faltam. Nenhuma alteração no Supabase; não foi apagado estoque fictício.

## Complemento offline — 26

Após a publicação `a726b26`, implementadas melhorias de teclado/celular na página offline, worker v11. Três testes novos aprovados sem rede, sem repetir anteriores; guia `offline-acessibilidade-2026-11-01.md`. Complemento publicado em `080869d`, com página/worker conferidos.

## Publicação confirmada — estado atual

Subpartes de 3, 13, 17, 20, 22 e 23 publicadas em `a726b26`, Vercel success, domínio HTTP 200 e seis arquivos iguais ao build aprovado. Pode riscar a publicação desses escopos. Nenhum teste concluído repetido. Guia `publicacao-contagem-e-alertas.md`.

## Continuação sem servidor — histórico

Implementadas localmente subpartes de 3, 13, 17, 20 e 22; 13 testes novos de navegador e cenários isolados aprovados. Build/análise aprovados; sem repetir suítes anteriores. Estas alterações foram posteriormente publicadas em `a726b26`. Guia de código, escopo e pendências: `anotacoes-sem-servidor-2026-11-01.md`. Não riscar itens inteiros que dependem de regras, servidor, mapa ou ensaio físico.

## Estado após a publicação

Itens 1, 5 e 11 publicados no escopo implementado. 10 publicado como preparação PWA. 14 publicada e validada nos escopos do relatório; não riscar piloto/aparelhos reais. 16 aguarda servidor; acesso ao conector indisponível na retomada. 7 permanece parcial: proteção de senhas vazadas e revisão individual de RPCs/armazenamento/recuperação pendentes.

## Última etapa histórica

Continuação automática: itens 1, 5 e 11 concluídos no escopo local indicado; 10 preparado para instalação; 7, 13, 20, 22 e 23 avançaram; receptor da 16 preparado. 70 verificações novas aprovadas, build aprovado, análise com apenas aviso preexistente. Nenhuma escrita no banco e nenhuma publicação desta rodada. Detalhes, código e dependências dos 26 em `continuacao-automatica-anotacoes.md`.

### Publicação anterior

Publicação das anotações 15 e 16 concluída: código e8fb14a na main, Vercel success, domínio HTTP 200 e seis módulos servidos iguais ao build aprovado. Os 51 casos novos (45 navegador + 6 isolados) aprovados nas etapas anteriores não foram repetidos nesta publicação. Nenhuma escrita no banco. Guia `publicacao-anotacoes-15-16.md`. Próximo passo da 16: requisito instantâneo e validação entre aparelhos reais.

### Registros anteriores

Anotação 16, Histórico: atualização da página/filtros aplicados, preservação de rascunhos, dados mantidos em falha, descarte de respostas antigas e limpeza ao sair. Cinco casos novos aprovados, build aprovado e somente aviso de análise preexistente. Nenhum caso anterior repetido. Guia `estudo-historico-atualizacao-automatica.md`.

Anotação 16, Garantia: fabricantes/saldos e devoluções atualizam automaticamente sem perder buscas/andamento; rascunhos e diálogos pausam a leitura; falhas conservam dados e respostas antigas são descartadas. Seis casos novos aprovados, build aprovado e análise dos dois componentes sem avisos. Nenhum caso anterior foi repetido. Guia `estudo-garantia-atualizacao-automatica.md`. Próxima etapa: Histórico.

Anotação 16, relatórios do Painel: vendas/entradas e atividade diária atualizam automaticamente, preservam filtros, conservam dados em falha e descartam respostas antigas. Cinco casos novos aprovados, build aprovado e análise dos dois componentes sem avisos; nenhum caso anterior repetido. Guia `estudo-painel-atualizacao-automatica.md`. Próxima etapa: consultas de Garantia.

Anotação 16, primeiro relatório próprio: Giro/ABC atualizado automaticamente sem perder filtros e conservando resultado em falha. Quatro casos novos aprovados, build aprovado, análise do componente sem avisos; casos anteriores não repetidos. Guia `estudo-giro-atualizacao-automatica.md`. Próxima etapa: relatórios do Painel.

Anotação 15 encerrada na implementação dos fluxos atuais: 16 casos novos de navegador aprovados isoladamente, build aprovado e análise dos arquivos alterados sem avisos. Nenhum caso anterior foi repetido. Guia `fechamento-anotacao-15.md`. O usuário pediu concluir 15 antes de avançar; próximo trabalho é retomar 16.

Anotação 16, atualização periódica: `src/lib/resume-refresh.ts` e integração em `src/InventoryApp.tsx`. Dois casos novos no navegador e três novos isolados aprovados; casos anteriores não repetidos. Build aprovado. Guia: `estudo-atualizacao-periodica.md`. Na etapa anterior, a retomada por foco/conexão já foi concluída e registrada em `estudo-retomada-consultas.md`.

## Próximos passos

Continuar automaticamente entre itens autorizados, sem repetir testes concluídos. Ativar o servidor privado da 16 quando houver acesso administrativo; definir as regras/dados pendentes de retorno, pedidos, prazos, capacidade e mapa físico. Offline já implementado/publicado nos escopos descritos; continuar somente suas validações reais pendentes. A tabela de dependências de todos os itens está no guia mais recente; não tratar preparação ou simulação como implantação real.

Foto real, Safari físico e execução do piloto continuam dependências externas. Usuários, etiquetas e restauração preservam o adiamento. **A melhoria geral do design fica para depois das 26 anotações**, conforme pedido do usuário; correções necessárias ao uso das funcionalidades podem acompanhar suas etapas.
