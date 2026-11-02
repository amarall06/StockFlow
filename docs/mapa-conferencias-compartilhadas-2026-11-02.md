# Anotação 20 — conferências compartilhadas por região

Escolhido o menor recorte restante a pedido do usuário: ligar os envios e decisões já disponíveis à navegação da planta, sem criar outro fluxo de conferência ou alterar saldo.

No Painel → Apresentação → Contagens compartilhadas, o novo quadro **Conferências por região** mostra NORTE, SUL, LESTE e OESTE, último envio, decisão, autor/data e última aprovação consultada. Mostra diferenças da contagem aprovada sem confundi-las com saldo atual. Um envio posterior pendente não herda aprovação anterior. Ausência de dados é identificada como ausência nesta consulta, não prateleira conferida.

Os botões abrem o registro original no histórico e selecionam a região na planta existente. A leitura, atualização e validação das decisões são reaproveitadas do fluxo compartilhado. Não há novas consultas, tabelas, permissões ou escritas no banco. Continua sendo apresentação, com janela dos 50 envios recentes mais vínculos abertos; não é o histórico completo nem autorização para ajustar estoque. Falha de atualização conserva o quadro e o sinaliza como consulta anterior.

## Código

- `src/components/SharedCountMap.tsx`: resumo de cada região, decisão do último envio e última aprovação, navegação ao histórico/planta.
- `src/components/PresentationShelfCounts.tsx`: fornece os registros e revisões já validados e reaproveita a abertura do histórico.
- `src/components/PresentationShelfCounts.css`: disposição por direção em telas maiores e cartões em uma coluna no celular, com estados identificados por texto.

## Verificação nova

`tests/browser/shared-count-map.spec.ts`: três casos novos, sem executar os anteriores: decisões/evidências/localização sem escrita; envio posterior pendente e preservação/recuperação em falha; consulta vazia com quatro regiões, teclado e 375px. A simulação da falha foi ajustada para HTTP 403, sem a repetição automática de erros 503 pelo cliente. Reexecutado somente o caso novo que falhou. Build e análise dos componentes aprovados.

## Pode riscar e falta

Pode riscar **anotação 20: resumo das conferências/aprovações compartilhadas da apresentação, com acesso ao histórico e à planta**. Avança o vínculo com o mapa da 17. Faltam operação e regras reais da contagem, ajustes autorizados, rastreamento de movimentos durante conferência, histórico completo e piloto físico. Não encerra as anotações 17/20 inteiras.

Publicação aguardando confirmação.
