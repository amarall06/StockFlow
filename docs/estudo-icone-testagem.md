# Ícone de testagem ao lado das caixas

## Ativação

Migração aplicada e conferida no Supabase: `supabase/migrations/202610250002_shock_testing.sql` (API 9), depois de `202610250001_warranty_returns.sql`. Não repetir neste banco. Em ambiente novo, aplicar a cadeia na ordem, uma vez cada, e recarregar o site.

## O que aparece

Cada linha de amortecedor mostra um ícone de teste junto da quantidade de caixas. Ao clicar, a janela consulta o histórico de aprovações do produto: caixas aprovadas, nome do responsável, data/hora (Bahia) e localização no momento do teste. Molas não mostram esse botão e são recusadas pela operação do servidor.

O histórico é por produto, em todas as localizações, com dez registros por página. Não indica que todas as caixas da linha atual pertencem ao teste mostrado. Uma transferência posterior não altera o local histórico. Sem etiqueta individual, não é possível associar o evento a uma caixa física específica: a etapa de etiquetas e QR foi adiada pelo usuário.

Saldos antigos liberados não recebem testador ou data inventados. Novas entradas administrativas como Liberado para venda também não geram um evento de teste. Não chamar todo saldo liberado de saldo com teste rastreável.

## Como registrar

Administrador ou Testador abre o ícone na linha Aguardando testagem e informa quantas caixas inteiras testou e aprovou. O banco reduz essa quantidade da espera e soma exatamente a mesma quantidade em Liberado para venda, no mesmo local. O total permanece igual. O nome vem do perfil da conta autenticada e a data vem do servidor; nenhum deles é digitado no formulário. O nome é guardado como estava no momento da aprovação.

Uma aprovação não pode superar o saldo esperando teste. Leituras desatualizadas são recusadas pelo banco. Um mesmo envio pode ser repetido sem aprovar duas vezes. As demais contas ativas podem consultar o histórico e não têm formulário de aprovação.

Este recurso registra aprovações, não reprovações. Caixas reprovadas seguem o fluxo de garantia; essa operação ainda não está integrada automaticamente ao estoque normal. Não usar aprovação para representar uma caixa com defeito. Também não registra aprovação individual das duas peças nem reescreve um evento antigo.

## Código para estudar

`ShockTestButton` desenha o ícone em SVG. `title` mostra a dica ao passar o mouse; `aria-label` informa sua função para quem usa leitor de tela. O `onClick` chama `setTestingRow(row)` no App, guardando a linha selecionada e abrindo a janela. A condição `!isSpringPage` deixa o botão apenas em amortecedores.

`ShockTestingDialog` usa `useState` para guardar quantidade, erro, envio e página. Exemplo: `const [quantity, setQuantity] = useState('1')`. O valor começa como texto porque vem de um campo; `Number(quantity)` converte antes de enviar, e `Number.isInteger` impede caixas fracionadas. `const` impede reatribuir a referência, sem impedir que a função `setQuantity` atualize o estado.

`useRef` mantém o elemento `<dialog>` e a identificação do envio entre renderizações. `useEffect` abre a janela e consulta o histórico ao mudar a página. Seu retorno fecha a janela ou ignora respostas de consultas antigas.

`onSubmit={submit}` chama a validação ao confirmar o formulário. `await approveShockBoxes(...)` aguarda o banco. `try/catch/finally` cuida de sucesso, erro e fim do carregamento. Se a conexão falhar, o identificador é reutilizado ao tentar novamente com a mesma quantidade.

`loadShockApprovals` consulta uma página e um registro extra para descobrir se há próxima página. `approveShockBoxes` envia somente código, local, quantidade e identificação da requisição. O SQL `approve_shock_boxes` verifica cargo, nome, categoria e saldo; altera as duas situações e grava os históricos de testagem e movimentação na mesma transação. Qualquer falha desfaz tudo. As tabelas não permitem escrita direta pelo navegador.

## Verificações

`node scripts/check-shock-testing.mjs` verifica rejeição de molas, quantidades inválidas, manutenção do identificador ao repetir, ausência de nome/data editáveis no envio, paginação, ícone acessível e formulário somente para quem pode aprovar. Não acessa o banco e não comprova a transação SQL.

Conferência no Supabase: 1 caixa fictícia AGM-35 em A01 aprovada pela conta Felipe Amaral em 25/10/2026 às 11:40 (Bahia). O local ficou com 2 aguardando e 1 liberada; o total geral permaneceu 38 caixas, agora 24 aguardando e 14 liberadas. Nome/data e saldos persistiram após recarregar. A janela de AFR-57 mostrou ausência de registros antigos sem inventar autoria. Na aba Molas, os ícones de testagem não aparecem e o saldo permaneceu 15 caixas.

Ainda não exercitados no banco: conta Testador, conta de consulta, concorrência e repetição em falha de rede. Não desfazer um teste alterando eventos antigos: um ajuste futuro deverá ter operação auditada própria.
