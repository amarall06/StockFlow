# Laboratório local de perda de confirmação

Ambiente preparado e conferido em 25/10/2026. Não usa contas, senhas, tokens, Supabase ou dados da empresa. O estoque existe apenas na memória de um processo Node, começa com duas caixas de AGM-35 e duas de MGM-35 e desaparece ao encerrar o processo.

## Iniciar

Na pasta do projeto, execute:

```powershell
node scripts/serve-outflow-lab.mjs
```

Abra `http://127.0.0.1:5180/tests/outflow-lab/index.html`. Para encerrar, pressione Ctrl+C no terminal. Iniciar novamente começa um novo estoque de teste.

## O que é real e o que é simulado

O navegador executa o componente real `StockOutflows.tsx`, com React e seus estados reais, e as validações e mensagens de `outflow-api.ts`. O servidor Vite deste laboratório substitui exclusivamente o transporte Supabase por um cliente HTTP local. A resposta é interrompida de verdade com `res.destroy()`, depois que o servidor registra a retirada em memória. Não é apenas lançar uma exceção num mock dentro do navegador.

O armazenamento e a lógica de reenvio do servidor são simulados em memória; não são transações PostgreSQL. A regra do banco foi testada separadamente no ensaio de concorrência. Este laboratório não testa cargos/login reais, navegação na versão publicada nem recarga/fechamento de página durante confirmação incerta. O UUID da tela permanece em `useRef`, não é uma fila persistente após recarga.

## Isolamento

- Escuta somente em `127.0.0.1:5180`, com porta fixa e sem exposição pela rede local.
- Configuração independente do Vite, com `configFile:false`, `envDir:false` e pasta pública desativada.
- Substitui o import de Supabase usado pela API de saídas; tentativa de importar o cliente real é bloqueada.
- A política CSP limita conexões à própria origem e ao WebSocket local do Vite.
- Escritas HTTP exigem origem local correspondente e JSON. Os códigos, local LAB e situações são limitados aos exemplos do ensaio.
- Os arquivos ficam fora de `public/`; o build normal usa somente o `index.html` principal e não inclui o laboratório.
- O aplicativo publicado não recebeu botões, rotas ou configurações de teste. Não houve mudança em seu código operacional.

## Executar o caso manualmente

1. Selecione o saldo AGM-35, mantenha uma caixa e clique Registrar saída.
2. A tela mostra “Não foi possível confirmar”. No quadro do servidor, AGM-35 passa de duas para uma caixa, com um único evento.
3. Clique Restabelecer respostas de amortecedores. Esse botão apenas permite respostas; não retira caixas nem muda o formulário.
4. Sem mudar os campos, clique Registrar saída novamente.
5. A confirmação chega usando o mesmo UUID. O servidor continua com uma caixa e um evento desse produto.
6. Repita selecionando Molas e MGM-35, usando o botão de restabelecimento de molas.

O navegador pode repetir automaticamente um POST cuja conexão foi cortada. Por isso o servidor mantém todas as confirmações daquele produto interrompidas até o botão de restabelecimento. Todas as tentativas ficam visíveis e usam o mesmo UUID.

## Resultado conferido

Nos dois produtos, observados no navegador: aviso de confirmação incerta, mesma identificação antes/depois do reenvio, confirmação final e somente uma retirada por categoria. Resultado final: uma caixa de amortecedor, uma de mola e dois eventos no servidor local. Evidências privadas em `outputs/verifications/outflow-lab-shock-response-lost.png`, `outflow-lab-recovery-both.png` e `outflow-lab-recovery-both.txt` (fora do repositório).

Para verificar o servidor do laboratório por HTTP, sem navegador:

```powershell
node --test tests/outflow-lab/server.test.mjs
```

## Para estudar o código

`Map` relaciona cada UUID ao evento já aceito. Antes de descontar, o servidor procura esse UUID; se já existe, devolve o evento e conserva a quantidade. A comparação do conteúdo impede usar o mesmo UUID para uma retirada diferente.

`fetch` realiza o pedido HTTP. Se o socket fecha sem resposta, ele rejeita a promessa. O cliente local transforma isso no erro de transporte que a API real do componente já trata. `useRef` conserva o UUID do formulário entre tentativas; `useState` atualiza mensagens e bloqueios. `onRefresh` consulta somente o servidor local depois da confirmação.
