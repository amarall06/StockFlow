# Continuação em ordem — 2, 4 e 7 — 02/11/2026

## Entrega

2: o gráfico operacional do Painel começa na consulta do estoque, não nos exemplos. Soma caixas normais de molas e amortecedores; capacidades locais já preenchidas são recuperadas. Campo sem capacidade permanece sem percentual. A apresentação conserva Norte/Sul/Leste/Oeste e sua configuração independente.

4: Minha conta → Gestão da equipe, somente para Administrador. Lista contas existentes, nome, identificador, função e situação; filtro por função e total de testadores ativos. Permite editar nome, função e ativação de outra conta com declaração de identidade/autorização. A própria função/ativação não pode ser alterada aqui, preservando um Administrador ativo. Não cria credenciais, não envia convites e não troca senhas. A criação de contas continua no serviço de contas/fluxo de acesso existente.

Toda escrita passa pela RPC save_team_access, com autorização consultada no banco, versão esperada e UUID de confirmação. Conflitos mantêm preenchimento; resposta perdida pode ser recuperada repetindo o mesmo preenchimento. Alterar campos exige nova confirmação. Auditoria privada registra autor, alvo, antes/depois, data e identidade da tentativa. Repetir confirmação antiga não restaura um acesso já modificado depois. O bloqueio de envio é imediato. Lista protegida anterior é retirada na atualização/falha de leitura. Suspender acesso não apaga histórico nem equivale a revogar todo token já emitido; novas operações protegidas verificam perfil ativo.

7: permissões diretas de escrita na tabela profiles foram retiradas dos clientes; leitura segue RLS. A mudança de nome próprio continua funcionando pela função autenticada existente. Sua implementação privilegiada foi movida para private e a função pública passou a SECURITY INVOKER, com permissões explícitas. Isso reduz uma exposição indicada pelo auditor, sem declarar a auditoria inteira concluída.

## Código

- src/components/ShelfCapacity.tsx: modo inicial condicionado ao uso operacional/apresentação.
- src/components/TeamAccess.tsx/CSS: consulta, filtro, edição, confirmação e mensagens; integrado em ProfileSettings.tsx.
- src/lib/team-access-api.ts: consulta paginada/validada e chamada autenticada com versão/UUID.
- supabase/migrations/20261102180917_team_access_management.sql: versão automática do perfil, gravação serializada e auditoria privada.
- supabase/migrations/20261102181255_isolate_profile_name_function.sql: isolamento da função de nome.

## Verificação nova

- tests/browser/capacity-stock-entry.spec.ts: três casos novos aprovados (entrada operacional, reabertura com capacidade, apresentação independente).
- tests/browser/team-access.spec.ts: sete casos novos aprovados; depois somente o oitavo caso adicional (dados incompletos e reconfirmação) foi executado/aprovado. Cobre atribuição de Testador, confirmação perdida, conflito, perda de permissão, Consulta sem gestão e teclado/375px/axe A/AA nos dois temas. API simulada; não é piloto com funcionários.
- tests/database/team-access-live.sql: novos casos reais de gestão, versões/UUID, proteção própria, suspensão, escrita direta, auditoria privada, compatibilidade da edição de nome, inativo/Consulta/anônimo; ROLLBACK integral.
- tests/database/profile-name-isolation-live.sql: novos casos reais da fronteira pública/privada e controle de versão; ROLLBACK integral.

Build/análise direcionada aprovados. Dois arquivos antigos de capacidade foram apenas adaptados para selecionar explicitamente a apresentação nos casos que a verificam; não executados. Nenhum teste concluído repetido.

## O que riscar

Pode riscar o ajuste de entrada operacional da 2; gestão de identificação/função/ativação das contas existentes da 4; e esse recorte de proteção de perfis da 7. A anotação 4 ainda exige contas individuais dos funcionários e validação real de autoria/permissões. Não foram criados usuários nem alterados acessos de pessoas durante a entrega; testes reais foram revertidos.

3 continua dependente da disposição física. 5 já entregue. 6 depende da regra/destino real. 7 ainda exige revisão das demais funções, armazenamento/recuperação e proteção de senhas vazadas. 8 permanece para a transição final aprovada. Próximas pendências físicas/regras são mantidas como tais, sem considerar exemplos como validação real.

Publicação confirmada: código fd761540b609367c88c4a370cb0f346f5a914aa1, Vercel success em https://vercel.com/amarall06s-projects/liber-automotive/8okCBFCGxcG7BmTBdnpPbiQ48B5w . Domínio HTTP 200 e quinze recursos públicos iguais ao build aprovado. Nenhum teste funcional repetido para publicar.

Auditoria depois das migrações: aviso de funções SECURITY DEFINER expostas caiu de 18 para 17; demais funções ainda precisam de revisão individual. [Referência do aviso](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). A auditoria privada sem políticas/permissões de cliente é intencionalmente fechada. Proteção de senhas vazadas permanece pendente: [configuração do serviço](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Conferência final: duas contas originais, Administrador e Consulta ativos, versão 1; nenhum registro permanente de teste em team_access_requests; 95 produtos, 113 movimentos e hash de saldos dfa96a2fa33dcc97c385e1cd5094fd58 preservados.

## Proteção contra senhas vazadas

O auditor do projeto confirmou que a proteção está desativada. O Supabase disponibiliza o bloqueio nativo no plano Pro ou superior. O LIBER não implementa cadastro ou troca de senha no front-end. A proteção deve ser configurada no serviço de autenticação para alcançar os fluxos que definem senhas. [Documentação do Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Quando houver um ambiente com o recurso disponível, ativar a proteção em Auth e conferir se o alerta desaparece. Validar com uma conta descartável que uma senha sintética conhecida pelo verificador seja recusada e que uma senha forte, aleatória e inédita seja aceita. Não usar senhas de funcionários no ensaio. A ativação e o teste de rejeição permanecem pendentes.
