# Redesign de Garantia e Alertas — 02/11/2026

Garantia e Alertas adaptadas às referências nos dois temas e no celular, com os dados existentes. O usuário aprovou preservar os andamentos reais em vez de criar aprovação/recusa inexistentes. Nenhuma regra, chamada à API, permissão, rota, autenticação, banco ou operação offline foi alterada. Nenhuma biblioteca instalada.

## Garantia

`src/components/WarrantyManufacturers.tsx` usa o cabeçalho comum e atalhos que abrem e focam o destino. Fabricantes, caixas e exportação ficam em Mais informações, recolhida inicialmente. Seus componentes permanecem montados, mantendo consultas e estados existentes.

`src/components/WarrantyReturns.tsx` apresenta os cartões Em acompanhamento (recebida/conferência, testagem e identificação), Em garantia e Encerradas. Usa os registros já consultados, com escopo explícito de 100 devoluções recentes; não representa aprovação/recusa. Carga e falha mostram traços, não contagens falsas. Busca e andamento ficam em Filtros e atualização. A tabela mostra identificador existente abreviado, código, motivo, data e situação. O identificador abre os detalhes completos e a edição já existente. Registro encerrado continua somente para consulta. Novo registro abre o formulário anterior Receber devolução. Todos os campos, travas, confirmações e salvamento foram preservados.

`src/components/WarrantyReference.css` restringe os estilos à Garantia: cartões, tabela, formulários, diálogos, fabricantes, dois temas e larguras pequenas. No celular a tabela rola dentro do cartão; página sem vazamento horizontal. Os dados de exemplo das imagens não foram adicionados ao produto.

## Alertas e pop-up

`src/components/InventoryNavigation.tsx` usa o cabeçalho comum e aviso com a quantidade real de produtos zerados/no limite. `src/components/StockAlerts.tsx` mantém a classificação compartilhada e os mesmos estados/ações; apenas a aba Alertas recebe a apresentação compacta. Nas demais telas, mantém a apresentação anterior. Opções reúne atualização, mínimos e contexto da contagem. Cada código abre aplicação, disponibilidade/testagem e edição de mínimo. Barras têm rótulo acessível e a situação também é escrita em texto. Registrar entrada abre o estoque correspondente para o perfil autorizado; consulta oferece Ver estoque.

`src/components/InventoryAlertsReference.css` aplica o visual das referências e reorganiza os cartões no celular. `src/InventoryApp.tsx` somente entrega o callback de navegação e a permissão já calculada à tela.

`src/components/StockNotice.tsx` e `StockNotice.css` reaproveitam o aviso existente com ícone, borda laranja, sombra e botão destacado Ver alertas. O botão leva diretamente à aba e fecha o aviso. Fechar continua disponível. A regra de aparecimento, deduplicação por sessão/conta e leitura dos saldos permanece intacta. É aviso não modal, sem bloquear a tela nem roubar foco.

## Verificações desta etapa

Vinte casos novos aprovados, nos arquivos `tests/browser/warranty-redesign.spec.ts` e `tests/browser/alerts-redesign.spec.ts`, com preparação em `helpers/warranty-redesign.ts`. Incluem os dois temas desktop/celular, auditorias de acessibilidade e contraste, 320px/tablet, saldos e mínimos reais do cenário de teste, filtros, detalhes, permissões, carga/falha/vazio, campos e abertura dos formulários existentes, consulta de encerrados, atalho/CSV/fabricantes, opções recolhidas e pop-up com navegação por teclado.

As falhas dos casos novos foram corrigidas: seletor do filtro Andamento, concorrência de duas execuções usando o mesmo diretório de artefatos e altura de 2px nos cartões. O teste final com oito cenários visuais recebeu prazo suficiente. Build final aprovado; análise sem erros, com aviso preexistente de efeito em InventoryApp. Nenhuma suíte anterior foi executada. Seletores/preparação de alguns testes anteriores foram atualizados para a tabela, os grupos recolhidos e o novo nome do botão, sem reexecutar esses casos.

Revisão React: hooks incondicionais, chaves por identificador, estados de UI locais, botões/summary reais, expansão com aria-controls, rótulos, foco/atalhos e nenhum novo efeito de dados. Capturas em `docs/design/garantia-*`, `alertas-*` e `alerta-popup-*-mobile.png` usam dados controlados de teste. Chrome instalado; ensaio em iPhone/Safari físico continua pendente. Não repetimos operações de escrita já testadas anteriormente.

## Como conferir

1. Abra Garantia e alterne claro/escuro nas opções da conta. Confira os cartões e toque num registro para consultar detalhes ou atualizar um caso aberto.
2. Use Novo registro para abrir o formulário; conferir a abertura não exige salvar. Em Filtros e atualização, busque e filtre o andamento.
3. Em Atalhos, escolha Fabricantes, saldos e exportação. Mais informações abre no destino; cadastro/edição, caixas e CSV continuam disponíveis conforme o perfil.
4. Abra Alertas: veja os cartões e toque no código para detalhes. Em Opções ficam atualização e configuração dos mínimos. Registrar entrada leva ao estoque da categoria.
5. Quando o aviso de estoque aparecer pela regra existente, use Ver alertas para abrir diretamente a aba. Fechar dispensa o aviso. No celular, confira a tabela com rolagem interna e os cartões empilhados.

## Publicação

Publicado em `74357a44002601b70b6f2d9f0c0c76ffd27b988c`, Vercel success. Domínio https://liber-automotive.vercel.app/ com HTTP 200 e dezoito recursos públicos idênticos ao build aprovado, incluindo módulos/CSS de Garantia e Alertas, pop-up e fonte/licença. Nenhum teste funcional repetido durante a publicação. Pode riscar o redesign de Garantia e de Alertas e o aviso destacado com acesso direto. Com Painel e Produtos anteriores, as quatro telas de referência estão implementadas; isso não encerra pendências operacionais das 26 anotações.
