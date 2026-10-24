# Ponto de retomada — 24/10/2026

## Projeto e dados

Projeto local ativo: `C:/Users/fs_am/Documents/Codex/2026-10-23/files-mentioned-by-the-user-projeto/outputs/StockFlow`. Uma pasta anterior também existe em `E:/Projeto estoque`; não presumir que ela contenha esta versão atualizada sem conferir.

O site usa Vite em `http://127.0.0.1:5173/`. Os dados fictícios de estoque e as contas ficam no Supabase configurado em `.env.local`. Esse arquivo é ignorado pelo Git. A cópia dos arquivos do site não representa um backup independente do banco hospedado ou das contas de autenticação.

## Concluído e conferido

- Login, conta ativa e nome persistente após recarregar, confirmado pelo usuário.
- Estoques em caixas para amortecedores e molas, consulta por código e transferência persistente no Supabase.
- Molas sem testagem, situação Em estoque e números independentes dos amortecedores.
- Histórico de movimentações com filtros para os dois tipos de produto.
- Aplicações de veículos/anos e tipo de amortecedor. A aba Aplicações mostra somente amortecedores, com lápis no cadastro salvo.
- Prévia e janela completa do histórico de aplicações, com antes/depois e responsáveis.
- Fabricantes Moripar, New Parts e Trebor carregados do Supabase na garantia, com cadastro/edição para administradores.
- Lua no tema claro, sol no escuro e lápis nas ações Editar. Tema disponível inclusive no login, salvo no navegador.

## Etapa atual preparada

Caixas por fabricante e categoria na garantia, com Adicionar e Retirar. Migração: `supabase/migrations/202610240008_warranty_boxes.sql`.

A execução dessa migração no Supabase ainda não foi confirmada. Conferir se a tela mostra os saldos ou o aviso de ativação pendente. Depois de aplicar, validar uma entrada fictícia, uma retirada e a persistência após recarregar. O banco impede saldo negativo e um mesmo envio repetido não deve duplicar a operação.

Os saldos de garantia não alteram automaticamente o estoque normal ou o saldo para venda. A contagem é por fabricante/categoria; a identificação detalhada de cada devolução pertence à próxima fase. Somente administradores movimentam garantia até definir os demais cargos.

## Próximas funcionalidades

1. Recebimento e acompanhamento de cada devolução/garantia, com identificação, local e destino. Não presumir o destino de peças erradas ou itens aleatórios recebidos.
2. Testagem de amortecedores por caixa inteira, com QR único, pessoa e data. Molas não passam por teste.
3. Fornecedor/lote e saídas por motivo. Transferência interna não conta como venda.
4. Limite mínimo por produto e alertas de ruptura. Considerar todas as caixas do estoque normal, incluindo aguardando teste, como o usuário escolheu; garantia separada.
5. Resumo inicial, entradas recentes e demanda dos últimos 30 dias após registrar as saídas.
6. Giro/Curva ABC e estoque parado. Definir a métrica e os dados de valor/quantidade; não inventar demanda nem capital imobilizado.

## Adiado pelo usuário

Usuários, convites e painel administrativo separado. A exigência futura de nome e sobrenome sem números e a revisão das opções visíveis por cargo estão documentadas. O nome atual já é editável, mas a validação de nome completo não foi implementada. Não retomar a etapa adiada sem o usuário pedir.

## Verificação e preservação

A última compilação passou. Há aviso de tamanho do JavaScript e avisos de efeitos React já existentes no lint; não são erros de compilação. Foram conferidos ícones acessíveis, retirada vazia bloqueada, seleção de categoria com saldo e aviso antes da migração de garantia.

Preservar fontes, imagens, documentação, SQL e configuração local. Dependências e cache npm podem ser reconstruídos com `package-lock.json`. O Git local não tem remoto; publicação no GitHub segue pendente.
