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

O cenário novo após COMMIT foi **executado e aprovado** com `scripts/check-committed-concurrency.ps1`. Relatório privado conferido: `outputs/verifications/committed-concurrency-20261025-220316-d3f50d/report.json`, status `passed`. As seis confirmações ocorreram: primeira retirada confirmada, segunda recusada após COMMIT e reenvio preservando um único evento, para amortecedores e molas. O schema isolado foi removido. Quantidades, produtos, perfis e histórico público coincidiram antes/depois: 53 caixas, 8 produtos, 26 movimentos e hashes iguais. A execução anterior parou na autenticação, antes da preparação dos dados.

O script cria um schema com UUID próprio, copia a estrutura de saldos e movimentos e a definição atual da função de saída, redirecionando somente suas duas tabelas de escrita. Não copia triggers, políticas RLS ou chaves estrangeiras para as tabelas isoladas; este teste cobre a lógica concorrente da função, não essas integrações. Produtos, locais e perfil são apenas consultados. Para cada categoria, semeia uma caixa isolada; a primeira conexão confirma a retirada e a segunda precisa encontrar bloqueio e depois saldo insuficiente. O reenvio da primeira requisição deve conservar somente um evento. O bloco `finally` tenta remover apenas o schema gerado por essa execução e compara os dados públicos antes/depois. Uma falha de conexão pode impedir a limpeza; nesse caso o relatório informa o schema para revisão, sem declarar sucesso. São usadas conexões TLS verificadas.

Os resultados e a remoção foram conferidos no JSON e nos marcadores de saída das duas conexões. O NOTICE de DROP CASCADE lista apenas as duas tabelas e a função do schema de teste; não é falha. O endpoint público original não é chamado nesta modalidade isolada. Os limites descritos na seção da rodada inicial permanecem históricos; o cenário após COMMIT está agora coberto nesta modalidade isolada.

- Piloto com a equipe e logins reais de contas de cada cargo, incluindo visibilidade dos controles na interface.
- Perda de resposta HTTP com repetição pelo navegador. O reenvio idempotente foi testado no banco e após COMMIT na cópia isolada, sem simular queda real da internet.
- Upload/substituição de foto real e sua persistência, quando houver imagem apropriada.
- Conferência física e autorização dos dados reais da empresa.
- Restauração do backup em ambiente separado, adiada pelo usuário; não foi realizada nesta rodada.

Esses resultados são uma validação operacional das regras testadas, não uma auditoria completa de segurança ou uma declaração de prontidão para produção real.

## Material para estudo

### Recarga durante confirmação incerta — reprovado no laboratório

Rodada de 25/10/2026, posterior ao ensaio sem recarga. Em AGM-35 e MGM-35, uma retirada aceita em memória perdeu a confirmação; depois de recarregar, o formulário não recuperou o pedido. Preencher e enviar manualmente a mesma retirada criou outro UUID e um segundo evento. O saldo fictício foi de duas para uma e depois para zero caixa de cada produto, quatro eventos no total. A recarga sozinha não retirou nada. Falha: a interface perde o contexto da operação pendente e não impede que uma repetição manual seja tratada como nova intenção.

Os casos sem recarga continuam aprovados. Este cenário com recarga está **reprovado e sem correção nesta rodada**. Causa: `requestId` vive somente em `useRef` no componente. Próxima correção: persistir e recuperar UUID/conteúdo pendente por usuário, conferir o registro anterior e evitar nova retirada até resolver a confirmação; cobrir saldo já zerado. Detalhes em `docs/laboratorio-perda-confirmacao.md`. Evidências privadas `outputs/verifications/outflow-reload-result.png` e `.txt`. Nenhuma operação foi enviada ao Supabase.

### Confirmação perdida no navegador local — 25/10/2026

Ambiente isolado preparado em `tests/outflow-lab/`, iniciado por `node scripts/serve-outflow-lab.mjs`. Conferido no navegador com componente real, hooks React reais e API de validação real; transporte exclusivamente local, sem Supabase e sem carregar `.env`. O servidor aceita uma retirada em memória e corta o socket HTTP antes da confirmação. Após restabelecer as respostas pelo controle do laboratório, o mesmo formulário reenvia o mesmo UUID.

Para AGM-35 e MGM-35 foram observados o aviso de confirmação incerta, reenvio com UUID preservado, confirmação final e apenas um evento por produto. Estoque local de duas para uma caixa em cada categoria, dois eventos no total. O navegador também fez tentativas automáticas com o mesmo UUID durante a falha, sem retirar novamente. Teste HTTP do servidor passou, incluindo recusa de origem externa, falha real de socket e rejeição de conteúdo diferente com UUID reutilizado.

Guia e limites em `docs/laboratorio-perda-confirmacao.md`. Isso valida o cliente no navegador e a integração com o servidor local de laboratório; não é perda de resposta do endpoint Supabase publicado. O armazenamento local é simulado em memória, e a regra PostgreSQL foi testada separadamente. Recarga/fechamento da página durante envio incerto e logins reais dos demais cargos permanecem pendentes. Nenhum saldo atual foi usado ou alterado pelo laboratório.

### Sessão real de Administrador — 25/10/2026

O usuário entrou pessoalmente no site publicado. O perfil exibiu Administrador. Pela interface foram conferidos os controles de saída, edição de aplicações, entrada de amortecedores/molas, transferência, configuração de mínimo e o diálogo de aprovação de amortecedores. Nenhum formulário de escrita foi confirmado. Na página de molas, entrada usa Em estoque e as linhas não exibem testagem. Essa conferência prova visibilidade dos controles da conta real; não é repetição das operações já testadas no banco.

Consulta agregada de perfis mostrou somente uma conta ativa de Administrador; não existem contas dos outros quatro cargos para login real. Testes desses logins continuam pendentes, sem alterar o cargo da conta existente.

### Interrupção real durante consulta — 25/10/2026

O usuário realizou a desconexão manual e informou o aviso: “Não foi possível atualizar o estoque. Os valores da consulta anterior permanecem na tela.” O aviso foi conferido no navegador, junto dos valores anteriores de 53 caixas e 8 produtos. Após a reconexão, foi clicado Atualizar painel: o botão passou por Atualizando…, o aviso desapareceu e a data da consulta mudou de 22:08 para 22:10 (America/Bahia), mantendo 53 caixas e 8 produtos. A sessão continuou autenticada. Nenhuma operação de escrita foi enviada.

Resultado: falha e recuperação de **consulta** aprovadas no navegador publicado. Evidências privadas em `outputs/verifications/connection-query-offline-20261025.png` e `connection-query-recovered-20261025.png`. Isso não cobre perda de confirmação de uma retirada já enviada, nem recarregar a página durante envio incerto; esses cenários continuam pendentes no navegador.

### Continuação: recuperação da interface — 25/10/2026

Seis cenários adicionais passaram com `node scripts/check-outflow-recovery.mjs`. Os 56 casos anteriores não foram reexecutados nesta continuação. Não houve alteração no código operacional ou nos dados do Supabase.

Para amortecedores e molas, foram executados os handlers reais de `StockOutflows` e a função real `registerOutflow`, usando hooks em memória e transporte simulado:

- Resposta perdida depois de uma aceitação simulada: o segundo envio mantém o mesmo UUID e conteúdo, recebe a confirmação e encerra o formulário.
- Saída confirmada seguida de falha na atualização da consulta: o formulário permanece bloqueado; atualizar o estoque novamente não chama a retirada.
- Resposta demorada: após renderizar o estado de envio em andamento, os campos ficam desabilitados e uma nova submissão não chama a API novamente.

O teste verifica o comportamento do cliente nesses cenários. O registro idempotente do servidor é simulado nesta rodada; sua regra real foi verificada na rodada anterior. Não é teste de navegador, rede real ou ciclo completo do React. Também não cobre recarregar/fechar a página durante um envio incerto. Permanecem pendentes os logins reais por cargo, a disputa após COMMIT e a perda real de conexão.

Para estudar: `useRef` mantém o UUID entre renderizações; `useState` mantém os estados de envio e confirmação. `onSubmit` usa esses estados para bloquear uma nova chamada. Depois de uma confirmação, o botão de atualização consulta os dados sem executar a retirada outra vez.

`BEGIN` inicia a transação; `ROLLBACK` desfaz as alterações. `SET LOCAL ROLE authenticated` faz a chamada usar o papel da API, enquanto o contexto de usuário permite testar a função efetiva do perfil. Os blocos `EXCEPTION` capturam o código SQLSTATE de uma recusa esperada. Um teste passa quando a operação permitida funciona ou a operação proibida retorna o código previsto.

No PowerShell, duas instâncias de `psql` são iniciadas com leitura assíncrona de stdout/stderr. O sinal de bloqueio da conexão A é conferido antes de iniciar a tentativa concorrente. O bloco `finally` encerra processos próprios ainda ativos e remove a senha do ambiente do processo. O relatório distingue sucesso, falha e os limites do teste.
