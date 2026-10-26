# Recuperação de saída após recarregar

Correção local de 25/10/2026 para amortecedores e molas. Nenhuma migração SQL necessária. Publicação depende de enviar a revisão ao GitHub e conferir o deploy.

## Como funciona

Antes de enviar uma saída, a tela valida os campos e grava o UUID e o conteúdo original no `sessionStorage`. A chave inclui o ID autenticado da conta, recebido do Supabase Auth pelo `App.tsx`. O armazenamento é separado por aba e origem; a conta fictícia do laboratório é diferente da conta do site.

Enquanto existe pedido pendente, o formulário fica bloqueado e aparece **Conferir pedido pendente**. Após recarregar na mesma aba, o Administrador é encaminhado à página Saídas para recuperar o pedido daquela conta. Sair e voltar à página também conserva a pendência. Nada é reenviado automaticamente.

O botão de conferência chama a mesma RPC com o mesmo UUID e o mesmo conteúdo. Se a primeira tentativa já foi salva, a função do banco retorna o evento existente antes de verificar o saldo atual. Isso funciona mesmo se a retirada zerou o saldo e a linha desapareceu da consulta. Se a primeira tentativa não chegou, ela pode ser executada uma vez após a conexão voltar.

Quando a RPC confirma, o pedido passa para a fase `confirmed`. Se apenas a atualização da consulta falhar, uma nova tentativa atualiza os dados sem executar outra retirada. O pedido local é removido somente depois da confirmação e da atualização bem-sucedida, ou de uma recusa explícita do servidor. Falha de rede conserva a pendência. Se o armazenamento estiver indisponível antes do envio, nenhuma requisição é enviada.

Dados de recuperação inválidos bloqueiam novas saídas, com orientação para conferir o histórico. Eles não são apagados silenciosamente. Nenhuma senha ou token é guardado nesse registro; código, local, quantidade, motivo, observação e referência pertencem ao pedido. A sessão de login continua sendo tratada separadamente pelo Supabase.

## Limites

A proteção é para **recarga e navegação na mesma aba**. Fechar a aba, limpar os dados do navegador, usar outra aba independente/dispositivo ou uma versão publicada antiga não estão cobertos. Não é uma fila offline de todas as operações do sistema. Saldos, permissões, autoria e idempotência continuam sendo verificados pelo banco. O pedido local não concede acesso.

## Onde estudar

- `src/lib/pending-outflow.ts`: leitura, validação, gravação e remoção do pedido por conta.
- `src/components/StockOutflows.tsx`: mensagens, bloqueio, recuperação e atualização após confirmação.
- `src/lib/outflow-api.ts`: validação e classificação de recusas explícitas.
- `src/App.tsx`: encaminha o ID autenticado e recria a tela quando a conta muda.

## Recursos da linguagem e do React

```ts
const [recovery, setRecovery] = useState(() => readPendingOutflow(userId)) // Lê o pedido ao montar o componente.
const pending = recovery.pending // const dá um nome ao pedido atual; não permite reatribuir essa variável.
const busy = useRef(false) // Mantém o bloqueio imediato de cliques durante uma requisição.
sessionStorage.setItem(key, JSON.stringify(operation)) // Converte o objeto em texto e guarda nesta aba.
const operation = JSON.parse(raw) // Reconstrói o objeto; o código real valida seus campos antes de usar.
```

`useState` provoca nova renderização quando o estado muda. Seu inicializador em função evita ler o armazenamento em toda renderização. `useRef` continua útil para bloquear cliques, mas não é usado como armazenamento durável do pedido. `sessionStorage` sobrevive à recarga da aba. `JSON.stringify` serializa e `JSON.parse` desserializa os dados.

O `try/catch` diferencia erro de rede de recusa explícita e protege falhas do armazenamento. O `finally` libera o indicador de requisição em andamento. O evento `onClick` do botão de conferência chama `resolvePending`; o `onSubmit` do formulário prepara uma nova operação apenas quando não há pendência.

## Validação

No navegador do laboratório: retirada de **duas caixas** de cada categoria, confirmação interrompida, recarga, recuperação e conferência com o mesmo UUID. Resultado final: zero caixa local em cada categoria e **dois eventos totais**, um por produto. A produção e seus dados não foram usados.

O script `node scripts/check-outflow-recovery.mjs` verifica 16 cenários locais, incluindo regressões após a mudança, saldo zero, confirmação seguida de falha de consulta, recusa explícita, armazenamento indisponível, dados inválidos e separação de contas. O teste do componente usa hooks em memória; o ensaio no navegador complementa com React e HTTP reais contra servidor em memória. Não equivale a teste de cinco logins reais ou corte de resposta no endpoint publicado do Supabase.
