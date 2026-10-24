# Preparar o projeto Supabase do LIBER automotive

O projeto local ainda não está conectado a um banco. Siga estes passos quando puder criar a conta/projeto. Use somente dados fictícios durante a aprendizagem.

## 1. Criar o projeto

1. Acesse o [painel oficial do Supabase](https://supabase.com/dashboard) e entre ou crie sua conta.
2. Crie uma organização/projeto chamado LIBER automotive.
3. Escolha a região mais próxima disponível e guarde a senha do banco em um gerenciador de senhas. Não envie essa senha no chat.
4. Aguarde o provisionamento do projeto.

Cada projeto Supabase inclui banco PostgreSQL, autenticação e armazenamento; esses serviços ainda precisam ser configurados para esta aplicação.

## 2. Copiar somente os valores para o navegador

1. No painel do projeto, abra **Connect** e copie o **Project URL** e a **Publishable key** atual, que começa com sb_publishable_.
2. Na pasta do projeto, copie .env.example para .env.local.
3. Preencha .env.local assim:

   - VITE_SUPABASE_URL: o Project URL.
   - VITE_SUPABASE_PUBLISHABLE_KEY: a Publishable key.

O .gitignore já ignora arquivos *.local, então .env.local não deve entrar no GitHub. Não use a chave Secret (sb_secret_) no navegador, no código ou no GitHub: ela é exclusiva de servidores e pode ignorar as regras de acesso ao banco. A Publishable key só deve ser usada com RLS e políticas de menor privilégio.

## 3. Acesso dos usuários antes de conectar

Você escolheu definir as funções antes de liberar acesso. A migração SQL mantém RLS ativado e ainda não cria políticas; isso bloqueia o acesso pela API até definirmos quem pode consultar, receber, testar, transferir ou administrar.

Depois da criação do projeto, os próximos passos serão definir essa matriz de acesso, instalar o cliente oficial do Supabase, preencher .env.local, revisar e aplicar a migração somente ao banco fictício. Não envie senha do banco nem chave Secret.

## Estado do trabalho

- O arquivo .env.example mostra os nomes das variáveis, sem conter valores secretos.
- A conexão com o Supabase ainda não existe; não há URL nem Publishable key configuradas.
- O cliente npm não foi instalado porque o ambiente de execução bloqueou a conexão ao registro de pacotes. Podemos tentar novamente quando a configuração do projeto for necessária.
- O projeto ainda não tem repositório Git local ou GitHub conectado.
