# Anotações 25/26 — contraste e auditoria dos formulários

Etapa de 01/11/2026, sem acesso ou escrita no Supabase real. Correções de legibilidade; a reformulação geral de design permanece para depois das 26 anotações.

## O que mudou e onde

- `src/components/WarrantyManufacturers.css`: textos auxiliares de Garantia, inclusive diálogos de entrada/saída e devolução, rótulos e resumos, usam cores mais escuras no tema claro. A cor `#74818a` sobre branco tinha contraste medido de 4:1, abaixo dos 4,5:1 exigidos para esse texto pequeno. Substituída por `#586872`; regras próprias do tema escuro preservadas.
- `src/components/ApplicationHistory.css`: textos de ajuda, datas, autor, notas e paginação do histórico de aplicações ficaram mais legíveis no tema claro.
- `src/App.css`: contraste de descrições de formulário, notas de tabela, textos auxiliares e selo de origem dos dados. Alteradas somente cores de texto, sem mexer na organização, campos ou operações.
- `src/components/MovementHistory.css`: mensagens, detalhes e paginação do histórico normal.
- `src/components/InventoryDashboard.css`: categoria e localização nos cartões de produtos, onde o contraste era insuficiente no fundo branco.
- `src/components/ProfileSettings.css`: rótulos de dados da conta e texto de ajuda do nome.
- `src/components/ProductPhotos.css`: selo “Exemplo” mais legível, inclusive no tema escuro, sem substituir as imagens ilustrativas por fotos reais.

Não alterados saldos, regras, permissões, dados de conta, chamadas de rede ou preenchimentos de formulário. Nenhuma dependência nova instalada.

## Somente testes novos

`tests/browser/dialog-accessibility.spec.ts`: **16 casos novos aprovados**. Sete diálogos, cada um nos temas claro/escuro e em 375 px: mínimo, testagem, entrada de Garantia, saída de Garantia, devolução, histórico completo de aplicações e foto. Auditoria axe WCAG 2 A/AA e 2.1 AA, limites de largura/rolagem e ausência de escrita. Mais dois casos para a contagem local preenchida, um por tema.

`tests/browser/module-form-accessibility.spec.ts`: **14 casos novos aprovados**. Visão geral, Garantia, Saídas, Histórico, Aplicações, Produtos e Minha conta, nos dois temas, em 375 px. Auditoria restrita ao conteúdo dessas telas, cujos formulários não estavam cobertos pela auditoria anterior do Painel/login. Todas as chamadas de dados são interceptadas com exemplos fictícios.

Os testes antigos de teclado, login, navegação e página offline não foram executados. Dos novos: onze diálogos/contagens passaram na primeira execução; cinco casos novos foram repetidos depois da correção de contraste e do fechamento do aviso de estoque na preparação do histórico móvel. Nos módulos, seis passaram inicialmente; somente os oito casos novos com falha foram repetidos após corrigir as cores. Resultado: **30 casos novos distintos aprovados**, sem reexecutar as suítes antigas ou os novos que já estavam aprovados.

## O que pode riscar

Pode riscar a auditoria automática e as correções de contraste desses formulários/diálogos no recorte descrito, como avanço das anotações 25 e 26. A publicação será registrada abaixo depois de confirmada.

Auditoria automática com dados simulados não encerra acessibilidade completa. Permanecem leitura manual com tecnologia assistiva, Safari/iPhone físico, fotos reais e testes do piloto. As pendências que exigem capacidade/mapa/regras operacionais ou ativação do servidor continuam na lista dos 26, sem dados inventados para encerrá-las.
