# Anotação 17 — vínculo das recontagens — 02/11/2026

## Entrega e uso

Painel → Apresentação → Conferência de prateleiras → Histórico. Uma contagem com **Recontagem solicitada** oferece **Iniciar recontagem**, para Administrador/Estoquista. O novo rascunho tem identidade própria, mesma prateleira e campos de quantidade em branco; guarda a origem mesmo após reabrir a apresentação.

O rascunho atual não é substituído: se já existir uma contagem neste aparelho, é preciso continuá-la ou descartá-la explicitamente no editor. O envio exige preencher e confirmar novamente os valores. O servidor cria o envio e o vínculo na mesma transação, verificando a solicitação de revisão original. Confirmação perdida recupera o mesmo envio/vínculo.

Itens encontrados sem saldo na origem também aparecem na recontagem, com quantidade em branco. É necessário conferi-los explicitamente, inclusive informando zero quando não forem encontrados novamente. O servidor recusa sua omissão e mantém a quantidade anterior no registro original.

Cada solicitação admite uma recontagem enviada. Dois envios diferentes disputando a mesma origem não sobrescrevem um ao outro: o segundo é recusado e seu rascunho fica preservado. Uma nova solicitação de revisão sobre a filha permite a próxima recontagem da sequência. Não é possível criar ciclos ou trocar retroativamente a origem de um envio.

No histórico, **Ver recontagem** e **Ver contagem de origem** percorrem os registros em ambos os sentidos, abrem os detalhes e posicionam o foco de teclado. Se a origem estiver fora dos 50 envios recentes, ela é consultada pelo identificador sob RLS e adicionada à tela. Registros relacionados abertos permanecem disponíveis nesta sessão de consulta.

## Exemplo publicado no Supabase

NORTE original: 19 caixas aguardando teste e 20 liberadas, referência 20/20, com recontagem solicitada. A nova recontagem vinculada informa **20 e 20**, aguardando revisão própria. Os três envios anteriores e as duas decisões anteriores permanecem intactos. Total: quatro contagens e um vínculo. Nenhum saldo foi ajustado e a recontagem não foi aprovada automaticamente.

## Código e finalidade

- `src/lib/shelf-count.ts`: campo opcional de origem validado e preservado no rascunho. O módulo operacional não ganha envio nem aprovação real.
- `src/lib/presentation-counts.ts`: origem incluída na cópia de envio e na validação da confirmação/histórico; contagens anteriores sem origem continuam compatíveis.
- `src/lib/presentation-counts-api.ts`: mensagem específica de conflito de recontagem, com preservação do rascunho.
- `src/lib/presentation-recounts.ts`: inicia o rascunho a partir de uma solicitação válida, sem copiar quantidades contadas; valida e combina vínculos imutáveis, rejeitando referências contraditórias, ausência de origem e ciclos.
- `src/lib/presentation-recounts-api.ts`: consulta vínculos de origem/filha e registros relacionados fora da lista recente, sempre pela sessão e RLS.
- `src/components/PresentationShelfCounts.tsx`: início de recontagem, identificação da origem no envio, histórico navegável, foco, consulta complementar e atualização privada/periódica sem perder o rascunho.
- `supabase/migrations/20261102204729_presentation_recount_links.sql`: tabela imutável com FKs para origem, filha e solicitação; leitura apenas para perfis ativos. Atualiza a RPC de envio existente para validar e gravar o vínculo atomicamente. Bloqueios por identidade/origem, unicidade e validação de prateleira impedem duplicação, alteração da origem e vínculos inválidos. Grava responsável e data. Nenhuma função de ajuste de estoque é chamada.
- `supabase/migrations/20261102210002_recount_origin_items.sql`: garante a conferência de todos os itens da origem, inclusive os encontrados sem saldo, preservando a gravação atômica e as permissões da RPC.
- `supabase/seeds/presentation-recount.sql` e fixture `tests/fixtures/presentation-recount.json`: exemplo NORTE idempotente; resolve a contagem original pela identidade do roteiro, sem fixar IDs de usuários ou registros do banco.

## Somente testes novos

1. `scripts/check-presentation-recounts.mjs`: início em branco e identidade própria, recusa de substituir rascunho, origem com revisão válida, persistência local, cópia de envio, confirmação/vínculo imutável, deduplicação, falta de vínculo, autoria e sequência. Aprovado.
2. `tests/database/presentation-recounts-live.sql`: banco real, origem aprovada/sem decisão/inexistente/nula e prateleira diferente recusadas; falha de validação não deixa órfãos; gravação atômica/autoria/solicitação/recuperação, segundo envio para origem ocupada, identidade reusada, origem intacta e encadeamento de uma nova solicitação; escrita direta e acessos indevidos bloqueados. ROLLBACK integral.
3. `tests/database/presentation-recount-stockkeeper-live.sql`: uma solicitação do Administrador é atendida por Estoquista, registrando a autoria e o vínculo corretos. ROLLBACK integral, inclusive função/ativação temporárias da conta.
4. Duas conexões reais simultâneas enviaram o exemplo com a mesma identidade. Ambas receberam a mesma filha; um único envio e um vínculo permaneceram. O seed posterior recuperou o exemplo sem duplicação.
5. `scripts/check-presentation-recounts-rest.mjs`: API real recusou leitura de vínculos e envio de recontagem sem sessão, HTTP 401 em ambos.
6. `tests/browser/presentation-recounts.spec.ts`: nove casos novos aprovados em 27s na primeira execução. Duas sessões, campos em branco e origem persistente, ida/volta com foco, rascunho existente preservado, confirmação perdida/reabertura, conflito de outro aparelho, origem fora da lista recente, nova etapa da sequência, Consulta sem início/envio e teclado/375px/axe A/AA em claro/escuro. API/transporte simulados; não representa piloto físico.
7. Na conferência final foi acrescentado o caso de item encontrado sem saldo. `scripts/check-recount-origin-items.mjs` e `tests/database/recount-origin-items-live.sql` aprovados; o último com ROLLBACK. A primeira chamada desse teste SQL falhou por parênteses ausentes na expressão JSON do próprio teste; corrigida e executado somente esse caso novo falho. Um décimo teste novo foi acrescentado ao navegador e executado sozinho, aprovado em 6,4s. Os nove casos anteriores não foram repetidos.

Build e análise direcionada aprovados. Nenhum teste anteriormente concluído foi repetido. A auditoria Supabase não acrescentou avisos de segurança; avisos anteriores da 7 continuam separados. [Referência sobre permissões de funções](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Verificação real antes/depois: 95 produtos, 113 movimentos, hash de saldos `dfa96a2fa33dcc97c385e1cd5094fd58`; três contagens originais com hash `0903d67ff6558ada7cf166e07fe6e00a`; duas revisões anteriores com hash `c14979401bff2857a4ea586c3edf2ead`; planta versão 3 e duas contas com funções/ativação/versão originais preservados. Somente uma nova contagem do roteiro e seu vínculo foram acrescentados.

## Pode riscar e falta

Pode riscar **vínculo da recontagem à origem e à solicitação, sequência navegável, preservação dos registros/itens e recuperação de confirmação no cenário de apresentação da 17**, incluindo implementação, testes e publicação. Banco/exemplo aplicados.

Não riscar a 17 inteira. Faltam regras e permissões reais de conferência/aprovação, coordenação transacional/física de movimentos durante contagens, ajustes operacionais autorizados e seu histórico, integração com mapa/divergências aprovadas (20) e piloto físico. Vínculo não equivale a aprovação nem a ajuste; o exemplo novo aguarda revisão própria.

## Publicação confirmada

Código final 55057885c2d8945c5dca3b1011b988ab4d2ba3da publicado no site original https://liber-automotive.vercel.app/ . Vercel success em https://vercel.com/amarall06s-projects/liber-automotive/FcQAvPUnoLVk3PQUMbKH3nZmX1wZ . Domínio HTTP 200 e dezesseis recursos públicos iguais ao build aprovado. Nenhum teste funcional repetido na publicação.
