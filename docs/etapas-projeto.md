# Etapas do LIBER automotive

Situação em 24/10/2026. Estimativa de prontidão para uso diário real na empresa: **50/100**. É uma estimativa de andamento; os testes atuais usam produtos fictícios.

| Etapa | Situação | Conteúdo |
| --- | --- | --- |
| 1. Base do sistema | Concluída no protótipo | Login, Supabase, perfil, cargos básicos e tema claro/escuro. |
| 2. Catálogo e estoque | Funcionando com exemplos | Amortecedores e molas em caixas, consulta por código, entradas e transferências. Aplicações de veículos/anos e tipos somente para amortecedores. Históricos de estoque e alterações de aplicações. |
| 3. Garantia por fabricante | Fluxo básico concluído com dados fictícios | Recebimento, identificação, localização, andamento e destino; entrada e encerramento atualizam o saldo do fabricante. Conferidos amortecedores e molas sem testagem no Supabase. Verificações adicionais de concorrência/acesso e evoluções operacionais documentadas no guia. Projeto pausado a pedido do usuário. |
| 4. Testagem e etiquetas | Ícone e aprovação funcionando com dados fictícios | Migração API 9 aplicada. Aprovação de 1 caixa, nome/data e conservação do total conferidos no Supabase e após recarga. Histórico por produto. Testes adicionais de cargos/concorrência documentados. Etiquetas e QR individual adiados. Molas sem testagem. |
| 5. Fotos e identificação | Pendente | Foto pequena do produto e ampliação ao clicar, para ajudar quando a etiqueta se perde. |
| 6. Entradas e saídas completas | Pendente | Fornecedores, lotes e saídas por motivo. Vendas, transferências, garantia e ajustes tratados como operações diferentes. |
| 7. Gestão e indicadores | Pendente | Estoque mínimo, ruptura, resumo inicial, entradas recentes, demanda em 30 dias, giro/Curva ABC e idade do estoque. Os gráficos dependem de saídas e dados confiáveis. |
| 8. Administração de usuários | Adiada pelo usuário | Nome e sobrenome obrigatórios, revisão de telas por cargo, painel administrativo, convites e gestão de acessos. Não iniciar agora. |
| 9. Publicação e implantação | Em execução / pendente | Publicar a versão salva no GitHub faz parte do fechamento atual. Depois ainda será necessário definir hospedagem, endereço de acesso, dados reais autorizados e conferência do uso na empresa. |

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

Antes de desenvolver a próxima funcionalidade, ler [ponto-retomada.md](ponto-retomada.md) e [planejamento-proximas-etapas.md](planejamento-proximas-etapas.md). A etapa de usuários continua adiada. Depois de publicar a versão atual, não fazer novas alterações até o usuário solicitar.
