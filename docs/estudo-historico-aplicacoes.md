# Histórico de modificações das aplicações

## Ativação

Execute o conteúdo completo de `supabase/migrations/202610240005_application_history.sql` em uma nova consulta do SQL Editor, uma vez, depois da migração 004. Recarregue o site e abra **Aplicações**. Não é necessário repetir o seed nem as migrações anteriores.

Selecione um amortecedor. Abaixo do cadastro salvo há uma prévia dos três registros mais recentes. **Ver histórico completo** abre uma janela com todos os registros desse código, em páginas de dez, da alteração mais recente para a mais antiga. Use **Ver cadastro antes e depois** para comparar as versões; **Fechar** ou Escape fecha a janela.

Depois da ativação, altere um ano de um exemplo fictício e salve. O histórico deve mostrar o intervalo removido e o novo intervalo, responsável e horário. Recarregar deve preservar o registro. Salvar os mesmos valores novamente não cria um evento de modificação.

## Limites dos registros anteriores

Antes desta migração, as versões anteriores, autores e datas das edições do formulário não eram guardados. A migração registra o cadastro detalhado atual como **Situação inicial registrada**, com a data da ativação do histórico, sem inventar um autor ou uma data de edição antiga.

As modificações futuras feitas pelo formulário do site são registradas. Edições administrativas feitas diretamente com SQL fora desse fluxo não são auditadas por esta função.

## Arquivos e funções

- `src/components/ApplicationHistory.tsx`: mostra a prévia, a janela completa, mensagens de carregamento/erro e paginação. O componente fica dentro da aba Aplicações e acompanha o amortecedor selecionado.
- `useApplicationHistory`: consulta o banco quando produto, página ou contador de atualização mudam. Uma chave identifica a consulta atual; respostas antigas não substituem os dados de outro código.
- `HistoryDialog`: usa o elemento HTML `dialog`. `showModal()` abre a janela, mantém o foco nela e bloqueia interação acidental com o formulário atrás. O fechamento devolve o acesso à página.
- `HistoryResults`: apresenta os registros com data, responsável e resumo. Na janela completa, exibe também as versões antes/depois.
- `src/lib/application-history.ts`: define as versões e `applicationChangeLines`, que identifica tipo alterado, veículos/intervalos incluídos ou removidos e mudanças na ordem de apresentação.
- `loadApplicationHistory`, em `src/lib/inventory-api.ts`: busca os registros por código. Lê uma linha extra para saber se há próxima página; a prévia não limita a consulta do histórico completo.
- `src/components/ApplicationHistory.css`: organiza os cartões, a janela, os temas e a apresentação em telas menores.

## Como o banco grava

`product_application_history` guarda as versões em JSON, código do produto, conta responsável, nome disponível da pessoa e horário do servidor. O nome é copiado no momento da alteração, evitando mudar os registros antigos quando o perfil for renomeado. Para registros que ainda não tinham nome, a interface pode mostrar o nome atual de um perfil autorizado, identificado como nome atual, sem reescrever a linha de auditoria.

A nova `update_product_details` mantém a mesma chamada usada pelo formulário. Confere a função Administrador, bloqueia a linha do produto, captura a versão anterior e chama a validação existente, agora interna ao esquema `private`. Depois captura a nova versão e insere a auditoria se houve mudança real.

Todo o salvamento ocorre na mesma transação. Se a auditoria falhar, a alteração do cadastro também é cancelada. A proteção contra edições simultâneas, os limites e a validação de veículos/anos continuam ativos.

As contas ativas podem consultar o histórico pelas políticas RLS. O navegador não recebe permissão para inserir, editar ou apagar linhas de auditoria diretamente. A função usa a conta autenticada pelo servidor; o formulário não escolhe quem será registrado como autor.

## Verificações

Compilação e verificação estática executadas. Comparações verificadas com exemplos de alteração de ano, inclusão/remoção, mudança de tipo, reordenação e situação inicial, sem modificar os objetos comparados. Após a ativação no Supabase, foram conferidos na interface a prévia da situação inicial do AFI-89, o botão que abre a janela completa e a comparação antes/depois com os dados salvos. Nenhum cadastro foi alterado para fabricar eventos durante essa conferência. A primeira alteração posterior à ativação ainda deve ser conferida no histórico após um salvamento real pelo usuário.
