# Anotação 13 — fila de pendências das conferências

Próximo recorte curto, sem repetir mapa ou detector: Painel → Apresentação → Contagens compartilhadas → Pendências de conferência.

O quadro lista todos os envios sem decisão na consulta atual e solicitações de recontagem sem um envio filho vinculado. Solicitações já atendidas saem da fila de início; a contagem filha ainda não revisada aparece como nova pendência própria. Aprovações não geram pendência. Os responsáveis por função são identificados; o botão abre o registro existente no histórico, sem iniciar operação automaticamente.

A fila recebe os dados já validados pelo fluxo compartilhado e acompanha suas atualizações, sem consultas adicionais, escrita ou mudanças no banco. Administrador vê o acesso à revisão; Administrador/Estoquista veem o acesso à solicitação; Consulta acompanha evidências. A autorização para executar operações continua nos fluxos e regras existentes. A atualização não rouba foco; falha conserva os registros e sinaliza a consulta anterior.

## Código

- `src/components/SharedCountPending.tsx`: classificação das pendências a partir de contagens, decisões e vínculos já consultados; contadores anunciados e navegação à evidência.
- `src/components/PresentationShelfCounts.tsx`: integração com os dados e a abertura do histórico existentes.
- `src/components/PresentationShelfCounts.css`: quadro e lista adaptáveis ao celular e foco de teclado.

## Verificações novas

`tests/browser/shared-count-pending.spec.ts`: quatro casos novos — separação revisão/recontagem e abertura da evidência; solicitação atendida e nova revisão com preservação em falha/sem roubar foco; Consulta por teclado em 375px; aprovações sem pendências e limite do histórico explícito. Nenhuma suíte anterior executada. Build e análise dos componentes aprovados.

## Pode riscar e falta

Pode riscar **13 — fila automática das pendências de revisão/recontagem compartilhadas da apresentação**. Não encerra a anotação 13 inteira: prazos, destinatários individuais, resolução e outras pendências operacionais ainda dependem das regras/registros correspondentes. A janela continua de até 50 envios recentes mais vínculos abertos; fila vazia não comprova conclusão de todo o histórico. Nenhum saldo alterado.

Publicado em `eb9d6879011afb28e90f38f5095ef407230d920a`. Domínio HTTP 200 e quatorze recursos públicos iguais ao build aprovado. Quatro testes novos aprovados, sem repetir anteriores ou testes funcionais na publicação.
