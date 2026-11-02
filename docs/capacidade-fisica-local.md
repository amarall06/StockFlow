# Anotação 2 — capacidade física por prateleira

01/11/2026. Referência escolhida pelo usuário: capacidade física. O pedido posterior autorizou criar dados fictícios com Norte, Sul, Leste e Oeste e demais valores de exemplo. Essa autorização substitui a restrição anterior a inventar valores apenas no cenário demonstrativo; não transforma exemplos em dados reais da empresa.

## O que está implementado

No Painel, “Ocupação por capacidade física” permite escolher demonstração fictícia ou consulta do estoque. A demonstração inicial contém:

| Prateleira fictícia | Caixas fictícias | Capacidade fictícia | Ocupação |
| --- | ---: | ---: | ---: |
| NORTE | 40 | 40 | 100% |
| SUL | 12 | 60 | 20% |
| LESTE | 33 | 30 | 110%, com 3 caixas excedentes |
| OESTE | 0 | 50 | 0% |

Todas usam a referência “Caixa padrão fictícia”. NORTE inclui caixas aguardando teste e liberadas; SUL contém molas. São dados internos do cenário de exemplo, explicitamente identificados como fictícios; nenhuma prateleira, produto, saldo ou movimentação foi criado no Supabase.

Administrador pode configurar a capacidade de cada prateleira e a referência de tamanho da caixa. Configuração vazia remove a referência; zero, fração, número negativo e referência sem descrição são recusados. Sem capacidade, não há percentual calculado. A barra tem degradê e limita visualmente sua largura a 100%, mantendo percentual/excesso numérico correto acima disso.

Na consulta do estoque, capacidades começam vazias. Somam-se todas as caixas normais da localização, inclusive aguardando testagem e molas, sem alterar ocupação quando se troca o filtro de categoria do Painel. Incluem-se locais com saldo mesmo que fora da lista ativa. Garantia sem localização não entra no cálculo. A medida é em caixas de tamanho equivalente; não representa volume, peso ou comprovação de espaço livre a partir de saldo zero.

## Código e onde foi colocado

- `src/lib/shelf-capacity.ts`: exemplos, cálculo por capacidade informada, validação e armazenamento por conta/modo. Nunca usa o maior saldo observado como capacidade. Modos fictício/consulta têm chaves locais distintas e não copiam valores entre si.
- `src/components/ShelfCapacity.tsx` e CSS: cartões, barras, identificação dos exemplos, seletor de cenário e diálogo de edição; acessível por teclado e em tela pequena. A configuração fica somente na conta/navegador atual; dados inválidos são preservados e não viram capacidade falsa. Mudança da cópia local em outra aba impede sobrescrita sequencial; não é transação distribuída.
- `InventoryDashboard.tsx` e `InventoryApp.tsx`: montagem no Painel com identidade atual, locais e saldo integral. A edição local é oferecida ao Administrador; Consulta visualiza os exemplos. Troca de conta remonta o componente, sem reaproveitar uma edição aberta.

Revisão React aplicada: identidade por conta, estado do formulário preservado, assinatura/limpeza de eventos, diálogo com retorno do foco, rótulos e limite visual da barra. Sem alterações no Supabase ou dependências novas.

## Somente verificações novas

- `scripts/check-shelf-capacity.mjs`: exemplos, denominador físico, 110%, local vazio/desconhecido, saldo em local fora da lista, validação, isolamento por conta/modo, conflito, quota e remoção. A primeira execução ajustou somente a tolerância de ponto flutuante da expectativa de 110%; depois aprovada.
- `tests/browser/shelf-capacity.spec.ts`: seis casos novos aprovados — quatro prateleiras/excesso; edição e reabertura sem copiar exemplos para estoque; soma integral independente de categoria e remoção; conflito/quota; teclado e auditoria automática A/AA em claro/escuro, 375 px. Somente os dois casos novos de foco foram repetidos depois de alinhar a abertura ao botão Fechar seguido de Tab, evitando abrir teclado móvel automaticamente.
- `tests/browser/shelf-capacity-guards.spec.ts`: dois casos novos aprovados — cópia inválida/de outra conta preservada e acesso de Consulta sem edição.

Total: **oito testes novos de navegador e novos cenários isolados aprovados**. Nenhum teste concluído de outras etapas foi repetido. Build final e análise dos módulos novos aprovados. Configurações/cache de teste separados do cache habitual.

## O que pode riscar e limites

Pode riscar a definição “capacidade física”, a implementação local do gráfico/configuração por prateleira e o cenário fictício NORTE/SUL/LESTE/OESTE da anotação 2. Publicado em `7aa9dc5`, conforme registro abaixo.

Falta compartilhar configurações entre contas/aparelhos no servidor e, quando for usar com dados reais, preencher/conferir capacidades e tamanhos reais. O exemplo não encerra mapa físico (18), separação física (3) ou sugestão de espaço (21). A autorização para exemplos não aprova ajustes no estoque real nem a limpeza final da 8.


## Publicação confirmada

Código `7aa9dc585d0ba4bec98be08530874518d60cee22`, main, `amarall06/StockFlow`. Vercel success: https://vercel.com/amarall06s-projects/liber-automotive/GCdkDnzvKpYy8hMvzVZwyZrG3tKB

Domínio https://liber-automotive.vercel.app/ HTTP 200, entrada `index-BuPUpMaV.js`. Seis arquivos públicos (entrada, InventoryApp, Painel, dois CSS associados e módulo modal compartilhado) iguais por SHA-256 ao build aprovado. Diagnóstico local ignorado: `test-results/publicacao-7aa9dc5/hashes.json`. Build/análise aprovados; oito testes novos de navegador e cenários isolados aprovados sem repetir suítes anteriores. Commit `[skip ci]` evita executar novamente as suítes completas de GitHub Actions; compilação da Vercel ocorreu normalmente.

Pode riscar implementação/verificação/publicação do escopo local e fictício da anotação 2. O gráfico aparece no Painel; a edição é por prateleira. Compartilhamento de capacidade entre contas/aparelhos continua pendente de servidor.
