# Anotação 18 — cenário-base publicado no Supabase

02/11/2026. O usuário autorizou explicitamente publicação dos dados no Supabase. O conector voltou a funcionar; o projeto conferido com a configuração do site é tfatagbhmkeelbvstcvb (amaral Project).

## Entrega

O cenário-base da apresentação foi publicado em public.presentation_scenarios, chave liber-presentation-v1, revisão 1. Não é uma importação em products/stock_balances nem uma reprodução de rascunhos do navegador.

Conteúdo: quatro prateleiras, capacidades, planta/grade e condições de espaço/contagem; quatro linhas de saldo que representam 85 caixas; três pedidos; quatro grupos aguardando teste; oito registros de conferência de exemplo; dez grupos de entrada/permanência; três retornos dos Correios. Os exemplos são os mesmos das etapas já entregues, publicados agora no servidor, sem recriá-los como operações reais.

No site autenticado: Painel → Visualização do Painel → Apresentação → Cenário da apresentação. O site consulta o Supabase, informa a origem e a data de publicação e permite reconsultar. Os componentes recebem a mesma versão validada do cenário. A referência v1 é imutável/compatível com o código; alterações de conteúdo/formato precisam de uma nova versão planejada. A validação independe da ordem de chaves do JSONB.

Sem conexão, tabela ausente ou versão incompatível: mostra explicitamente a cópia local, nunca sucesso falso de leitura do servidor. Consulta tem limite de espera e cancelamento ao sair/mudar de contexto. A rota pública anterior demonstracao.html continua local e não tenta ler a tabela protegida.

Edições de capacidade/planta, progresso/cancelamento de missões, limites dos detectores e conferências de retornos continuam locais por conta/navegador, preservados na recarga da referência. Eles não foram copiados do computador para o servidor nem se tornaram operações globais.

## Banco, segurança e preservação

Migração criada pela CLI oficial 3.0.0 e aplicada pelo conector; arquivo alinhado ao identificador retornado pelo servidor: supabase/migrations/20261102141340_presentation_scenarios.sql. Semente reproduzível: supabase/seeds/presentation-scenario-v1.sql. INSERT com conflito sem sobrescrita e conferência de equivalência JSONB; reexecução nova de verificação manteve uma única linha.

RLS habilitada; somente SELECT para authenticated com perfil ativo/autorizado, conforme helper existente da empresa. Sem leitura anon e sem INSERT/UPDATE/DELETE do navegador. A referência é compartilhada entre os membros ativos da mesma empresa, não um registro particular de uma pessoa. Nenhum novo SECURITY DEFINER, chave privada no cliente ou endpoint de gravação. Regras baseadas em perfil, não user_metadata.

Antes/depois: 95 produtos, 113 movimentos normais e hash dos saldos dfa96a2fa33dcc97c385e1cd5094fd58. Todos preservados. Auditoria Supabase não apontou a tabela nova; avisos anteriores de funções/permissões e senhas vazadas continuam no escopo da 7, sem alegar auditoria total concluída. Referências: https://supabase.com/docs/guides/database/postgres/row-level-security e https://supabase.com/docs/guides/database/database-linter . Changelog oficial conferido, incluindo aviso de TLS para novembro, sem impacto nas mudanças realizadas.

## Código

- src/lib/presentation-bundle.ts: reúne dados-base existentes e valida a versão publicada, sem confundir JSONB ordenado com alteração de conteúdo.
- src/lib/presentation-cloud.ts: consulta autenticada de uma única referência, com cancelamento.
- StockPresentation.tsx: origem/estado da consulta, nova tentativa e distribuição do cenário aos componentes existentes. Estado de carregamento derivado, proteção contra resposta antiga e limpeza no unmount.
- ShelfCapacity/FictionalShelfMap e demais painéis recebem referências como parâmetros, preservando os armazenamentos locais.
- scripts/presentation-fixture.mjs: gera semente e fixture a partir dos módulos existentes; sem credenciais. Não cria nem publica rascunhos pessoais.

## Exclusivamente verificações novas

- scripts/check-presentation-cloud.mjs: compatibilidade, independência de ordem das chaves, cópia isolada, totais e rejeição de versões/dados incompatíveis. Aprovado.
- tests/database/presentation-scenario-live.sql: no Supabase real, leitura com contexto de conta ativa, recusa de INSERT/UPDATE/DELETE, conta sem perfil ativo sem linhas e anon sem acesso. Transação com ROLLBACK, sem novos usuários ou alterações de dados operacionais. Aprovado.
- scripts/check-presentation-rest.mjs: API real sem sessão respondeu HTTP 401. Aprovado. Não registra a chave publicável.
- tests/browser/presentation-cloud.spec.ts: oito casos novos aprovados em 18,1 s — cenário consultado/coleções; versão incompatível e recuperação; falha de API e recuperação; capacidade/planta local preservadas; rota pública sem consulta; Consulta lendo sem gravação; teclado/375 px/axe A/AA claro e escuro. API simulada no navegador; não equivale a login real da equipe.

Build e análise aprovados. Nenhum teste anterior executado; publicação usará skip ci. Revisão de componentes conforme react-best-practices e implantação conforme deployments-cicd.

## Pode riscar e falta

Pode riscar a persistência/publicação e leitura autenticada do cenário-base da 18 no Supabase. Avança a referência compartilhada das 2/18/21 e arquiva os exemplos das 6/19/22/23. Não encerra essas anotações.

Ainda faltam edição compartilhada de mapa/capacidade, concorrência e autorização transacional para operações, sincronização de missões/conferências/decisões de retorno, política operacional e dados físicos reais, identidade/QR, ativação da emissão instantânea da 16 e piloto com contas/aparelhos reais. O acesso ao Supabase agora está disponível; não tratar indisponibilidade anterior como bloqueio atual.

## Publicação do site confirmada

Código `2150fbca6b8f8010a722525cdfc7a952472f976b`, https://liber-automotive.vercel.app/ . Vercel success: https://vercel.com/amarall06s-projects/liber-automotive/6b5AtkQhhAvKbXMXjyV4a75trCum . Domínio HTTP 200 com entrada atual; treze recursos públicos iguais ao build aprovado, conferidos por hash. Nenhum teste funcional repetido na publicação. Migração/dados já aplicados no Supabase do projeto; não são apenas arquivos preparados. Pode riscar publicação no banco e no site desse cenário-base. Os registros locais e as demais pendências descritas acima continuam com seu alcance original.
