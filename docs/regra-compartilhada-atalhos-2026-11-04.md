# Regra de recorrência compartilhada e ícones — conclusão em 04/11/2026

## Entrega da anotação 22

Painel → Atalhos → Visualização do Painel → Apresentação → Contagens compartilhadas → Recorrência das conferências compartilhadas.

A configuração agora pode ser lida entre aparelhos por perfis ativos e editada por Administrador. A regra compartilhada começa com o mesmo padrão anterior da apresentação: três ocorrências em trinta dias. Configurações anteriores do navegador permanecem acessíveis pela seleção Origem da regra de recorrência; nenhuma cópia local é importada automaticamente. Não estabelece a política real da empresa nem altera estoque.

A leitura reage aos avisos privados existentes, a cada trinta segundos, ao retomar e reconectar. Durante edição, os campos e a versão de origem ficam preservados. Falha de consulta mantém a última regra e bloqueia novas edições. Sem leitura inicial válida, nenhuma regra local é usada como substituta silenciosa.

Versão esperada e identidade UUID evitam sobrescrita e duplicação. Confirmação perdida pode ser recuperada pela mesma tentativa. Uma confirmação antiga não restaura os valores sobre uma regra posterior: o cliente consulta a versão atual após recuperar a confirmação. Conflito conserva o preenchimento para revisão explícita.

## Código e banco

- `src/lib/shared-recurrence-api.ts`: validação, leitura, prazo de consulta e gravação recuperável.
- `src/components/SharedRecurrence.tsx`: escolha da origem, atualização, editor e tratamento de conflito/falha.
- `src/components/RecurringDivergences.tsx` e `PresentationShelfCounts.tsx`: reutilizam o detector e as contagens aprovadas existentes.
- Migração `supabase/migrations/20261103010029_shared_recurrence_rule.sql`, gerada pela ferramenta oficial e aplicada no preparo de 02/11: tabela da apresentação com RLS, leitura por perfis ativos, gravação por função autenticada de Administrador, versão serializada, confirmação privada e aviso de mudança. A função pública é SECURITY INVOKER e encaminha à implementação privada protegida.

O teste novo de banco `tests/database/shared-recurrence-live.sql` foi aprovado em 02/11 e revertido integralmente: gravação, replay, confirmação antiga, conflito, limites inválidos, bloqueio de escrita direta, auditoria privada, Consulta, perfil sem autorização e anônimo. Conferência após ROLLBACK: regra versão 1, 3/30; nenhuma confirmação de teste, 95 produtos e 126 movimentos. Esse teste já aprovado não foi repetido na retomada de 04/11. O conector SQL não estava disponível na retomada; a conclusão do navegador e a publicação foram conferidas pelos recursos disponíveis.

Auditoria do preparo: sem alerta de exposição para a nova tabela pública. A tabela privada de confirmações permanece sem políticas de cliente e com privilégios revogados: negação intencional, indicada apenas como informação pelo [auditor de RLS](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). A [proteção de senhas vazadas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) e as demais revisões anteriores da anotação 7 continuam pendentes. Não houve alteração dessas configurações nesta entrega.

## Ícones solicitados

Atalhos do Painel, Produtos e Garantia receberam ícones vetoriais ao lado dos textos, usando o traço e tamanho do menu existente. SVGs decorativos ficam ocultos para leitores de tela; nomes acessíveis, alvos de toque e destinos permanecem. `Interface.tsx`, `NavigationIcon.tsx` e estilos compartilhados fornecem a opção reutilizável, sem biblioteca nova.

## Evidências novas

Dez casos novos de navegador aprovados: oito em `tests/browser/shared-recurrence-rule.spec.ts` e dois em `shortcut-icons.spec.ts`. Cobrem duas sessões compartilhando a regra; cópia anterior separada; recuperação sem duplicar; conflito com campos preservados; indisponibilidade e recuperação; Consulta nos dois temas em celular; primeira leitura sem regra substituta; confirmação antiga seguida da versão atual; ícones, nomes acessíveis, teclado e destinos.

Na retomada de 04/11, foi executado somente o último caso novo ainda pendente, de confirmação antiga. A falha anterior ocorreu durante o carregamento inicial do ambiente de teste, antes desse cenário; a execução isolada passou. Os nove casos já aprovados e a suíte de banco não foram repetidos. Build final e análise direcionada aprovados. Configurações temporárias do servidor/teste foram removidas após encerrar o servidor.

Capturas em `docs/design/regra-compartilhada-*-mobile.png` e `atalhos-icones-*-mobile.png` usam dados controlados de teste. Não representam validação por aparelhos físicos da empresa.

## Pode riscar e conferir

Pode riscar **22 — configuração da regra de recorrência da apresentação entre aparelhos** e **ícones dos Atalhos**. Permanecem para depois as regras/datas/conferências reais, resolução operacional, retirada física incompleta e piloto da 22. As pendências que exigem dados reais continuam no fim da prioridade.

Para conferir: abra a apresentação pelo seletor dos Atalhos, consulte a regra compartilhada, edite como Administrador e use Atualizar regra compartilhada em outra sessão. O seletor Origem permite consultar a configuração anterior deste navegador. Nos Atalhos do Painel, Produtos e Garantia, confira os ícones junto aos nomes e os destinos dos botões.

## Publicação

Código `0b4e5280bcdc642cbed5a62fa80cb12fed8b6fb3`, Vercel success. Em 04/11, domínio https://liber-automotive.vercel.app/ com HTTP 200 e vinte e dois recursos públicos idênticos ao build aprovado, incluindo a apresentação, módulos de Atalhos, estilos, fonte e licença. Nenhum teste funcional repetido para conferir a publicação.
