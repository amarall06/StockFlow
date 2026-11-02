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

- 10/25/26: orientação interna de instalação Windows/Android/iPhone pronta, com cinco testes novos aprovados, inclusive sem convite automático; publicação em preparação. Não encerra instalação real.

## O que depende de você

O preenchimento prático, sem solicitar senhas ou decisões técnicas do servidor, está em `definicoes-da-empresa-26-anotacoes.md`. Respostas podem ser fornecidas por grupos conforme a empresa tiver as informações.

## Pendências por número

| Nº | O que falta | Dependência principal |
| --- | --- | --- |
| 1 | Sem pendência de implementação no escopo entregue; observar comportamento no piloto. | Piloto geral |
| 2 | Definir e cadastrar capacidade/meta real para o gráfico de cheio; depois implementar proporção. | Decisão/dados da empresa; persistência compartilhada |
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
| 18 | Validar mapa físico/posição das prateleiras e implementar busca/destaque/legenda sem depender só de cor. | Mapa real e dados compartilhados |
| 19 | Definir pedido, reserva, separado/expedido, identidade QR e concorrência; implementar missão de separação. | Regras, QR e servidor |
| 20 | Divergências aprovadas/histórico compartilhado no mapa e eventual disposição física. Resumo do rascunho local já entregue. | Conferências no servidor e mapa físico |
| 21 | Cadastrar capacidade/ocupação/restrições confiáveis e mapa, então sugerir espaços. Saldo zero não comprova espaço livre. | Dados físicos e servidor |
| 22 | Definir retirada física incompleta, prazo em teste e limiar de divergência recorrente; criar registros/regras correspondentes. | Regras e histórico compartilhado |
| 23 | Rastreabilidade e idade física das caixas; última movimentação conhecida já entregue e não prova idade do saldo. | Identidade/lotes/eventos e regra operacional |
| 24 | Executar o roteiro com equipe e registrar resultados reais. | Equipe e conferência física |
| 25 | Acrescentar testes dos próximos fluxos quando existirem e concluir ensaios reais pendentes; preservar evidências aprovadas. | Funcionalidades futuras e ambiente real |
| 26 | Revisão manual restante, leitor de tela e Safari/iPhone físico; corrigir descobertas do piloto. Auditoria automática não cobre todos os critérios. | Avaliação manual e aparelhos |

## Limites desta rodada

Nenhuma regra física/operacional foi inventada para concluir itens. Não foram criados usuários, aplicada migração, alterado saldo real ou apagado estoque fictício. Não se deve retomar testes concluídos apenas para atualizar documentação ou publicar. Novas verificações devem corresponder a mudanças ou cenários ainda não cobertos.
