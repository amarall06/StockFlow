# Próximas etapas — anotações de 24/10/2026

Documento interno de planejamento. Estas notas não devem aparecer como rascunhos na interface. Usar produtos fictícios até o usuário fornecer dados autorizados da empresa. Toda funcionalidade deve considerar amortecedores e molas, respeitando suas diferenças.

## O que já funciona

- Login, perfil ativo e permissões no Supabase.
- Catálogo, saldo por localização, entradas e transferências com histórico transacional.
- Histórico com produto, operação, quantidade, situação, data, origem, destino e identificador da conta responsável. Nomes são exibidos quando existem no perfil e a conta pode consultá-los.
- Consulta e histórico de amortecedores e molas, com códigos completos independentes.
- O usuário confirmou a aplicação da atualização que retira testagem das molas e a conferência da tela após a atualização.

## 1. Cadastro e aplicação nos veículos

Solicitação: exibir nome do carro e ano, como na etiqueta, com os anos em texto menor. Mostrar na consulta por código, na linha do estoque e na identificação do produto.

Preparar aplicações estruturadas por veículo e faixa de anos. Um código pode atender vários veículos ou intervalos; não limitar o cadastro a um único nome/ano sem confirmar o catálogo real. Manter a aplicação textual existente durante a transição. Campo vazio não deve virar informação inventada.

Tipos solicitados para amortecedores: pressurizado a gás, hidráulico convencional e regulável. O tipo é próprio do amortecedor e não deve ser exigido para molas. Confirmar depois se estes valores são exclusivos ou se características podem coexistir.

## 2. Identificação das pessoas, entradas e saídas

Permitir cadastrar o nome do usuário para dar legibilidade ao responsável no histórico, preservando o vínculo da movimentação com a conta. Aplicar permissões no banco; editar o próprio nome não pode permitir alterar a própria função ou ativação.

O histórico de transferência já atende a mudança de local e registra quem a fez. Não criar outro histórico paralelo nem permitir reescrever os eventos anteriores pela tela.

Para entradas recentes por fornecedor/lote, registrar fornecedor, referência do lote, data de recebimento e quantidade. A entrada atual guarda produto, quantidade, destino, conta e horário; ainda não identifica fornecedor ou lote.

Para gráficos de demanda, registrar saídas e seu motivo. Vendas, transferências, garantia, devoluções e ajustes são eventos diferentes. Uma transferência entre prateleiras não representa venda ou demanda. A operação de venda/saída ainda não foi implementada; não gerar gráficos como se esses dados já existissem.

## 3. Testagem e etiquetas de amortecedores

Solicitação: consultar quantidade testada/não testada, pessoa que testou e data; imprimir etiqueta com identificação legível e QR Code.

O cadastro do produto não pode ter um único campo booleano de teste: o mesmo código pode ter quantidades e resultados diferentes. Cada evento de teste deve guardar identidade física ou agrupamento rastreável, quantidade/unidade, resultado, conta responsável e horário do servidor. Novos testes preservam os eventos anteriores.

Uma etiqueta genérica contendo apenas AGM-35 identifica o produto, mas não distingue quais unidades passaram por teste. O novo QR deve identificar exclusivamente a unidade física ou agrupamento definido, e a consulta deve buscar sua situação no banco. Imprimir também o código, nome disponível do testador e data. A leitura repetida consulta a mesma identidade e não soma estoque nem marca um novo teste automaticamente.

**Decisão confirmada:** cada etiqueta identifica uma caixa inteira com duas peças. O identificador do QR deve ser único por caixa, mesmo quando várias caixas têm o mesmo código de produto. O registro do teste, responsável, data e situação é vinculado à caixa. Na primeira versão não dividir automaticamente o saldo de uma caixa em peças com situações distintas; qualquer exceção futura precisa de uma regra explícita.

Dimensões da etiqueta e impressora serão definidas antes da impressão. Nenhuma informação de testagem real deve ser fabricada para preencher exemplos sem identificação de demonstração.

Molas não passam por esta etapa. Devoluções de molas normalmente seguem para garantia, com destino confirmado no recebimento; não retornam automaticamente ao estoque normal.

## 4. Estoque mínimo, ruptura e painel inicial

- Definir limite em caixas por código de produto, inclusive para molas. Exemplo fornecido: 2 caixas.
- Considerar o alerta quando o saldo relevante for menor ou igual ao limite. Permitir limite não configurado, distinguindo de um limite igual a zero.
- Mostrar separadamente estoque total, disponível para venda e aguardando teste dos amortecedores. Para molas, usar o estoque normal e não criar situação de teste.
- **Decisão confirmada:** o alerta de reposição considera todas as caixas do estoque normal de amortecedores, somando aguardando testagem e liberado para venda, em todas as localizações. O saldo comercial disponível continua sendo mostrado separadamente. Itens de garantia permanecem fora do estoque normal.
- Diferenciar falta de estoque total de ausência de estoque comercial disponível: caixas aguardando teste não significam que há caixas prontas para vender.
- Ruptura deve considerar os produtos cadastrados que não têm linha de saldo, além das linhas existentes. Não procurar apenas registros com quantity = 0: o modelo remove saldos zerados.
- Painel inicial: alertas de ruptura/estoque mínimo, saídas dos últimos 30 dias por modelo de veículo e entradas recentes com fornecedor/lote.
- Sem saídas registradas, mostrar estado vazio explicando a ausência de registros; não preencher gráfico de demanda com transferências.

## 5. Giro, Curva ABC e estoque parado

Solicitação: aba para produtos de giro rápido e produtos parados, incluindo molas.

Um ranking por quantidade de caixas vendidas pode ser calculado quando houver saídas de venda e período definido. A base da Curva ABC ainda deve ser escolhida: quantidade ou valor movimentado, por exemplo. Uma classificação por valor depende também de valores unitários confiáveis; não apresentar ranking de quantidade como se fosse uma análise financeira.

Para indicar há quanto tempo o saldo remanescente está parado, preservar a data de recebimento do lote/unidade e relacionar as saídas com o saldo correspondente. A última transferência de prateleira não deve reiniciar a idade do estoque. Definir a regra de consumo dos lotes antes de calcular idade remanescente e capital imobilizado.

## Ordem de implementação proposta

1. Cadastro de veículo/anos e características do amortecedor. O usuário confirmou a migração `202610240004_product_applications.sql` e o salvamento. Por pedido posterior, a aba Aplicações lista apenas amortecedores, com lápis no quadro Cadastro salvo para editar os dados existentes. Continuar considerando molas nas demais funcionalidades. Guia: [estudo-cadastro-aplicacoes.md](estudo-cadastro-aplicacoes.md).
2. Nomes dos usuários no histórico e dados de fornecedor/lote nas entradas. O usuário confirmou o salvamento e a persistência do nome pela tela Meu perfil e migração 006. A exigência posterior de nome e sobrenome ainda precisa de implementação. Dados de fornecedor/lote ainda não foram implementados.
3. Registro de saídas com motivos, preservando saldo e auditoria na mesma transação.
4. Testagem rastreável e etiquetas QR de amortecedores por caixa inteira, com identificação única, responsável e data.
5. Limites, ruptura e painel inicial com dados registrados; filtros para os dois tipos de produto.
6. Giro, Curva ABC e idade do estoque após definir métricas e acumular os registros necessários.

O fluxo detalhado de garantia continua a depender das decisões operacionais já documentadas. Nenhuma nova migração foi aplicada a partir destas anotações.

## Pedido posterior: histórico das aplicações

Pedido adicional: mostrar caixas em garantia por fabricante e permitir adicionar/retirar. Interface e migração 008 preparadas com saldos de amortecedores/molas separados, sem misturar com estoque normal e com auditoria. Aguarda aplicação e teste no Supabase. O tema passou a usar lua/sol no cabeçalho de todas as telas, e as ações Editar usam lápis. Guia: [estudo-caixas-garantia.md](estudo-caixas-garantia.md).

Atualização de prioridade: usuários/convites/painel de acesso foram adiados por pedido do usuário. Foi preparada a página de fabricantes da garantia para amortecedores e molas, com Moripar, Trebor e New Parts e cadastro/edição pelo administrador. Aguarda aplicação da migração 007. Guia: [estudo-fabricantes-garantia.md](estudo-fabricantes-garantia.md).

As novas decisões sobre cargos obrigatórios, nome completo, fabricantes da garantia, painel administrativo e convites estão em [regras-acesso-administracao.md](regras-acesso-administracao.md).

Criada uma prévia de três registros no cadastro do amortecedor e botão para abrir o histórico completo paginado, com antes/depois, autor e data. A migração 005 foi conferida ativa: a interface carregou a situação inicial e abriu a janela completa com as versões do AFI-89. O cadastro existente é ponto de partida, sem reconstruir edições antigas. Guia: [estudo-historico-aplicacoes.md](estudo-historico-aplicacoes.md).
