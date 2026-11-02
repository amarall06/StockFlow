> **17 — revisão dos exemplos, 02/11/2026:** Administrador pode aprovar ou solicitar recontagem com justificativa, autoria/data, referência congelada e confirmação recuperável. Decisões imutáveis separadas dos envios, sem ajuste de saldo. NORTE solicita recontagem; SUL aprovada na apresentação; OESTE aguardando revisão. Dez testes novos de navegador e novos casos de modelo/banco/REST/concorrência aprovados; nenhum caso concluído repetido. Guia `revisao-contagens-apresentacao-2026-11-02.md`. Banco aplicado; publicação do site em preparação. Operação real, regras de aprovação/ajuste, movimentos durante contagem e piloto continuam pendentes.
# Anotação 17 — contagens compartilhadas da apresentação — 02/11/2026

## Entrega e acesso

Painel → Visualização do Painel → Apresentação → Conferência de prateleiras.

Administrador/Estoquista preparam a contagem de Norte/Sul/Leste/Oeste com o editor local existente, conferem os valores e enviam uma cópia completa ao Supabase. Perfis ativos podem consultar o histórico. Não há aprovação nem ajuste de estoque neste fluxo. O escopo usa apenas o cenário versionado da apresentação; não habilita envio das contagens operacionais reais.

Três exemplos publicados no banco: NORTE com 19 caixas aguardando teste e 20 liberadas, contra referência 20/20 (falta 1); SUL com 13 caixas de mola, contra 12 (sobra 1); OESTE sem caixas na referência e na contagem. Todos aguardam revisão. Responsável é a conta administrativa que executou o carregamento autorizado, não uma pessoa fictícia criada no serviço de contas. As quantidades de exemplo não comprovam conferência física.

## Código e finalidade

- `src/components/PresentationShelfCounts.tsx` e CSS: integra o editor existente, confirmação explícita, bloqueio de edição/envio enquanto aguarda resposta e histórico com responsável/data, itens e divergências. Mostra até 50 envios mais recentes; consulta no foco/reconexão, a cada 10s e por invalidação privada, sem alterar o rascunho aberto. Falhas mantêm os dados consultados, mostram aviso e bloqueiam envio até recuperar a consulta.
- `src/components/ShelfCount.tsx`: texto opcional para o uso compartilhado na apresentação; o comportamento operacional/local anterior é preservado.
- `src/components/StockPresentation.tsx`: inclui o módulo somente no Painel autenticado; a rota pública legada não consulta registros protegidos. A referência deve ser carregada do servidor antes de enviar.
- `src/lib/presentation-counts.ts`: prepara uma cópia congelada, verifica completude/identidade/referência e valida a confirmação/histórico. Ordem das propriedades JSON não muda a identidade dos valores.
- `src/lib/presentation-counts-api.ts`: consulta autenticada e RPC com limite de espera, tratamento de conflito/recusa e confirmação vinculada ao conteúdo enviado.
- `supabase/migrations/20261102201559_presentation_shelf_counts.sql`: tabela imutável de envios, RLS/grants mínimos, RPC pública invocadora/implementação privada, validação da referência e papel ativo, autor obtido da sessão, nome do responsável congelado e horário do servidor. Gatilho emite somente o sinal privado existente.
- `supabase/seeds/presentation-shelf-counts.sql` e fixture `tests/fixtures/presentation-counts.json`: três exemplos recuperáveis, sem sobrescrever envios existentes.

## Confirmação e limites

O UUID do rascunho e a conta identificam um envio imutável. Duas solicitações simultâneas ou uma confirmação perdida retornam o mesmo registro. O servidor serializa por conta/rascunho e mantém unicidade; não aceita reenviar o mesmo identificador com outros valores. Recontagem exige iniciar outra contagem. Confirmar campos e depois editá-los desmarca a confirmação. O rascunho local nunca é apagado automaticamente.

Não há envio automático offline: rascunho permanece local e envio exige conexão. Recuperação usa os mesmos valores/identidade; mesmo fora dos 50 registros exibidos, repetir a tentativa ainda recupera a confirmação no servidor. Não existe vínculo deste histórico aguardando revisão com mapa de divergências aprovadas ou ajustes de saldo.

## Somente testes novos

1. `scripts/check-presentation-counts.mjs`: novos casos de serialização, cópia independente, completude, referência do cenário, identidade, retorno/estado e prateleira vazia aprovados. Um caso complementar de ordem de propriedades foi executado isoladamente; os anteriores não foram repetidos.
2. `tests/database/presentation-counts-live.sql`: novos casos reais de envio/autoria/estado, repetição, conteúdo divergente, branco/fração/referência manipulada/itens ausentes ou repetidos/local inválido, escrita direta negada, sinal privado, Consulta/sem perfil/Estoquista/inativo/anônimo. ROLLBACK integral, inclusive mudanças temporárias de função/ativação.
3. Duas conexões reais simultâneas enviaram o primeiro exemplo NORTE: ambas receberam o mesmo ID, com uma única cópia. Esse registro faz parte dos três exemplos autorizados; os demais foram carregados pelo seed idempotente.
4. `scripts/check-presentation-counts-rest.mjs`: API real negou leitura e envio sem sessão, HTTP 401 em ambos.
5. `tests/browser/presentation-counts.spec.ts`: oito casos novos aprovados em 27,6s, incluindo duas sessões isoladas, preservação do rascunho, recuperação após resposta perdida/reabertura, branco/confirmação, prateleira vazia, Consulta, falha/dado inválido, bloqueio de duplo envio e teclado/375px/axe A/AA nos dois temas. Transporte/API simulados no navegador. A primeira execução não aprovou casos porque um seletor de teste procurava texto exato dentro do select; corrigido para o papel/nome acessível. Só casos novos falhos/interrompidos/pendentes foram executados em seguida.

Build e análise direcionada aprovados. Nenhum teste anteriormente concluído foi repetido. Auditoria Supabase não acrescentou aviso de segurança; avisos anteriores da 7 continuam separados. [Referência sobre permissões de funções](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Dados preservados: 95 produtos, 113 movimentos, hash de saldos dfa96a2fa33dcc97c385e1cd5094fd58, planta versão 3 e duas contas originais ativas com funções/versão originais. Apenas os três envios da apresentação permaneceram.

## Pode riscar e o que falta

Pode riscar **implementação, testes e publicação do envio, recuperação de confirmação e consulta compartilhada de contagens do cenário de apresentação da 17**. Banco aplicado e três exemplos carregados.

Não riscar a anotação 17 inteira. Faltam fluxo operacional real, definição/implementação de revisão e aprovação autorizadas, quem pode aprovar/ajustar, tratamento transacional e coordenação física de movimentos durante a contagem, histórico de decisões e ajustes vinculados, integração com divergências aprovadas/mapa (20) e piloto físico com a equipe. Nenhuma regra real foi presumida para encerrar essas pendências.

## Publicação confirmada

Código 07db4cc42ed0217150eb1f4ee7f1b58b40c6dade publicado no site original: https://liber-automotive.vercel.app/ . Vercel success: https://vercel.com/amarall06s-projects/liber-automotive/457EDKGLjPS8pAjn9nWhicGgWUY6 . Domínio HTTP 200 e dezesseis recursos públicos iguais ao build aprovado, incluindo módulo/editor de contagem e apresentação. Nenhum teste funcional repetido para publicar.
