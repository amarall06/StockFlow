# Etapas do LIBER automotive

Situação em 25/10/2026. Os dados continuam fictícios. Não usar estimativas antigas de porcentagem como garantia de prontidão.

| Etapa | Situação | Conteúdo |
| --- | --- | --- |
| 1. Base do sistema | Concluída no protótipo | Login, Supabase, perfil, cargos básicos e tema claro/escuro. |
| 2. Catálogo e estoque | Funcionando com exemplos | Amortecedores e molas em caixas, consulta por código, entradas e transferências. Aplicações de veículos/anos e tipos somente para amortecedores. Históricos de estoque e alterações de aplicações. |
| 3. Garantia por fabricante | Fluxo básico concluído com dados fictícios | Recebimento, identificação, localização, andamento e destino; entrada e encerramento atualizam o saldo do fabricante. Conferidos amortecedores e molas sem testagem no Supabase. Verificações adicionais de concorrência/acesso e evoluções operacionais documentadas no guia. Projeto retomado pelo usuário. |
| 4. Testagem e etiquetas | Ícone e aprovação funcionando com dados fictícios | Migração API 9 aplicada. Aprovação de 1 caixa, nome/data e conservação do total conferidos no Supabase e após recarga. Histórico por produto. Testes adicionais de cargos/concorrência documentados. Etiquetas e QR individual adiados. Molas sem testagem. |
| 5. Fotos e identificação | Publicado na revisão 61b1c55 (Ready) | Exemplos ilustrativos distintos por categoria, miniatura e ampliação. Upload/substituição por Administrador, privado no Storage; migração 202610250007 aplicada. Conferidos exemplos e prévia, sem enviar exemplos como fotos reais. Conferir persistência do upload quando houver foto apropriada. Guia estudo-fotos-produtos.md. |
| 6. Entradas e saídas completas | Fluxo básico funcionando com dados fictícios | 56 verificações do banco, bloqueio/retomada com rollback, seis cenários locais de recuperação e disputa após COMMIT em cópia isolada aprovados. Interrupção e recuperação de consulta conferidas no navegador publicado; controles de Administrador visíveis na sessão real. Faltam contas dos outros cargos para login, perda de confirmação de escrita no navegador e piloto com equipe. Ver relatorio-testes-operacionais.md. O item de saldo por lote e correções/estornos saiu da pauta a pedido do usuário. Preservar os registros existentes. |
| 7. Gestão e indicadores | Mínimos e painel funcionando com dados fictícios | API 13 conferida no Supabase: resumo, alertas, vendas por código em 30 dias e entradas com fornecedor/lote. Filtros conjunto/amortecedores/molas validados após recarga. Demanda por veículo, giro/ABC e idade remanescente continuam futuros. |
| 8. Administração de usuários | Adiada pelo usuário | Nome e sobrenome obrigatórios, revisão de telas por cargo, painel administrativo, convites e gestão de acessos. Não iniciar agora. |
| 9. Publicação e implantação | Hospedagem e GitHub concluídos | https://liber-automotive.vercel.app/. Primeiro deploy automático da main: 54b014b, Ready. Preparação para a empresa é prioridade AGORA: exportação do backup concluída e íntegra; restauração adiada. Autorização dos dados reais e piloto com a equipe ainda pendentes. |
| 10. Resumo e navegação | Publicado e conferido | Revisão d311f3b Ready em Production; totais 38/15/53, cartões clicáveis, Produtos e Alertas conferidos no domínio principal. |
| 11. Material de estudo | Em andamento | Reunir código comentado e explicações num guia final. Guias por etapa já existem. |

## Prioridades atuais e ideias futuras

Preparar uso na empresa agora, conforme `preparacao-empresa.md`. Fotos publicadas; rodada de saídas e cargos no banco concluída, com limites descritos no relatório. Persistência de foto real e piloto com a equipe continuam pendentes. Giro e Curva ABC precisam de período/métrica; análises financeiras exigem custos/valores. Sem controle por lote, não prometer idade exata do saldo restante.

FUTURO, somente documentação: bandejas e braços de suspensão (nome a confirmar); QR de garantia com produto e fabricante para sugerir o destino correto; etiquetas/QR por caixa; usuários/convites/painel de permissões. Nenhuma dessas ideias deve aparecer como rascunho ou opção futura na interface. Definir formato e validação do QR antes de implementar; leitura não substitui permissões para movimentar estoque.

## Decisões a preservar

- A quantidade principal é contada em caixas. No estoque normal, a equivalência usada é de duas peças por caixa.
- Códigos de molas e amortecedores são independentes, inclusive seus números.
- Molas não têm testagem; suas devoluções normalmente seguem para garantia, com destino confirmado.
- Etiqueta de teste identifica uma caixa inteira de amortecedores.
- O limite mínimo considera todas as caixas do estoque normal, incluindo as que aguardam teste. Garantia permanece separada.
- Na garantia, Moripar, Trebor e New Parts são fabricantes/marcas das peças, não montadoras de veículos.
- A aba Aplicações é apenas para amortecedores, com lápis no Cadastro salvo e botão de histórico nessa aba.
- Dados e observações internos de planejamento não devem aparecer como rascunhos na interface operacional.

## Onde retomar

O usuário retomou o desenvolvimento. As decisões de 25/10 nesta lista prevalecem sobre prioridades antigas. Usuários e etiquetas continuam adiados. Consultar `ponto-retomada.md` e `preparacao-empresa.md` antes de iniciar uso real.
