> **Estado mais recente — Supabase conectado:** a migração
> `202610270001_idempotent_transfers.sql` já foi aplicada ao projeto
> `tfatagbhmkeelbvstcvb`, confirmado como o banco do site publicado.
> **Não repetir esta migração.** API 15; ensaio autenticado com ROLLBACK aprovado;
> 53 caixas, 26 movimentações e zero pedidos de teste retidos.
> O frontend ainda não foi enviado ao GitHub nem publicado. A Vercel identifica
> o projeto, mas recusa listagem de publicações e logs com HTTP 403.
> Os bloqueios de conexão citados abaixo são históricos quando contrariam esta nota.

# Retomada da revisão — 27/10/2026

O usuário pediu para pausar e deixar tudo salvo; continuará ao chegar em casa.

## Onde está o trabalho

- Repositório local: `/workspace/StockFlow`.
- Branch: `fix/site-review-2026-10-27`.
- Correções de autenticação/contraste e testes: commit `b1da8c7`.
- Transferências recuperáveis e paginação: commit `0c8966a`.
- Este ponto de retomada está em um commit posterior, na mesma branch.
- Cópia do código: `/workspace/StockFlow-revisado.zip`.
- Patch acumulado: `/workspace/StockFlow-correcoes.patch`.
- Relatório técnico: `docs/revisao-2026-10-27.md`.

## Estado verificado

Build, 12 scripts de regressão, laboratório HTTP e quatro testes de navegador passaram.
Os testes de navegador incluem login inválido, tema, contraste no login claro, navegação
em larguras de celular/computador, CSV, foto e recuperação de transferência após resposta
perdida e recarga, reutilizando o mesmo UUID/conteúdo.

As 18 migrações foram executadas em PostgreSQL 17 descartável com substitutos mínimos de
Auth/Storage. Testes de transferências cobrem repetição, cargos, inatividade, saldo,
permissões e concorrência. Reenvios simultâneos produziram um movimento e conservaram
20 caixas fictícias. O container manual `stockflow-review-db` foi removido; o runner
`npm run test:database` cria e remove seu próprio container.

Lint sem erros, com três avisos anteriores de set-state-in-effect. Esses ensaios não
comprovam o funcionamento do Supabase hospedado ou do site publicado com contas reais.

## O que falta, na ordem

1. Conectar GitHub no ChatGPT e liberar `amarall06/StockFlow`. O usuário já autorizou
   salvar no GitHub. A conexão não apareceu no celular; tentará ao chegar em casa.
   Não pedir novamente autorização para enviar as correções. A credencial do GitHub CLI
   foi recusada com `Invalid username or token`; não insistir nela sem mudança de acesso.
2. Conferir a branch remota e enviar esta branch, preservando mudanças novas do usuário.
   Criar PR para revisão se a integração permitir. Não afirmar envio sem confirmação.
3. Conseguir ambiente Supabase de homologação e conta de teste; não solicitar senha pessoal
   nem chave administrativa no chat. Nenhuma credencial desse serviço está configurada aqui.
4. Validar e aplicar `supabase/migrations/202610270001_idempotent_transfers.sql` no ambiente
   apropriado antes de publicar o novo frontend. A nova interface BLOQUEIA transferências
   se a API do banco ainda for menor que 15. Não publicar o frontend antes de alinhar o banco.
   Não repetir as migrações antigas já aplicadas no banco real.
5. Testar autenticação, RLS, persistência e operações com contas reais de teste. A revisão
   completa de todos os módulos/temas e Safari/iPhone físico ainda não foi feita.
6. Confirmar publicação e fazer teste de fumaça. O site online e o banco hospedado NÃO
   foram alterados nesta conversa. Não declarar o projeto inteiramente pronto para produção.

## Comandos

- `npm ci`
- `npm test`
- `npm run lint`
- `npx playwright install chromium`
- `npm run test:browser` (usa porta exclusiva 4175 e Supabase simulado)
- `npm run test:database` (Docker local, PostgreSQL descartável)

Neste ambiente os navegadores foram instalados em `/tmp/stockflow-browsers`; para
reutilizá-los: `PLAYWRIGHT_BROWSERS_PATH=/tmp/stockflow-browsers npm run test:browser`.
Se a pasta não existir, reinstalar. Não depende de credenciais de produção.

## Continuação autorizada

O usuário autorizou executar os passos em sequência com poucas perguntas. Foram
rechecados os acessos: GitHub ainda não autenticado; Supabase e Vercel encontrados
no catálogo, disponíveis, mas não conectados. Suas conexões foram solicitadas.
A branch main remota segue em `dcc621a57bb06d7951254ef9bbcc2bff91d845a1`.

Adicionado `.github/workflows/verify.yml` para executar os comandos já validados em
push/PR: build/regressões, lint, navegador e PostgreSQL descartável. Usa dados simulados,
sem segredos de produção, e não publica o site nem aplica migrações hospedadas.
O workflow ainda não foi executado no GitHub, pois o envio depende da conexão.

Não é necessário repetir os testes locais anteriores sem mudanças funcionais.
Próxima ação útil: concluir conexões e seguir a ordem banco → frontend → teste publicado.
