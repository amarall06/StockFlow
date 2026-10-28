> **Entrega móvel/empresa publicada:** PR #2 integrada; commit de produção
> `b2a8e37acec73e8dd535a527a77d3da498f9b566`. Vercel confirmou success:
> https://vercel.com/amarall06s-projects/liber-automotive/H5EudPbDowcZqTBxio5DKUMNFBgH
> O domínio público respondeu 200 com menu móvel e gráfico diário novos;
> robots.txt, meta robots e cabeçalho X-Robots-Tag confirmados.
> Banco na API 16; não repetir migrações. Cadastro exige e-mail autorizado;
> contas novas permanecem inativas até aprovação. Conta, saldos e histórico existentes preservados.
> CI da PR #2: run 40611400055, todas as etapas aprovadas.
> Backup privado confirmado em https://github.com/amarall06/StockFlow-backup-privado
> (visibilidade private; o commit testado 13909fcc foi conferido antes deste relatório final).
> Aulas: tutorial-iniciante.md. Livro offline: livro-do-codigo.html, 136 arquivos.
> Capacidade medida e limites: capacidade-e-acesso.md. Relatório: entrega-mobile-empresa.md.
> Não declarar teste de Safari físico ou login real no navegador como realizado.
> O backup do código não substitui backup do banco, das contas ou das fotos do Supabase.
> As notas antigas abaixo não substituem este estado.

# Entrega móvel e uso interno

## Mudanças

Celulares e tablets até 1024 px passam a usar a conta no topo e o seletor de módulos.
O painel mostra blocos clicáveis e deixa os indicadores e a atividade recolhidos. No
computador permanece a navegação lateral. O foco automático no leitor fica restrito
a telas maiores com ponteiro preciso; campos móveis têm fonte mínima de 16 px.
O zoom manual não foi bloqueado. Teclado, leitor de tela e identificação do módulo atual
usam controles nativos do navegador.

A série diária é calculada a partir de stock_movements, preenchendo dias vazios com zero.
Pode-se escolher 7/30/90 dias, vendas/entradas, dia e tabela de valores. Não há números
aleatórios ou imagem fixa para representar tendência. Apenas vendas e entradas entram
nessa série; garantia e transferências não contam como vendas.

O banco exige e-mail autorizado para criar contas novas e mantém o perfil inativo até
aprovação. A conta atual foi preservada. O endereço do login continua alcançável; ter o
link não dá acesso ao estoque. Indexação em buscadores foi desaconselhada por HTML,
robots.txt e cabeçalho HTTP; isso não é controle de acesso.

## Validação realizada antes da publicação

- Build e regressões locais; contrato adicional da série diária, inclusive datas inválidas,
  dias repetidos ou ausentes e quantidades inválidas.
- Navegador Chromium nas larguras 360, 768, 1024 e 1440: navegação por módulos, conta no
  topo, ausência de foco automático em Molas, campos de 16 px, painel resumido, gráfico
  alterando valores/período/tabela, CSV, foto, erros de saída e recuperação de transferência.
- Auditoria automática do login e painel compacto; contrastes corrigidos nos textos de
  conta, subtítulo e blocos. Não equivale à certificação de acessibilidade de cada módulo.
- PostgreSQL 17 descartável: 19 migrações, recuperação concorrente, cadastro recusado para
  e-mail externo, perfil inativo para e-mail aprovado, filtros e agregação diária.
- Ensaio de volume: 114.621 movimentos e RPCs de 500 saídas/900 entradas. Tempos e limites
  de interpretação estão em capacidade-e-acesso.md.
- Supabase hospedado: API 16 confirmada; teste de e-mail não autorizado e séries 7/90 dias
  com ROLLBACK. Permaneceram 1 conta, 53 caixas e 26 movimentos; lista privada não exposta
  e RPC diária não executável por anon. Nenhum convite real enviado durante o teste.

## Limites que não devem ser omitidos

Os testes de navegador autenticado usam sessão e respostas simuladas. Ainda falta o ensaio
com credenciais de teste pela rede real e iPhone/Safari físico. Os avisos anteriores de
lint sobre setState em effects não são erros de compilação; continuam registrados.
As recomendações do advisor sobre índices e políticas sobrepostas exigem análise de uso,
não representam por si só falha observada. Referências:
https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys
https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies

Nenhum conjunto finito de testes garante ausência de todos os erros. O volume passou em
ambiente isolado; CPU, plano, rede e simultaneidade do ambiente hospedado continuam relevantes.
O backup privado do código não é uma exportação das contas, tabelas e fotos do Supabase.

Documentação: tutorial-iniciante.md (aulas) e livro-do-codigo.html (arquivos completos com
responsabilidade, símbolos e código). O livro funciona offline e pode ser regenerado.

## Confirmação final

PR #2 integrada com CI aprovado. Status Vercel do commit de produção: success.
No domínio principal: HTTP 200, arquivo InventoryApp-DdlfIhy-.js e chamada da atividade
confirmados, meta e cabeçalho noindex presentes e robots.txt com Disallow: /.
O repositório externo privado recebeu o commit testado; o relatório final foi acrescentado
na cópia privada em seguida. A origem pública do código permanece pública.

A revisão de segurança mantém avisos contextuais de funções SECURITY DEFINER, tabelas
privadas com RLS sem políticas (acesso direto intencionalmente negado) e proteção de
senhas vazadas ainda desativada. Não foram apresentados como erros de funcionamento
resolvidos. Referências de revisão:
https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
