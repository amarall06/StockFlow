# LIBER automotive — Rascunho de funções e permissões

Documento interno com a matriz aprovada como base. Os cargos e as políticas iniciais já foram aplicados ao Supabase. Testagem, garantia e administração por painel ainda têm operações pendentes.

## Funções propostas

| Função | Consultar estoque | Receber estoque normal | Registrar resultado de teste | Transferir caixas | Ajustar inventário | Administrar usuários e cadastros |
| --- | --- | --- | --- | --- | --- | --- |
| Administrador | Sim | Sim | Sim | Sim | Sim | Sim |
| Recebimento | Sim | Sim | Não | Não | Não | Não |
| Testador | Sim | Não | Sim | Não | Não | Não |
| Estoquista | Sim | Não | Não | Sim | A confirmar | Não |
| Consulta | Sim | Não | Não | Não | Não | Não |

## Princípios para a primeira versão

- Toda pessoa autenticada deve ter uma função explícita; conta sem função ativa não recebe acesso às tabelas.
- Conta nova recebe a função **Consulta**, mas fica inativa até um administrador aprová-la; assim, uma inscrição espontânea não consulta o estoque.
- O acesso de consulta não permite alterar quantidades.
- Transferências guardam origem, destino, quantidade, situação e usuário responsável.
- Ajustes de inventário e administração de cadastros ficam limitados até a empresa confirmar quem pode executá-los.
- As migrações iniciais permitem consulta e administração dos cadastros de referência pelo administrador. Nenhum papel tem escrita direta nos saldos ou no histórico; a migração `202610240002_stock_operations.sql` prepara RPCs transacionais para recebimento, cadastro inicial e transferência, respeitando administrador, recebimento e estoquista.
- O papel Recebimento se refere à entrada normal de estoque neste estágio. Devoluções do Mercado Livre ficam fora das permissões ativas enquanto o fluxo é detalhado.
- O fluxo detalhado de devoluções/garantia ainda não deve virar permissão ou política própria; primeiro precisamos confirmar etapas e responsabilidades.
- As senhas ficam no Supabase Auth. O perfil no banco guarda apenas a função e os dados de apresentação estritamente necessários.
- Políticas RLS devem conferir função e status ativo no servidor/banco; esconder botões na interface não protege os dados.
- Nova exigência: ocultar opções e áreas administrativas sem permissão, além de recusar as gravações no banco. A demonstração também deve refletir o cargo.
- O painel administrativo e as novas regras de nome completo e fabricantes estão em [regras-acesso-administracao.md](regras-acesso-administracao.md).

## Decisões pendentes

1. A equipe usa estas funções ou precisa de nomes/divisões diferentes?
2. O Estoquista pode realizar ajustes de inventário ou só transferências?
3. Quem poderá aprovar novos usuários e trocar as funções?
4. Quem deve ter acesso aos registros detalhados de devolução e garantia?

## Estado

As funções foram aprovadas como base. A transferência por RPC no Supabase foi confirmada pelo usuário e o histórico foi consultado pela interface. O papel Testador ainda não tem operação de registro de resultado de amortecedores porque seus destinos continuam em aberto. Molas não passam por teste; a nova migração aplica essa diferença às entradas mantendo as permissões de Administrador e Recebimento.
