# Anotações 2 e 18 — planta e capacidades compartilhadas

02/11/2026. Pedido: sincronizar planta/capacidades entre aparelhos no Supabase com dados de exemplo, testes exclusivamente novos e publicação.

## Uso

Painel → Visualização do Painel → Apresentação → Planta e capacidades entre aparelhos.

Padrão: Compartilhada no Supabase. Administrador abre Editar configuração compartilhada, escolhe NORTE/SUL/LESTE/OESTE, informa coluna/linha/largura/altura e capacidade/referência da caixa, depois salva no Supabase. Todos os perfis ativos consultam. Consulta e Estoquista não gravam essa configuração. Campo de capacidade vazio remove a referência, sem inventar valor.

Planta e capacidade são confirmadas juntas numa versão. A consulta acontece a cada 10 segundos com a tela visível, ao voltar à janela e ao reconectar; há botão de atualização manual. Isso é consulta periódica, não ativação do servidor Realtime da 16. Capacidades alimentam gráfico, detalhes e sugestões existentes; posições alimentam a planta, mantendo a seleção/busca durante atualizações.

Cópias locais anteriores preservadas: escolha Configurações deste navegador para consultá-las/editar pelo fluxo local já existente. Elas não são importadas automaticamente no servidor. A rota pública anterior continua local. Nenhum saldo é transferido/ajustado e nenhuma condição física real é presumida.

## Conflitos e confirmações

A edição congela a versão de origem. Se outro aparelho salvar antes, a gravação antiga é recusada, com preenchimento preservado; feche e reabra para editar a versão atual. O recebimento de uma versão nova pela consulta não altera os campos em edição.

Uma identidade UUID acompanha a tentativa. Se a confirmação se perder, repetir o mesmo preenchimento recupera o resultado sem gravar novamente. O servidor confere pessoa, versão e conteúdo; reutilizar a identidade com outro conteúdo é recusado. Confirmar uma tentativa antiga não restaura sua versão sobre uma posterior. As respostas do cliente também respeitam versões crescentes.

Falha de leitura conserva a última versão consultada e bloqueia novas edições até recuperar conexão. Na primeira leitura indisponível, a referência de apresentação fica visível como referência, sem fingir que foi sincronizada. Falha de gravação preserva os campos. Não há fila de escrita offline; ao fechar a página, a edição não confirmada em memória não é guardada como rascunho. Reabrir consulta o estado efetivo do servidor.

## Banco e código

Migração oficial criada pela CLI e alinhada à história aplicada: supabase/migrations/20261102142957_shared_presentation_layout.sql.

- public.presentation_layouts: versão atual, planta/capacidades, pessoa e data da última gravação, leitura RLS apenas para perfis ativos da empresa. Sem escrita direta pelo navegador.
- private.presentation_layout_requests: registros privados das confirmações. Sem acesso de clientes, RLS habilitada e sem políticas de liberação (negação padrão intencional).
- private.save_presentation_layout: função privilegiada com search_path vazio, Administrador ativo obrigatório, validação de grade/sobreposição/capacidades, bloqueio de linha, versão e idempotência. Acesso pela função pública de encaminhamento SECURITY INVOKER. Sem privilégios de anon ou uso de user_metadata.
- src/lib/shared-layout.ts: validação do formato e proteção contra resposta antiga.
- src/lib/shared-layout-api.ts: leitura e gravação com UUID e limite de espera.
- SharedShelfLayout.tsx/CSS: editor, seleção compartilhada/local, consulta periódica com limpeza, bloqueio imediato de envio e mensagens.
- ShelfCapacity/FictionalShelfMap: exibem configuração compartilhada validada sem sobrescrever armazenamentos locais. StockPresentation integra ao site.

## Somente evidências novas

1. scripts/check-shared-layout.mjs: validação de posição/capacidade/versão/identidade, cópia independente e recusa de resposta antiga. Aprovado.
2. tests/database/shared-layout-live.sql: SQL real com contexto autenticado, gravação, repetição, recuperação após nova versão, conflito, identidade reaproveitada, posição/capacidade inválida, escrita direta e acesso privado bloqueados, Consulta sem gravação, conta sem perfil e anon bloqueados. Transação revertida por ROLLBACK; nenhum usuário criado.
3. Ensaio real em duas conexões simultâneas, ambas na versão 1: só uma confirmou; a outra recebeu 40001. Valores de exemplo restaurados via versão 2 e confirmação própria; versão final 3 com planta/capacidades iniciais. Dois registros de confirmação desse ensaio/restauração permanecem no histórico privado. A restauração usou versão esperada e não poderia sobrescrever uma gravação intermediária de outro operador.
4. scripts/check-shared-layout-rest.mjs: API real negou leitura e RPC sem sessão (HTTP 401 em ambos). Aprovado.
5. tests/browser/shared-layout.spec.ts: nove casos novos aprovados em 23 s, com dois navegadores isolados, atualização no foco, versão congelada/conflito, resposta perdida, cópias locais e falha de leitura, dado inválido, Consulta, intervalo de dez segundos/limpeza e teclado/375 px/axe claro/escuro. API simulada no navegador; não são aparelhos físicos reais.
6. Revisão final identificou chave repetida entre painéis; prefixo exclusivo corrigido. Um décimo caso novo, executado sozinho em seguida (6,5 s incluindo inicialização), verificou identidade única ao alternar os modos. Os nove anteriores não foram repetidos.

Build e análise aprovados. Dois arquivos de testes anteriores foram apenas adaptados para selecionar explicitamente o modo local quando verificam cópias locais; não executados. Nenhuma suíte/caso antigo repetido. Publicação com skip ci.

Auditoria Supabase: nenhum novo aviso de segurança para a tabela exposta/funções. O registro privado é identificado como RLS sem política de liberação, compatível com negação padrão e ausência de permissões para clientes. Referência: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy . Avisos anteriores da 7 continuam separados.

Estoque operacional preservado: 95 produtos, 113 movimentos e hash de saldos dfa96a2fa33dcc97c385e1cd5094fd58 antes/depois. O cenário-base imutável da etapa anterior continua separado da configuração mutável.

## Pode riscar e falta

Pode riscar sincronização da planta e capacidades do cenário de apresentação das 2/18, com versão, permissões e recuperação de confirmação. Avança a utilização das capacidades compartilhadas da 21. Não encerra as anotações por inteiro.

Faltam posições/códigos/capacidades/restrições físicos reais, vínculo transacional com operações e conferências aprovadas, edição de configurações reais fora da apresentação e piloto em aparelhos/equipe. Missões e demais conferências continuam locais. A emissão instantânea do servidor da 16 permanece pendente.

## Publicação confirmada

Código `efe0a4b0933e7faeec424099b0d539894d6c020d` publicado em https://liber-automotive.vercel.app/ . Vercel success: https://vercel.com/amarall06s-projects/liber-automotive/5mqKhdb835HQqawVrVSR7vYizHLe . Domínio HTTP 200 e treze recursos públicos iguais ao build aprovado, conferidos por hash. Migração e configuração já aplicadas no Supabase. Nenhum teste funcional repetido na publicação. Pode riscar implementação/testes/publicação da sincronização da planta/capacidades do cenário das 2/18. Restante e limites descritos acima.
