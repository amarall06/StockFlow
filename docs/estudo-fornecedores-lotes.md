# Fornecedores e lotes nas entradas

## Ativação concluída

A migração `supabase/migrations/202610250003_receipt_suppliers.sql` foi aplicada pelo usuário e a API 10 conferida pela interface. Não repetir neste banco. Em ambiente novo, aplicar a cadeia em ordem, uma vez cada. A entrada antiga continua disponível em bancos anteriores, sem os novos campos.

## Uso e regras

O formulário Registrar entrada de estoque ganha Fornecedor e Referência do lote nas duas categorias, amortecedores e molas. Ambos são opcionais; lote exige fornecedor. Um mesmo lote de texto pode aparecer em vários recebimentos. O registro de cada entrada mantém sua própria quantidade e data do servidor.

Administrador cadastra fornecedores pelo painel recolhível Cadastrar fornecedor. Recebimento escolhe fornecedores existentes. Consulta, Testador e Estoquista não registram entradas. Produto novo continua restrito a Administrador. Não foram criados fornecedores reais nem copiados fabricantes da garantia para o cadastro de fornecedores.

A aplicação do produto, saldo e movimentação da entrada são gravados na mesma transação. Produto existente não tem sua aplicação substituída. Molas ficam Em estoque, mesmo se outro estado for enviado por engano. O papel Recebimento só recebe amortecedores aguardando teste. A entrada administrativa como Liberado para venda não inventa um testador; aprovações rastreáveis usam o ícone de testagem.

O histórico de movimentações mostra fornecedor e lote quando informados. O nome do fornecedor é copiado para o evento no momento do recebimento; nome/data da conta seguem as regras do histórico existente. Entradas antigas ficam sem fornecedor e lote conhecidos. Não se inferem essas informações dos nomes das marcas ou dos códigos.

Esta etapa documenta os lotes recebidos, sem calcular o saldo restante por lote. Transferências e aprovações continuam trabalhando com os saldos agrupados por código/local/situação. Não prometer idade do estoque remanescente, FIFO, custo ou Curva ABC financeira a partir desses dados; exigem vínculo entre entrada e saída por lote em uma evolução posterior. Registro de saídas por motivo também continua pendente.

## Código explicado

`ReceiptForm.tsx` mantém os campos usando `useState`. Exemplo: `const [lot, setLot] = useState('')` começa com lote vazio. `onChange` atualiza o campo com `setLot`. `const` impede reatribuir essa referência; o React mantém o estado atualizado pela função correspondente.

`useEffect` consulta fornecedores ao abrir ou atualizar a lista. A variável de controle no retorno do efeito impede que uma resposta antiga atualize um componente que já não precisa dela. O formulário é recriado ao trocar a categoria, evitando levar dados de amortecedores para molas.

`onSubmit={submit}` executa a validação e chama `receiveWithSupplier` usando `await`. Enquanto espera, `saving` desativa o formulário. `requestId` é um `useRef` que conserva a identificação de uma mesma tentativa quando falta resposta de rede. Repetir o mesmo envio não soma caixas duas vezes; mudar campos representa um novo envio.

`recorded` indica que a gravação foi confirmada. Se a consulta de atualização falhar depois disso, o botão Atualizar estoque repete somente a consulta. O formulário continua bloqueado até atualizar, evitando que um erro de leitura seja confundido com entrada não salva.

`normalizeReceipt` converte código/local em maiúsculas, remove espaços nas pontas e valida caixas inteiras, código e relação lote/fornecedor. Campos opcionais vazios viram `null`. `receiveWithSupplier` envia a requisição, e `createSupplier` normaliza espaços do nome. O servidor define usuário, data e nome do fornecedor; o navegador envia a referência escolhida.

No SQL, `receive_stock_with_supplier` confere cargo, categoria, produto, local e fornecedor. Se o produto é novo, somente Administrador pode criá-lo. Soma o saldo e grava fornecedor/lote no evento, tudo junto. `receipt_request_id` único e o bloqueio por envio tratam repetições simultâneas. `receipt_payload` guarda os dados normalizados do envio para rejeitar uma identificação reutilizada com outros campos. RLS mantém fornecedores legíveis apenas a contas ativas; o navegador não escreve diretamente nessas tabelas.

`MovementHistory.tsx` consulta a versão da API antes de pedir as novas colunas. Isso preserva a consulta nas versões anteriores. A alteração adiciona fornecedor/lote na célula do produto sem mudar filtros e paginação.

## Verificação

`node scripts/check-receipts.mjs` testa normalização, lote sem fornecedor recusado, quantidade fracionada/zero recusada, códigos sem zeros iniciais, molas sem teste, reenvio com mesmo identificador e opções por cargo. Esses testes não acessam o banco.

Compilação passou e lint não apresentou novos avisos. Conferido no Supabase em 25/10/2026: cadastro de Fornecedor fictício, entrada de 1 caixa AGM-35 em A03 com lote DEMO-A e 1 caixa MGM-35 em A03 com lote DEMO-M. O amortecedor entrou aguardando teste e a mola Em estoque. Totais passaram de 38 para 39 caixas de amortecedores e de 15 para 16 caixas de molas. Ambos os eventos mostraram fornecedor, lote, quantidade, destino A03 e responsável Felipe Amaral no histórico, inclusive depois de recarregar. Os registros antigos permaneceram sem dados inventados. As duas entradas fictícias foram preservadas, sem removê-las ou repetir a gravação.

Ainda não exercitados no Supabase: cadastro de produto novo por esta RPC, sessão Recebimento/Consulta, repetição simultânea do envio e falha de rede após gravar. Essas verificações adicionais continuam necessárias antes de uso real. Não repetir uma entrada para conferir se salvou: consultar o histórico e recarregar.
