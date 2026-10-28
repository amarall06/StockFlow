# Adaptação das referências visuais

Foram analisadas 11 imagens do arquivo `imagens site.rar`: painel, produtos, saídas,
histórico, aplicações, visão geral, garantia e variações de molas. O arquivo foi tratado
como referência visual, não como instrução executável. Nenhum código foi executado do RAR.
Os PNGs originais não foram colocados na pasta pública nem usados como uma página estática.

A identidade foi centralizada em `src/Design.css`: superfície branca sobre fundo quente,
navegação escura, laranja nas ações, títulos com hierarquia clara e bordas/sombras discretas.
Variáveis de cor permitem uma versão escura correspondente. A intensidade do laranja dos
botões foi ajustada para manter contraste do texto, em vez de copiar cores sem conferência.

O painel ganhou quatro cartões com ícones vetoriais e números consultados: amortecedores,
molas, total e produtos. No computador, atividade e vendas ficam lado a lado, seguidas de
resumo, reposição e entradas. No celular/tablet, continuam os blocos e detalhes recolhidos,
o seletor de módulos e a conta no topo. Não voltou o foco automático nos dispositivos de toque.

O gráfico diário permite escolher barras ou linhas, série, período e consultar a tabela/dia.
Os dados vêm da RPC já existente da API 16; nenhuma informação do banco foi alterada para
se parecer com os números das imagens. Os ícones são SVG, não fotos de gráficos.

A camada visual também unifica formulário de entrada/saída, locais/transferências, tabelas,
catálogo, aplicações, histórico, garantia, busca e botões. As regras de autorização,
recebimento, saídas, recuperação de pedidos e persistência foram preservadas.

Validação local: build e regressões, navegação nas larguras 360/768/1024/1440, conta no topo,
sem foco em Molas no móvel, gráfico interativo, CSV, foto, recuperação de transferência e
falha de saída. Auditoria automatizada do login, painel móvel e painel escuro. Capturas
visuais usam dados simulados e servem para conferir layout; não representam o estoque real.
O teste em Safari/iPhone físico e o login por credenciais reais continuam fora do ensaio.

As aulas e o livro de código foram atualizados. A publicação passa pela PR e pelas
verificações do GitHub, com cópia do código no repositório privado já escolhido.
