# Rodada de testes operacionais — 25/10/2026

## Resultado

**56 verificações do banco aprovadas**, mais um ensaio com duas conexões reais e retomada após bloqueio. Os testes usaram o projeto atual com dados fictícios e transações encerradas com ROLLBACK. Não criaram contas, não alteraram cargos permanentemente e não deixaram retiradas ou eventos novos no histórico.

Referência inicial e final: **53 caixas normais, 8 produtos e 26 movimentações**. Conferidos também os hashes das linhas de saldo e de perfil. No ensaio concorrente, o hash de todo o histórico também foi comparado e permaneceu igual.

## 19 verificações de saídas e restrições

- Descarte de amortecedor aguardando teste e descarte de mola em estoque.
- Devolução ao fornecedor de amortecedor liberado e de mola em estoque.
- Quantidades descontadas corretamente e histórico com motivo, referência, nome, conta e data.
- Mesmo identificador e mesmo conteúdo retornam o mesmo evento, sem segunda retirada.
- Mesmo identificador com conteúdo diferente é recusado.
- Saldo insuficiente, quantidade zero, descarte sem motivo e venda de amortecedor não liberado são recusados.
- Recebimento, Testador, Estoquista e Consulta não registram saídas nesta fase.
- Conta inativa não consulta saldos nem registra saída; sessão anônima não executa a RPC.
- Escrita direta nos saldos é bloqueada, inclusive para Administrador autenticado; as operações usam RPC.
- Tentativas recusadas não criam eventos nem alteram quantidades.

Arquivo reexecutável: `supabase/tests/operational-outflows.sql`. É um ensaio, não uma migração. Cria somente cadastros de teste dentro da transação, usa códigos livres e desfaz tudo. A primeira preparação usou uma localização sem normalizar o UUID para maiúsculas; isso foi corrigido no fixture antes da execução aprovada. Nenhuma alteração no código operacional do site foi necessária.

## 37 verificações da matriz de cargos

Cada função foi simulada no contexto `authenticated`, com o perfil alterado apenas dentro da transação. As chamadas atingiram as funções e políticas reais do banco. Não equivale a entrar pela interface com cinco contas diferentes.

| Operação | Administrador | Recebimento | Testador | Estoquista | Consulta |
| --- | --- | --- | --- | --- | --- |
| Consultar saldos | Sim | Sim | Sim | Sim | Sim |
| Receber amortecedores | Sim | Sim | Não | Não | Não |
| Receber molas | Sim | Sim | Não | Não | Não |
| Transferir estoque | Sim | Não | Não | Sim | Não |
| Aprovar teste de amortecedor | Sim | Não | Sim | Não | Não |
| Registrar saída | Sim | Não | Não | Não | Não |
| Alterar estoque mínimo | Sim | Não | Não | Não | Não |

São 35 combinações, mais duas recusas de testagem de mola, para Administrador e Testador. Todos corresponderam às regras existentes. A criação/gestão simplificada de usuários continua adiada.

Arquivo: `supabase/tests/operational-role-matrix.sql`. Todas as alterações temporárias de perfil, produtos, limites, saldos e eventos são desfeitas no ROLLBACK.

## Concorrência real

O usuário executou `scripts/check-concurrency.ps1` no PowerShell. A senha foi informada localmente em entrada oculta. Conexões TLS com verificação de certificado, sem senha no SQL ou no repositório.

1. A conexão A retira um saldo apenas dentro de uma transação, mantendo o bloqueio de linha.
2. A conexão B tenta retirar o mesmo saldo ao mesmo tempo e recebe `55P03` após o limite de espera.
3. A conexão A faz ROLLBACK.
4. A conexão B repete a tentativa com o mesmo identificador e consegue executá-la; também faz ROLLBACK.
5. Quantidades, produtos, perfis e histórico completo coincidem com a referência inicial.

Relatório local: `outputs/verifications/concurrency-20261025-214146-4d9f60/report.json`, status passed. Os arquivos dessa pasta incluem contexto de sessão e ficam fora do repositório.

**Limite:** este ensaio verifica bloqueio e retomada com rollback. Não executou uma disputa em que a primeira retirada é confirmada por COMMIT e a segunda precisa ser recusada pelo saldo já consumido. Isso exigiria um cenário descartável adicional ou um piloto controlado. Não declarar esse caso como executado.

## O que continua pendente antes do uso real

- Piloto com a equipe e logins reais de contas de cada cargo, incluindo visibilidade dos controles na interface.
- Cenários adicionais de concorrência após COMMIT e perda de resposta HTTP com repetição pelo navegador. O reenvio idempotente foi testado no banco, sem simular queda real da internet.
- Upload/substituição de foto real e sua persistência, quando houver imagem apropriada.
- Conferência física e autorização dos dados reais da empresa.
- Restauração do backup em ambiente separado, adiada pelo usuário; não foi realizada nesta rodada.

Esses resultados são uma validação operacional das regras testadas, não uma auditoria completa de segurança ou uma declaração de prontidão para produção real.

## Material para estudo

`BEGIN` inicia a transação; `ROLLBACK` desfaz as alterações. `SET LOCAL ROLE authenticated` faz a chamada usar o papel da API, enquanto o contexto de usuário permite testar a função efetiva do perfil. Os blocos `EXCEPTION` capturam o código SQLSTATE de uma recusa esperada. Um teste passa quando a operação permitida funciona ou a operação proibida retorna o código previsto.

No PowerShell, duas instâncias de `psql` são iniciadas com leitura assíncrona de stdout/stderr. O sinal de bloqueio da conexão A é conferido antes de iniciar a tentativa concorrente. O bloco `finally` encerra processos próprios ainda ativos e remove a senha do ambiente do processo. O relatório distingue sucesso, falha e os limites do teste.
