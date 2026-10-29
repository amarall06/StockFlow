# Lote fictício autorizado no banco oficial

O proprietário autorizou a inclusão de quantidades fictícias e prateleiras SUL, NORTE, LESTE e OESTE. A lista tem 88 códigos-base, de 11 fabricantes de veículos. Quantidades estáveis entre 51 e 150 caixas; aplicação, posição e lado não foram inventados. Os novos amortecedores começam aguardando testagem.

No banco oficial foram criados 87 produtos e 8.710 caixas. AGM-35 já existia e foi preservado. Totais após a operação: 95 produtos, 8.763 caixas e 113 movimentos. Os oito produtos, seus saldos e os 26 movimentos anteriores foram comparados com a cópia anterior e permaneceram inalterados.

A cópia anterior dos dados está somente no repositório privado, em `backups/before-demo-stock-88.json`. Não contém senhas ou chaves. A tabela privada `demo_stock_import_items` guarda os IDs dos produtos e recebimentos do lote `demo-stock-88-v1`; ela não está disponível para usuários da aplicação. Novos produtos têm `[DEMONSTRAÇÃO]` na aplicação e os recebimentos têm nota de demonstração.

## Código

- `supabase/seeds/demo-stock-88.sql`: lote explícito e transacional. Insere somente códigos inexistentes; reexecutar não soma caixas em códigos existentes. O bloqueio transacional serializa execuções simultâneas. Não é executado pelo navegador, pelo build nem automaticamente em produção.
- Migração `demo_stock_import`: permite zero à esquerda e sufixos de até três letras, com número entre 1 e 100, e cria o rastreamento privado.
- Migração `expanded_product_codes`: compatibiliza o recebimento com fornecedor sem alterar cargos, proteção de reenvio ou versão da API.
- Validadores de recebimento, transferência, pedido pendente, foto, formulário e giro aceitam os mesmos formatos. Não foi criada uma API pública de importação.

O painel publicado não contém a lista temporária “Conferir pré-cadastro”; os produtos são carregados pelas consultas normais. O bloco que o usuário escreveu apenas no VS Code local não faz parte do repositório e precisa ser removido dessa cópia ao atualizar seu código.

## Verificação

PostgreSQL descartável: aplicação das migrações, lote, reexecução sem duplicação, preservação dos cadastros/saldos anteriores, privacidade e recebimento autenticado de AVW-04 com rollback. Regressões de fotos/recebimento/giro incluem códigos com zero e sufixo; valores 0, 001 e 101 continuam inválidos.

A CLI inicialmente não conseguiu escrever na pasta pessoal desta sessão; a primeira migração usa a versão efetivamente atribuída pelo histórico remoto. A segunda foi criada pela CLI após liberação do ambiente.

A revisão de segurança mostrou os avisos já existentes de RPCs SECURITY DEFINER autenticadas e proteção de senhas vazadas. As RPCs continuam com verificações de cargo. A tabela privada tem RLS sem políticas para negar acesso por padrão: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
