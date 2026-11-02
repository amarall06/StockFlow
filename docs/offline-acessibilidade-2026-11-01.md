# Anotação 26 — teclado e celular na página offline

Etapa de 01/11/2026, executada depois da publicação `a726b26`.

`public/offline.html`: controles com fonte de pelo menos 16 px, altura de pelo menos 44 px, largura limitada à tela e rótulos em bloco. Nomes longos de fornecedor/fabricante/local não alargam a página. Tabela preserva colunas em uma região com rolagem e foco por teclado. Foco recebe contorno visível; há link inicial para pular ao conteúdo e navegação por nove operações. Cada atalho focaliza uma seção com nome acessível e permite continuar para seus campos por Tab. Não foram alteradas regras de operação, filas, saldos, identidades ou chamadas de rede.

`public/sw.js`: versão pública v11 para entregar o HTML atualizado, mantendo somente página/script públicos em cache e a política existente de aguardar fechamento dos clientes antigos. Não força recarga no meio de uma operação. A expectativa do teste público antigo foi atualizada para a nova versão, sem executar seu caso novamente.

Somente três testes novos em `tests/browser/offline-accessibility.spec.ts`, todos aprovados com o navegador realmente sem rede:

1. Todos os controles cabem em 375 px com nomes longos, fonte/altura legíveis; somente a tabela possui rolagem horizontal própria e recebe foco visível.
2. Tab/Enter no link de conteúdo e atalhos para Saídas, Testagem e Fornecedor/fabricante chegam às seções e campos, sem criar rascunhos.
3. Auditoria axe com WCAG 2 A/AA e 2.1 AA não encontra violações nos critérios automatizáveis avaliados.

Nenhum teste concluído foi repetido. Isso não encerra acessibilidade completa, revisão manual de leitor de tela ou Safari/iPhone físico. Pode riscar este recorte de implementação e verificação da 26; a publicação será registrada no relatório de entrega. A melhoria geral de design permanece para depois das 26 anotações.
