# Anotação 10 — orientação de instalação dentro do sistema

Etapa de 01/11/2026, após conferir a lista completa das 26 anotações. Sem acesso ou alteração no Supabase real.

## Código e finalidade

`src/components/InstallApp.tsx`: mantém a instalação nativa quando existe convite do navegador e passa a oferecer sempre “Como instalar no computador ou celular” nas opções da conta. Antes, quando não havia convite automático, não havia orientação nesse local. Continua abrindo a confirmação nativa somente por ação da pessoa.

`src/components/InstallGuide.tsx` e `InstallGuide.css`: diálogo com orientação para Windows/Chrome/Edge, Android/Chrome e iPhone/Safari, links oficiais, primeira consulta conectada e limites de offline/rascunhos. O guia é carregado sob demanda para não acrescentar todo seu conteúdo à carga inicial. Usa o mecanismo modal existente, foco inicial, Escape/fechar e retorno ao botão de origem. Texto, cores e largura respeitam os dois temas e tela de 375 px.

Se o convite chegar enquanto o guia estiver aberto, a ação nativa aparece dentro dele. Uma falha de instalação é anunciada, conserva as instruções manuais e não é tratada como instalação concluída. Não há detecção fictícia de aparelho instalado nem instalação automática.

## Somente testes novos

Cinco casos novos em `tests/browser/install-guide.spec.ts`, todos aprovados: ausência de convite com instruções dos três grupos; convite recebido no guia sem abertura automática; falha anunciada com alternativa manual; teclado/largura/auditoria automática A/AA em tema claro; o mesmo recorte em tema escuro. Nenhum teste antigo de manifesto, ícones ou convite foi repetido. Não houve instalação nativa real, gravação no estoque ou uso de conta da empresa: API simulada e evento de convite simulado.

Pode riscar a orientação interna e os cinco novos cenários desse recorte de 10/25/26. A 10 inteira continua parcial: falta instalar, abrir e atualizar em aparelhos reais da empresa. A publicação será registrada depois da confirmação.

## Revisão dos 26 e dependências

`definicoes-da-empresa-26-anotacoes.md` organiza o que depende do usuário/empresa em seis grupos: espaço/capacidade/separação; retorno/pedidos; contagem/prazos/rastreabilidade; equipe/etiquetas/fotos/piloto; trabalho técnico futuro; transição final. Não é um pedido de confirmação para esta entrega. Nenhuma capacidade, prazo, mapa, regra de cancelamento ou permissão foi inventada para marcar itens como concluídos.

## Referências oficiais conferidas

- [Chrome no computador](https://support.google.com/chrome/answer/9658361?hl=pt-BR&co=GENIE.Platform%3DDesktop).
- [Chrome no Android](https://support.google.com/chrome/answer/9658361?hl=pt-BR&co=GENIE.Platform%3DAndroid).
- [Microsoft Edge](https://support.microsoft.com/en-us/edge/install-manage-or-uninstall-apps-in-microsoft-edge).
- [Safari no iPhone — Apple](https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios).

Os rótulos variam por versão; o guia aponta essa variação e mantém links para a orientação atual dos fabricantes. O texto do LIBER é uma orientação própria resumida, não uma garantia de funcionamento de todo navegador/aparelho.
