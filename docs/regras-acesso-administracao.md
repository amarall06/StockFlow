# Acesso por cargo, fabricantes e painel administrativo

Planejamento interno de 24/10/2026. As funcionalidades pendentes descritas aqui ainda não foram implementadas no site ou aplicadas ao banco.

O usuário pediu para adiar a etapa de usuários, convites e painel de acesso. Não iniciar essas operações enquanto essa decisão estiver em vigor. A etapa em andamento é o cadastro de fabricantes da garantia.

## Cargos obrigatórios e opções visíveis

Base já aprovada: Administrador, Recebimento, Testador, Estoquista e Consulta. Os cargos e as regras iniciais existem no Supabase. O usuário confirmou que telas, opções visíveis e permissões para executar operações devem depender do cargo.

- Administrador: gerenciar usuários, cargos, ativação e cadastros, além das operações implementadas.
- Recebimento: consultar e registrar entradas normais de produtos existentes.
- Testador: consultar e, quando a operação existir, registrar testes de amortecedores. Molas não passam por testes.
- Estoquista: consultar e transferir caixas. Ajustes de inventário ainda dependem de definição.
- Consulta: consultar sem alterar estoque ou cadastro.

Ocultar os formulários, botões e áreas administrativas sem permissão, mantendo os dados necessários à consulta autorizada. A recusa das gravações continua no banco. Os controles atuais usam cargos e RLS, mas parte das opções ainda aparece desabilitada; a revisão para ocultar conforme o cargo está pendente. A demonstração local também deve refletir as permissões para não sugerir que o cargo Consulta altera dados.

## Nome completo

Exigir nome e sobrenome, com letras e acentos; bloquear números e nome com apenas uma palavra. Permitir separadores normais, como espaço, hífen e apóstrofo. Validar o formato no formulário e no banco.

Formato não comprova autenticidade: sequências aleatórias de letras podem se parecer com nomes. O administrador confere os dados ao aprovar a conta. Não prometer um detector automático de nomes verdadeiros.

Contas existentes fora do formato precisam poder corrigir o próprio nome. Evitar bloquear a única conta administradora ou impedir a correção do próprio perfil. A migração 006 atualmente aceita nome simples; essa nova exigência ainda precisa de atualização. O usuário já confirmou a persistência do nome no fluxo atual.

## Fabricantes na garantia

O usuário confirmou que **Moripar, Trebor e New Parts** são fabricantes/marcas das peças, separados das montadoras de veículos. Planejar um cadastro próprio e relação explícita com o item em garantia; não derivar fabricante dos prefixos AGM, ARE, AFI ou AFR nem presumir que fabricante e fornecedor sejam a mesma entidade.

Administradores gerenciam os fabricantes; o acesso operacional à garantia ainda precisa de definição. Molas encaminhadas à garantia também terão esse vínculo, sem testagem. O módulo de garantia atual é uma apresentação e ainda precisa de operações próprias.

Atualização: a página de fabricantes e a migração `202610240007_warranty_manufacturers.sql` estão preparadas para cadastrar e editar as referências. O banco ainda precisa receber essa migração. O recebimento de itens em garantia permanece pendente. Guia: [estudo-fabricantes-garantia.md](estudo-fabricantes-garantia.md).

## Botão de histórico

O usuário confirmou o botão de quem alterou/moveu e quando **somente em Aplicações**. A aba já tem prévia e botão para o histórico completo com antes/depois. Não acrescentar esses atalhos na Visão geral ou na garantia sem novo pedido. As transferências continuam registradas na aba Histórico existente, separadas das modificações de aplicações.

## Painel administrativo

O usuário quer uma interface simples separada da operação, para controle de acesso e dashboards. Proposta: outra interface com o mesmo Supabase e login, acessível somente ao Administrador. Endereço e hospedagem ainda não foram definidos.

Escopo: usuários/convites, nome completo/e-mail/cargo, ativação e desativação, alterações de cargos com auditoria, cadastro de fabricantes e indicadores baseados nos dados existentes. Impedir desativar ou remover o cargo da última conta administradora ativa. Verificar autorização no servidor em cada operação administrativa.

## Cadastro fácil de pessoas

Nova solicitação: adicionar pessoas sem abrir o Supabase a cada cadastro. Fluxo proposto:

1. Administrador abre **Usuários → Convidar usuário**.
2. Informa nome completo, e-mail e cargo.
3. O servidor verifica o administrador, valida os dados e envia o convite.
4. A pessoa abre o link e cria a própria senha no site.
5. O acesso segue cargo e ativação aprovados pelo administrador.

O convite é uma ação da Auth Admin API executada em ambiente servidor. A chave administrativa fica somente nesse ambiente, nunca em variável VITE ou no navegador. Cargos vêm do cadastro aprovado no servidor, não de metadados livres enviados pelo convidado.

Auth, envio de e-mail e atualização do perfil não formam uma única transação. Se a configuração do perfil falhar, manter a conta sem acesso operacional e informar a pendência ao administrador, sem declarar a ativação concluída. O gatilho existente cria perfis inativos por padrão.

Para convidar funcionários fora da equipe da organização Supabase, configurar envio por SMTP próprio. Preparar também a tela de definição de senha e os endereços de retorno autorizados. O site deve ter um endereço acessível aos funcionários: o localhost do protótipo aponta para o computador de quem abre o link.

Referências oficiais: [convites](https://supabase.com/docs/guides/auth/users), [Auth Admin API](https://supabase.com/docs/reference/javascript/admin-api), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Ordem proposta

1. Revisar a visibilidade por cargo e exigir nome completo, preservando a correção do próprio perfil.
2. Construir o painel e as operações administrativas de usuários.
3. Implementar convite e definição de senha; configurar servidor, e-mail e endereço antes de testar convites reais.
4. Implementar fabricantes e completar a garantia com permissões próprias.
