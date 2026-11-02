# O que falta nas 26 anotações — 01/11/2026

Leia em conjunto com `progresso-26-anotacoes.md`. A implementação/publicação de uma subparte não encerra as dependências do pedido inteiro. Design geral somente depois desta lista.

## Escopos que já podem ser riscados

- 1: aviso de estoque baixo na tela aberta.
- 5: exportação manual PDF/XLSX por semana/mês/ano, no escopo de saldo atual e movimentações documentado.
- 11: indicadores operacionais em caixas, separados por situação.
- 15: confirmações e prevenção de repetição nos fluxos atuais.
- 24: preparação do roteiro do piloto; não a execução do piloto.
- Subpartes publicadas de 3, 13, 17, 20, 22 e 23: separação visual, avisos, contagem/CSV local, resumo de divergências locais, confirmação de saída pendente e última movimentação conhecida fora da janela. Ver `publicacao-contagem-e-alertas.md`.
- 10: preparação/publicação da instalação PWA, não o ensaio físico.
- 14: implementação/publicação dos escopos offline e os ensaios específicos já registrados; não o piloto autenticado em aparelhos reais.
- 16: consulta periódica nas telas previstas e receptor privado no cliente; não a emissão/ativação no servidor.
- 25/26: os testes e recortes de interface já aprovados. Complemento de teclado/celular offline publicado em `080869d`, com três testes novos aprovados; relatório `offline-acessibilidade-2026-11-01.md`.

- 25/26: mais 30 casos novos de auditoria de campos/contraste nos dois temas, incluindo sete diálogos, contagem local e sete telas, aprovados. Correções prontas, publicado em `62b59f9`, com arquivos públicos conferidos. Guia `acessibilidade-formularios-2026-11-01.md`.

- 10/25/26: orientação interna de instalação Windows/Android/iPhone pronta, com cinco testes novos aprovados, inclusive sem convite automático; publicado em `a7954af`, com arquivos públicos conferidos. Não encerra instalação real.

- 2: referência física definida; exemplo com quatro prateleiras e capacidades fictícias autorizado e implementado, com configuração local editável. Oito testes novos aprovados; publicado em `7aa9dc5`, com arquivos públicos conferidos. Guia `capacidade-fisica-local.md`.

- 18: mapa fictício interativo e página de apresentação com indicadores/produtos/capacidades fictícios prontos. Cinco casos novos e verificações isoladas aprovados; publicado em `f38cc9c`, com recursos públicos conferidos. Guia `mapa-ficticio-apresentacao-2026-11-02.md`.

- 21/18: sugestões de espaço, planta em grade com propriedades e salvamento local e apresentação integrada ao Painel prontos. Oito casos novos aprovados; publicado em `3faabef`, com recursos públicos conferidos. Guia `sugestoes-planta-2026-11-02.md`.

- 19: modo missão de apresentação no próprio site pronto, com roteiro, leitura textual e quantidade, progresso local e conclusão/cancelamento. Oito testes novos e verificações isoladas aprovados; publicado em `2b91830`, Vercel success e quatorze recursos públicos conferidos. Guia `modo-missao-local-2026-11-02.md`.

## O que depende de você

O preenchimento prático, sem solicitar senhas ou decisões técnicas do servidor, está em `definicoes-da-empresa-26-anotacoes.md`. Respostas podem ser fornecidas por grupos conforme a empresa tiver as informações.

## Pendências por número

| Nº | O que falta | Dependência principal |
| --- | --- | --- |
| 1 | Sem pendência de implementação no escopo entregue; observar comportamento no piloto. | Piloto geral |
| 2 | Capacidade física escolhida; gráfico/configuração local e exemplo NORTE/SUL/LESTE/OESTE prontos. Publicado em `7aa9dc5`. Faltam persistência compartilhada e capacidades reais quando for utilizar com dados reais. | Servidor e conferência física futura |
| 3 | Definir separação física, nomes e uso das prateleiras de testados/não testados; executar organização conferida. | Empresa e espaço físico |
| 4 | Retomar gestão de funcionários/testadores e validar contas reais e permissões. | Etapa adiada; serviço de contas/equipe |
| 5 | Escopo manual entregue. Fechamento histórico transacional/envio automático não integra essa entrega. | Eventual nova solicitação |
| 6 | Decidir conferência/identificação/condição/destino do retorno dos Correios e implementar seu fluxo. | Regra da empresa e servidor |
| 7 | Concluir revisão de permissões/RPCs, armazenamento e recuperação; tratar proteção de senhas vazadas no serviço. | Supabase/configuração e auditoria |
| 8 | No final: inventariar dados fictícios, preparar cópia verificável/plano, obter a confirmação exigida e executar a transição. | Etapa final; aprovação para exclusão irreversível |
| 9 | Definir e implementar etiquetas de testados e eventual QR por caixa. | Etapa adiada; definição/uso físico |
| 10 | Instalar e verificar em Windows/Android reais, incluindo atualização do aplicativo. | Aparelhos reais |
| 11 | Escopo dos indicadores entregue; conferir interpretação pela equipe. Não presumir peças por caixa. | Piloto geral |
| 12 | Definir pedidos/reservas/saída/retorno físico e cancelamento idempotente com motivo, pessoa e vínculo. | Regra operacional e servidor |
| 13 | Definir demais pendências, prazos, destinatários e resolução; implementar avisos apoiados nesses registros. | Regras e dados compartilhados |
| 14 | Piloto autenticado com operações, reconexão, atualização e concorrência em aparelhos reais. Fotos continuam exigindo conexão. Ambiguidades de cadastro exigem revisão explícita. | Equipe/aparelhos/contas reais; fotos não fornecidas |
| 15 | Implementação/publicação entregues; execução pela equipe faz parte do piloto geral. | Piloto geral |
| 16 | Ativar autorização e emissão de eventos privados no servidor; validar reconexão e atualização entre aparelhos reais. | Supabase e aparelhos |
| 17 | Envio de contagem, histórico compartilhado, aprovação autorizada, tratamento transacional de movimentos durante contagem e decisão de ajuste; piloto físico. | Servidor e regras operacionais |
| 18 | Mapa fictício interativo e apresentação sem login prontos, publicado em `f38cc9c`, com recursos públicos conferidos. Faltam posições/códigos reais, vínculo com estoque e conferências aprovadas, configurações compartilhadas e piloto físico. | Dados reais e servidor |
| 19 | Protótipo local da missão pronto, publicado em `2b91830`, Vercel success e quatorze recursos públicos conferidos. Faltam pedidos/reservas compartilhados transacionais, QR físico/identidade, histórico/autorização, regras de expedição e piloto. | Regras, QR e servidor |
| 20 | Divergências aprovadas/histórico compartilhado no mapa e eventual disposição física. Resumo do rascunho local já entregue. | Conferências no servidor e mapa físico |
| 21 | Protótipo de sugestões no cenário do Painel pronto, publicado em `3faabef`, com recursos públicos conferidos. Faltam capacidade/ocupação/espaço e restrições reais validados, servidor/concorrência/reservas e piloto. | Dados físicos e servidor |
| 22 | Detectores locais de prazo e recorrência prontos na apresentação. Faltam regra/datas/conferências reais, histórico compartilhado e resolução; implementar retirada física incompleta e executar piloto. | Regras, identidade física e servidor |
| 23 | Permanência por entrada de grupos pronta no cenário. Faltam identidade/origem/datas reais, rastreabilidade compartilhada e piloto; última movimentação conhecida não prova idade física do saldo. | Identidade/lotes/eventos, servidor e conferência física |
| 24 | Executar o roteiro com equipe e registrar resultados reais. | Equipe e conferência física |
| 25 | Acrescentar testes dos próximos fluxos quando existirem e concluir ensaios reais pendentes; preservar evidências aprovadas. | Funcionalidades futuras e ambiente real |
| 26 | Revisão manual restante, leitor de tela e Safari/iPhone físico; corrigir descobertas do piloto. Auditoria automática não cobre todos os critérios. | Avaliação manual e aparelhos |

## Limites desta rodada

Nenhuma regra física/operacional foi inventada para concluir itens. Não foram criados usuários, aplicada migração, alterado saldo real ou apagado estoque fictício. Não se deve retomar testes concluídos apenas para atualizar documentação ou publicar. Novas verificações devem corresponder a mudanças ou cenários ainda não cobertos.

## 19 — lista de retirada local, 02/11/2026

PDF/CSV do pedido atual com roteiro e progresso, identificação de cancelamento e cópia com data; sem alterar missão ou estoque. Quatro testes novos e verificações isoladas aprovados, PDF inspecionado visualmente. Pode riscar implementação/testes/publicação desse recorte local. Guia: lista-retirada-local-2026-11-02.md. Não encerra as pendências reais da 19. Publicado em `64e92a2`; domínio HTTP 200 e dezesseis recursos públicos iguais ao build aprovado.

## 12 — cancelamento local com motivo, 02/11/2026

Formulário, motivo/data e declaração do retorno das caixas já separadas implementados na apresentação; quatro testes novos e verificações isoladas aprovados, nenhum anterior repetido. Guia: cancelamento-local-2026-11-02.md. Pedidos/reservas/histórico reais e piloto continuam pendentes. Publicado em `f82b482`; quatorze recursos públicos iguais ao build aprovado e domínio HTTP 200.

## 22 — prazo de testagem local, 02/11/2026

Detector por dias corridos na apresentação, prazo configurável por conta/navegador e grupos sem data tratados separadamente. Seis testes novos e verificações isoladas aprovados; nenhum anterior repetido. Guia: prazo-testagem-local-2026-11-02.md. Regra/datas reais, servidor/avisos compartilhados e demais detectores continuam pendentes. Publicado em `8ddf8fd`, Vercel success; quatorze recursos públicos iguais ao build aprovado e domínio HTTP 200.

## 22 — divergências recorrentes locais, 02/11/2026

Regra configurável, deduplicação de conferências por produto/prateleira/situação, evidências e mapa implementados na apresentação. Sete testes novos e verificações isoladas aprovados; nenhum anterior repetido. Guia: divergencias-recorrentes-local-2026-11-02.md. Regra/conferências reais, servidor compartilhado, resolução, retirada física incompleta e piloto continuam pendentes. Publicado em `5e1c31f`, Vercel success; quatorze recursos públicos iguais ao build aprovado e domínio HTTP 200.

## 23 — permanência por entrada local, 02/11/2026

Grupos de entrada de exemplo correspondentes às 85 caixas, limite configurável, desconhecidos separados, filtros e mapa implementados. Sete testes novos e verificações isoladas aprovados; nenhum anterior repetido. Guia: permanencia-caixas-local-2026-11-02.md. Identidade/origem/datas reais, rastreabilidade compartilhada e piloto continuam pendentes. Publicado em `0ffcdbd`, Vercel success; treze recursos públicos iguais ao build aprovado e domínio HTTP 200.

## 6 — recebimento dos Correios local, 02/11/2026

Três remessas de exemplo, quantidade/condição/observação e declaração de conferência, registro recuperável aguardando decisão de destino; sem alterar estoque. Sete testes novos e verificações isoladas aprovados; nenhum anterior repetido. Guia: retornos-correios-local-2026-11-02.md. Regras/destinos reais, identidade/permissões, servidor/expedição e piloto continuam pendentes. Publicação em andamento.
