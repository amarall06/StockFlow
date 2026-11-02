> **17 — vínculos publicados e conferidos, 02/11/2026:** código 5505788, Vercel success, domínio HTTP 200 e dezesseis recursos públicos iguais ao build aprovado. Origem/solicitação, sequência navegável, rascunho e itens encontrados sem saldo preservados; confirmação recuperável sem duplicar vínculos. Dez casos novos de navegador, três roteiros novos de banco e novos casos de modelo/REST/concorrência aprovados, sem repetir casos concluídos. NORTE tem uma recontagem 20/20 aguardando revisão própria; origem 19/20, decisões, estoque e contas preservados. Pode riscar esse recorte da apresentação da 17. Operação/regras reais, ajustes, movimentos durante conferência, mapa e piloto continuam pendentes. Guia `vinculo-recontagens-apresentacao-2026-11-02.md`.
> **17 — vínculo das recontagens, 02/11/2026:** origem/solicitação e nova contagem ligadas atomicamente no Supabase; histórico navegável, rascunho preservado, confirmação recuperável e próxima etapa da sequência implementados. Dez testes novos de navegador, três roteiros novos de banco e novos casos de modelo/REST/concorrência aprovados; nenhum caso concluído repetido. Exemplo NORTE: recontagem 20/20 aguardando revisão própria; contagem original 19/20 e decisões preservadas. Guia `vinculo-recontagens-apresentacao-2026-11-02.md`. Publicação confirmada em 5505788, com recursos públicos conferidos. Não encerra operação real/ajustes/movimentos/piloto.
# Anotação 17 — revisão e aprovação dos exemplos — 02/11/2026

## Entrega

Painel → Visualização do Painel → Apresentação → Conferência de prateleiras → Histórico de envios e decisões. Abra a contagem e use “Revisar contagem”.

Na apresentação, Administrador ativo pode aprovar ou solicitar recontagem, com justificativa entre 5 e 1.000 caracteres e confirmação explícita. Pode revisar inclusive exemplos enviados pela própria conta; essa é a política do cenário, não uma decisão sobre segregação de funções da empresa. Estoquista e Consulta acompanham decisões, sem controle de aprovação. Nenhuma decisão gera movimento, reserva, liberação ou ajuste de saldo.

O envio original permanece intacto. A decisão fica em registro separado e imutável, com responsável/nome no momento da revisão, horário do servidor, justificativa, UUID da tentativa e cópia dos valores revisados. Só há uma decisão por envio. Nova conferência é outra contagem; não há substituição nem reabertura automática da decisão.

## Exemplos no Supabase

- NORTE: **Recontagem solicitada**, por diferença de uma caixa.
- SUL: **Aprovada na apresentação**, com a caixa excedente preservada para análise; sem ajustar saldo.
- OESTE: **Aguardando revisão**, para permitir demonstrar o fluxo.

Não foram criadas pessoas/credenciais. Os dois pareceres foram registrados pela conta administrativa que carregou o roteiro autorizado. Não constituem evidência de conferência física.

## Código e finalidade

- `src/components/PresentationCountReview.tsx`: formulário, decisões, justificativa/declaração, referência congelada, trava imediata, recuperação de confirmação e preservação dos campos em recusa/conflito. Alterar decisão/justificativa exige nova confirmação. Explica o alcance da aprovação.
- `src/components/PresentationShelfCounts.tsx`: consulta decisões para os 50 envios exibidos; apresenta situação atual, responsável, data e nota. Aviso privado/foco/reconexão/intervalo atualizam o histórico sem substituir edição aberta. Guarda confirmação local imutável contra resposta atrasada.
- `src/components/PresentationShelfCounts.css`: campos, contraste nos dois temas, foco e adaptação em tela pequena.
- `src/components/StockPresentation.tsx`: permite revisão apenas ao perfil Administrador da área autenticada.
- `src/components/ShelfCount.tsx`: atualiza a explicação no cenário; rascunho operacional continua local, sem aprovação real habilitada.
- `src/lib/presentation-count-reviews.ts`: prepara requisição, valida vínculo/decisão/justificativa/cópia revisada e combina decisões imutáveis. Rejeita conteúdo divergente ou revisão de outra contagem.
- `src/lib/presentation-count-reviews-api.ts`: leitura autenticada e RPC com confirmação vinculada ao UUID, decisão e justificativa; limite de espera de 15s e mensagens de recuperação/permissão/conflito.
- `supabase/migrations/20261102202843_presentation_count_reviews.sql`: tabela com RLS, somente leitura direta para perfis ativos, RPC invocadora pública e implementação privada. Exige Administrador ativo; serializa UUID e contagem, verifica os valores revisados e impede duas decisões ou reuso incompatível da tentativa. Não altera nenhuma tabela de saldo/movimento nem o envio original. Gatilho emite o sinal privado existente.
- `supabase/seeds/presentation-count-reviews.sql` e fixture `tests/fixtures/presentation-count-reviews.json`: dois pareceres de exemplo, idempotentes por UUID e sem sobrescrever decisões existentes.

## Somente testes novos

1. `scripts/check-presentation-count-reviews.mjs`: validação da decisão/referência/identidade, justificativa, cópia independente, manutenção de confirmação em leitura atrasada, rejeição de revisões contraditórias e remoção de registros fora da lista. Aprovado.
2. `tests/database/presentation-count-reviews-live.sql`: novos casos reais de aprovação/recontagem, autoria, referência congelada, UUID/repetição, decisão final, campos/decisões/contagem inválidos, escrita direta bloqueada, envio original intacto, sinal privado e permissões de Consulta/Estoquista/inativo/sem perfil/anônimo. Transação revertida integralmente, inclusive funções/ativação temporárias dos perfis.
3. Duas conexões reais simultâneas aprovaram o mesmo exemplo SUL com a mesma tentativa. Ambas receberam o mesmo ID e houve um único registro; integra o roteiro final. O seed carregou NORTE e recuperou a confirmação de SUL, sem duplicar.
4. `scripts/check-presentation-count-reviews-rest.mjs`: consulta e aprovação sem sessão recusadas pela API real, HTTP 401 em ambas.
5. `tests/browser/presentation-count-reviews.spec.ts`: dez casos novos aprovados. Sete passaram na primeira execução; três falharam porque o seletor exato do teste incluía o texto preenchido da textarea. Foram corrigidos para o papel/nome acessível e somente os três novos casos falhos foram executados novamente, aprovados em 11,8s. Casos: aprovação entre sessões, autor/nota, recontagem/declaração, resposta perdida, revisão concorrente e preservação do texto, perfis sem aprovação, duplo acionamento, respostas atrasadas/inválidas e teclado/375px/axe A/AA em claro/escuro. API/transporte simulados, não piloto físico.

Build e análise direcionada aprovados. Nenhum teste anteriormente concluído foi repetido. Na conferência final, a mensagem de confirmação do envio foi tornada independente do estado da revisão: recuperar um envio antigo já revisado não deve anunciá-lo como aguardando revisão. Ajuste somente de texto, sem repetir testes aprovados. A auditoria Supabase não acrescentou avisos; os avisos históricos da 7 continuam separados. [Referência sobre permissões de funções](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Conferência real antes/depois: 95 produtos, 113 movimentos e hash de saldos `dfa96a2fa33dcc97c385e1cd5094fd58` preservados. Os três envios originais mantêm hash `0903d67ff6558ada7cf166e07fe6e00a`; decisões são dois registros separados. Planta versão 3, duas contas originais ativas com funções/versão originais e zero auditorias temporárias de acesso preservados.

## Pode riscar e o que falta

Pode riscar **revisão, aprovação/solicitação de recontagem, justificativa/autoria e recuperação de confirmação dos exemplos da 17**, incluindo implementação, testes e publicação. Banco e exemplos aplicados.

Não riscar a 17 inteira. Faltam regras e permissões da operação real (incluindo quem pode aprovar a própria contagem), coordenação de movimentos durante conferência, aprovação operacional/ajustes autorizados com histórico transacional, vínculo entre recontagem e origem, integração com mapa/divergências aprovadas (20) e piloto físico com a equipe. A decisão da apresentação não alimenta o estoque operacional nem o mapa de conferências aprovadas reais.

## Publicação confirmada

Funcionalidade publicada em 31925a00797da7bc30f2b53d69fe4c86880f5825, Vercel success em https://vercel.com/amarall06s-projects/liber-automotive/7XUvauLjaX38FGoieAo8wjHhckgo . Ajuste final de mensagem publicado em 2629d4369d531f2f832fff515118f1411f462851, Vercel success em https://vercel.com/amarall06s-projects/liber-automotive/F3Hxcy4LfzNgonhZtdAy6Z3497Cm . Domínio https://liber-automotive.vercel.app/ com HTTP 200 e dezesseis recursos públicos iguais ao build aprovado em ambas as verificações. Nenhum teste funcional repetido para publicar.
