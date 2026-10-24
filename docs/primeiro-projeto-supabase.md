# Conectar o LIBER automotive ao Supabase

O projeto Supabase já existe. A conexão ainda não está ativa na aplicação e as migrações abaixo ainda não foram aplicadas. Use somente dados fictícios durante a aprendizagem.

## Configuração local

O Project URL e a Publishable key estão em `.env.local`, que é ignorado pelo Git. O cliente `@supabase/supabase-js` foi instalado e `src/lib/supabase.ts` lê esses valores, mas a interface ainda usa os dados fictícios.

Não use uma chave Secret (`sb_secret_`) no navegador nem no GitHub. A Publishable key pode ser usada no cliente quando RLS estiver configurado.

## Aplicar o esquema no banco de demonstração

O teste no PowerShell normal confirmou que seu computador chega ao projeto pela porta 443. O HTTP 404 recebido na raiz é esperado para esse endereço: ele não oferece uma página inicial. Ainda falta criar as tabelas e regras de acesso.

1. No painel do Supabase, abra o projeto **LIBER automotive** e entre em **SQL Editor**.
2. Abra [a migração inicial](../supabase/migrations/202610230001_initial_schema.sql), copie o conteúdo completo, cole como uma nova consulta no SQL Editor e clique em **Run**.
3. Só depois de a primeira consulta terminar sem erros, crie uma nova consulta e execute [a migração de funções e RLS](../supabase/migrations/202610240001_access_roles.sql).

A primeira migração cria o esquema inicial e ativa RLS sem políticas. A segunda adiciona as funções, cria perfis inativos por padrão e permite leitura a contas ativas. Ela mantém a escrita direta nos saldos e no histórico bloqueada até criarmos operações transacionais com auditoria.

As funções auxiliares `SECURITY DEFINER` ficam no esquema `private`, que não deve ser incluído entre os esquemas expostos pela API. O gatilho de criação de perfil deve ser validado em uma base de demonstração porque um erro nele pode impedir novos cadastros. Consulte a [orientação oficial do Supabase sobre RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) e [gerenciamento de dados de usuário](https://supabase.com/docs/guides/auth/managing-user-data).

## Criar o primeiro administrador

Depois das migrações, crie ou convide o usuário inicial em **Authentication → Users**. O gatilho cria um perfil inativo com função **Consulta**. Copie o UUID da conta e execute no SQL Editor, substituindo o texto de exemplo pelo UUID:

```sql
update public.profiles
set role = 'administrator', is_active = true
where id = 'UUID-DA-CONTA-INICIAL';
```

Se já houver usuários de Auth criados antes da instalação do gatilho, eles precisarão receber perfis antes de entrar na aplicação. Não compartilhe a senha do banco.

## Ativar o estoque integrado de demonstração

Depois de confirmar que o perfil da conta inicial está ativo e como administrador, aplique [a migração de operações](../supabase/migrations/202610240002_stock_operations.sql) em uma consulta nova do SQL Editor. Ela libera recebimento e transferência por funções transacionais que gravam saldo e histórico juntos.

Antes da carga fictícia em uma instalação nova, aplique também [a regra de molas sem testagem](../supabase/migrations/202610240003_springs_without_testing.sql). Depois execute [a carga de demonstração](../supabase/seed_demo.sql) em outra consulta nova. Ela interrompe a execução se já houver produtos, saldos ou localizações. Em uma instalação que já contém os exemplos, execute somente a nova migração de molas e não repita a carga.

Após aplicar as duas consultas, recarregue o site e entre com uma conta ativa. Se nenhuma carga fictícia for aplicada, o site continua mostrando o modo local de demonstração.

## Estado do trabalho

- O usuário informou que as duas migrações foram executadas com sucesso no projeto Supabase.
- O usuário informou sucesso ao executar o SQL de ativação da primeira conta; ainda é preciso conferir que a consulta encontrou a linha e que o perfil está com `role = administrator` e `is_active = true`.
- A URL e a Publishable key ficam localmente em `.env.local`; não as coloque no GitHub.
- O pacote oficial do Supabase está integrado. A interface oferece entrada por e-mail e senha, verifica o perfil ativo e lê os cadastros e saldos do banco depois que a migração de operações está instalada.
- O usuário confirmou dados vindos do Supabase e uma transferência persistente após recarregar. O histórico também carregou e mostrou o movimento em uma consulta pela interface.
- O usuário confirmou a aplicação de `supabase/migrations/202610240003_springs_without_testing.sql` e a conferência das molas sem testagem.
- O usuário confirmou a migração 004 e o salvamento de aplicações. A aba Aplicações lista somente amortecedores a pedido do usuário.
- O histórico da migração `supabase/migrations/202610240005_application_history.sql` foi conferido ativo no site. A prévia carregou a situação inicial do AFI-89 e o botão abriu a janela completa com a comparação antes/depois. As novas edições passam pela função de salvamento com auditoria.
- O usuário confirmou o salvamento e a persistência do nome pela tela Meu perfil e migração `supabase/migrations/202610240006_own_display_name.sql`. A nova exigência de nome completo e o cadastro de usuários pelo painel estão no planejamento de administração.
- O usuário adiou a etapa de usuários. O cadastro da migração `supabase/migrations/202610240007_warranty_manufacturers.sql` foi conferido ativo: a aba Garantia carregou Moripar, New Parts e Trebor do Supabase e exibiu a edição para o administrador.
- A migração `supabase/migrations/202610240008_warranty_boxes.sql` está preparada para entradas e retiradas de caixas por fabricante/categoria. Aguarda execução no Supabase. Os novos ícones de tema e edição já funcionam sem atualização do banco.
- `supabase/seed_demo.sql` contém produtos fictícios para demonstração e só executa se as tabelas de produtos, saldos e localizações estiverem vazias.
- O sistema mantém uma alternativa de demonstração local se o banco estiver vazio ou indisponível. No banco atual os exemplos fictícios já foram carregados.
- A aplicação ainda não grava itens testados, defeituosos ou dados específicos de garantia; esses fluxos dependem de decisões operacionais pendentes.
- O projeto tem Git local, mas não há remoto do GitHub configurado; a publicação continua pendente.
- A compilação de produção passou depois da autenticação e da camada inicial de leitura/gravação.
