# LIBER automotive — Modelo inicial do banco de dados

Este documento transforma as anotações da operação em uma proposta de modelo relacional. É um rascunho didático: ainda não conecta a aplicação a PostgreSQL ou Supabase e não usa dados reais.

## Decisões já confirmadas

- O código AGM-35 terá 18 caixas no exemplo: 12 aguardando testagem e 6 liberadas.
- A quantidade principal será contada em caixas.
- Cada caixa contém 2 peças; a quantidade equivalente de peças é calculada, sem somar caixas e peças como se fossem estoques independentes.
- O QR Code atual identifica o produto, não uma caixa individual.
- Localização e situação operacional são campos independentes.
- Até haver autorização, todos os dados usados serão fictícios.

## Relações propostas

Produtos (1) → (N) Saldos (N) ← (1) Localizações
Produtos (1) → (N) Movimentações (N) ← (1) Usuários autenticados
Localizações (0/1) → (N) Movimentações como origem
Localizações (0/1) → (N) Movimentações como destino

## O que cada tabela representa

- **products:** cadastro único do amortecedor. O código e a aplicação ficam aqui, junto com a conversão de peças por caixa e o caminho da foto.
- **locations:** cadastro das prateleiras identificadas.
- **stock_balances:** saldo atual de um produto em uma prateleira e situação. O campo unit_type diferencia caixa fechada de peça solta; quantity guarda a contagem nessa unidade. Uma restrição impede duplicar produto + prateleira + situação + unidade.
- **stock_movements:** histórico de entradas, transferências e demais operações. Cada registro guarda quantidade e unidade, origem/destino, situação, data e usuário responsável.
- **movement_types:** catálogo de tipos de movimentação. A migração inicial inclui recebimento, transferência, testagem e ajuste. Reparos e garantias serão adicionados após confirmar esses fluxos.
- **profiles:** informações básicas do usuário autenticado. As senhas pertencem ao serviço de autenticação, não a esta tabela.
- **auth.users:** tabela gerenciada pelo provedor de autenticação para login. A aplicação relaciona cada movimentação ao usuário, sem guardar senhas por conta própria.

## Exemplo do AGM-35

| Código | Local | Situação | Caixas | Peças equivalentes |
|---|---|---|---:|---:|
| AGM-35 | A03 | Aguardando testagem | 12 | 24 |
| AGM-35 | B01 | Liberado para venda | 6 | 12 |
| **Total** |  |  | **18** | **36** |

A soma total do estoque usa caixas. A coluna de peças é apenas uma conversão: caixas multiplicadas por peças por caixa.

## Fluxo da bipagem

1. O leitor envia o texto do QR Code para o campo ativo; o código localiza o produto no catálogo.
2. Na consulta, o site mostra aplicação, localizações e saldos por situação.
3. Para receber estoque, a pessoa abre a página Recebimento, confere o código, informa quantas caixas chegaram e escolhe a localização.
4. A pessoa confirma o registro. O sistema grava a entrada e a quantidade recebida fica aguardando testagem.

O QR Code repetido não prova que uma caixa específica foi lida uma única vez. Por isso, o desenho não deve somar automaticamente uma caixa a cada bip: a leitura preenche o produto e a pessoa confirma a quantidade do recebimento.

## Imagens

A imagem pequena e a versão ampliada serão associadas ao cadastro do produto. O arquivo da foto fica em armazenamento de arquivos; o banco guarda apenas seu caminho. Isso evita colocar o conteúdo inteiro da imagem na tabela de produtos.

## Login, acesso e segurança

- Email e senha ficam sob responsabilidade de um provedor de autenticação, como Supabase Auth.
- O banco deve exigir login e aplicar políticas de acesso por usuário e função. A matriz de funções (quem pode receber, testar, transferir ou administrar) ainda precisa ser definida antes de publicar.
- Chaves administrativas nunca devem ir para o código do navegador.
- Backups, histórico de alterações, recuperação de conta e resposta a incidentes precisam fazer parte do plano de operação.
- Nenhuma implementação garante imunidade jurídica. A empresa deve aprovar o uso e revisar suas obrigações de privacidade e segurança. Referências: [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) e [guia de segurança da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/processo-guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte.pdf).

## Regras que ainda precisam de confirmação

- **Em aberto, conforme a resposta do usuário:** ainda não se sabe se as duas peças de uma caixa podem ficar em situações diferentes. O protótipo agrupa por caixa apenas para os dados fictícios; o esquema SQL não deve fixar essa regra. Depois de entender o processo, escolheremos entre saldo por caixa, peça avulsa ou ambos.
- Quais funções de usuário existirão e quais operações cada uma pode executar.
- Quais situações serão usadas para testagem, reparo, garantia e devoluções. O processo real ainda tem perguntas sem resposta.
- Quais informações de aplicação, marca, veículo e faixa de ano são necessárias no cadastro.
- Quem poderá enviar/alterar fotos e como as imagens serão aprovadas.

## Estado atual

A primeira migração SQL de demonstração está preparada em supabase/migrations/202610230001_initial_schema.sql. Ela ativa RLS e não cria políticas de acesso; assim, o cliente não acessa tabelas até definirmos permissões. A migração ainda não foi executada nem conectada à aplicação.

## Próximo passo

Revisar a estrutura, definir as políticas por usuário/função e então aplicar a migração num banco de demonstração. A regra de status dentro de uma caixa continua em aberto.
