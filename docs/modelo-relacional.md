# LIBER automotive — Modelo inicial do banco de dados

Este documento transforma as anotações da operação em uma proposta de modelo relacional. O site usa Supabase para login, estoque e histórico. O usuário confirmou a persistência de uma transferência. Os produtos continuam fictícios; nenhuma informação real da empresa foi carregada.

## Decisões já confirmadas

- O código AGM-35 terá 18 caixas no exemplo: 12 aguardando testagem e 6 liberadas.
- A quantidade principal será contada em caixas.
- Cada caixa contém 2 peças; a quantidade equivalente de peças é calculada, sem somar caixas e peças como se fossem estoques independentes.
- As molas serão contadas da mesma forma: por caixas, com a equivalência de 2 peças por caixa usada no protótipo.
- Molas não passam por testagem. O estoque normal de molas usa a situação **Em estoque**; as etapas de teste de amortecedores não se aplicam a elas.
- Molas devolvidas por clientes normalmente seguem para garantia. Como foi dito “geralmente”, o destino deve ser confirmado no recebimento da devolução; o sistema não deve devolver automaticamente essas molas ao estoque normal.
- O número do código de uma mola é independente do amortecedor. Prefixo, número, aplicação e localização são cadastrados por produto; não existe conversão automática AGM-35 → MGM-35 nem vínculo presumido pelo mesmo número.
- Toda nova funcionalidade deve considerar amortecedores e molas no planejamento, mesmo quando a implementação de molas ficar para uma etapa futura. Consulta, cadastro, bipagem, entradas, transferências, histórico e permissões devem compartilhar as regras aplicáveis aos dois tipos.
- O QR Code atual identifica o produto, não uma caixa individual.
- Localização e situação operacional são campos independentes.
- A área de amortecedores em garantia será separada do estoque comercial e organizada pelos prefixos AGM, ARE, AFI e AFR.
- Para o futuro módulo de molas, os prefixos correspondentes informados são AGM → MGM, AFI → MFI, ARE → MRE e AFR → MFR.
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

## Módulos de garantia e molas

- **Garantia:** tem uma página visual própria, fora dos saldos de venda. O fluxo operacional detalhado fica apenas nesta documentação, para não expor rascunhos no site.
- **Molas:** usa a mesma tela de consulta, cadastro, saldo por localização e transferência do módulo de amortecedores, com códigos do catálogo de molas. Os saldos iniciais são fictícios; a contagem de demonstração usa caixas de 2 peças.
- As tabelas e fluxos específicos desses dois módulos não devem ser aplicados ao banco antes de confirmar como a equipe recebe, identifica, guarda e encerra cada caso de garantia e como contabiliza as molas.

## Rascunho do fluxo de devoluções do Mercado Livre

Este fluxo registra o que foi explicado até agora; não é uma política final nem está implementado no banco.

1. O Mercado Livre devolve pacotes. O conteúdo pode ser uma peça da empresa, uma peça errada ou até um item aleatório.
2. Uma pessoa responsável recebe o pacote e o guarda no local indicado.
3. Outra pessoa confere e testa a peça para verificar se pertence à empresa.
4. Se for da empresa e estiver com defeito, ela fica no local de garantias, separada por fábrica.
5. Se for da empresa e estiver boa, o pessoal responsável nos Correios identifica e guarda os itens que vieram junto. Os itens mais comuns citados foram buchas, biela, coxim e “V8”.

### Pontos ainda em aberto

- O que fazer e onde manter um pacote cujo conteúdo seja errado ou aleatório; nenhuma destinação deve ser presumida.
- Se “fábrica” usa as mesmas categorias/prefixos AGM, ARE, AFI e AFR ou uma classificação diferente.
- O destino da peça que passou no teste: sabemos que os itens que vieram junto são identificados e guardados, mas ainda não foi explicado se o amortecedor bom volta ao estoque, segue para outro destino ou é enviado novamente.
- O significado operacional de “V8” e como registrar esses itens que vêm junto.
- Quais campos são necessários para identificar cada devolução e quem poderá alterar o registro.

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
- O banco deve exigir login e aplicar políticas de acesso por usuário e função. Uma proposta inicial está em [matriz-permissoes-rascunho.md](matriz-permissoes-rascunho.md); ela ainda precisa da revisão do usuário e da empresa antes de criar políticas.
- Chaves administrativas nunca devem ir para o código do navegador.
- Backups, histórico de alterações, recuperação de conta e resposta a incidentes precisam fazer parte do plano de operação.
- Nenhuma implementação garante imunidade jurídica. A empresa deve aprovar o uso e revisar suas obrigações de privacidade e segurança. Referências: [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) e [guia de segurança da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/processo-guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte.pdf).

## Regras que ainda precisam de confirmação

- **Confirmado para a etiqueta de teste:** ela identifica uma caixa inteira. A primeira versão rastreará teste, pessoa e data por caixa; não dividirá automaticamente uma caixa em peças com situações diferentes. Exceções futuras de peças avulsas ainda precisam de regra própria.
- Confirmar a proposta de funções e permissões em [matriz-permissoes-rascunho.md](matriz-permissoes-rascunho.md), incluindo quem aprova contas e ajustes de inventário.
- Quais situações e campos serão usados para acompanhar cada devolução. O rascunho de fluxo do Mercado Livre registra o processo conhecido e lista as perguntas pendentes.
- Para o módulo de molas, quais aplicações e locais reais serão cadastrados; os valores atualmente exibidos são fictícios.
- Quais informações de aplicação, marca, veículo e faixa de ano são necessárias no cadastro.
- Quem poderá enviar/alterar fotos e como as imagens serão aprovadas.

## Estado atual

Login, consulta e transferência persistente no Supabase foram confirmados pelo usuário. O histórico foi consultado pela interface e mostrou a transferência. O usuário confirmou a execução da migração `202610240003_springs_without_testing.sql` e a conferência da tela de molas. Os códigos completos de amortecedores e molas são independentes. O esquema ainda não inclui tabelas específicas de garantia.

## Próximo passo

As novas solicitações de aplicações de veículos, tipos de amortecedor, estoque mínimo, painel inicial, giro/ABC e etiquetas de teste estão organizadas em [planejamento-proximas-etapas.md](planejamento-proximas-etapas.md). Planejar devoluções/garantias de molas sem teste e manter os códigos independentes. A bipagem USB funciona quando o leitor se comporta como teclado e envia Enter; a leitura por câmera ainda não está implementada. O fluxo detalhado de garantia e a unidade identificada pela etiqueta de teste continuam em aberto.
