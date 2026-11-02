# Publicação e validação da anotação 14 — 01/11/2026

Código publicado: `221171e9ac55000d3e2b36b4bbe936008aca0521`, main.
Produção: https://liber-automotive.vercel.app/
Publicação READY: https://vercel.com/amarall06s-projects/liber-automotive/h9R1oLcs3iq2tSH4CEF2uTJ7owR5

Dez arquivos públicos conferiram com o build aprovado (JavaScript, worker, página/script offline, manifesto e ícones). Cabeçalhos CSP contra enquadramento, nosniff, DENY e política de referência conferidos. A entrega inclui também os escopos implementados de 1, 5, 10, 11, 13, 16, 20, 22 e 23. Isso não encerra as respectivas pendências de regras, servidor e aparelhos.

## Somente verificações novas

- `tests/browser/offline-worker-upgrade.spec.ts`: atualização elimina caches LIBER antigos, preserva cache de terceiros e usa a página offline atual. Worker v10 abre explicitamente o cache corrente; não força atualização sobre operações abertas.
- `tests/database/offline-live-rollback.sql`: composição nova no banco real, sob papel autenticado, de cadastros/entrada, testagem, transferência, saída, Garantia e devolução com andamento/encerramento; repetição de pedidos e recusa de versão antiga verificadas. Tudo revertido por ROLLBACK. Uma primeira tentativa falhou pelo código temporário de local em minúsculas; corrigida e repetida somente essa verificação nova.
- `tests/browser/offline-production-install.spec.ts`: novo navegador sem conta da empresa instalou o worker no HTTPS público e reabriu sem rede, com cache só da página/script públicos e sem inventar consulta de estoque. Passou após liberar rede para esse teste novo, inicialmente impedido pelo ambiente.

Antes/depois do ensaio transacional: 95 produtos, 113 movimentos normais, 1 fornecedor, 3 fabricantes e 2 devoluções. Hash dos saldos normais `2293bcc6fadbd3bff6e0e3e1acdfd395`; Garantia `e2a9cd5f4c7df936bc4879b73de2c554`. Nenhum local temporário remanescente. Nenhuma migração aplicada, conta criada ou dado de teste permanente.

Build aprovado; nenhuma suíte funcional já concluída foi repetida. Publicação usou `[skip ci]` para não executar novamente as suítes completas.

## O que pode riscar e o que falta

Pode riscar implementação/publicação das operações offline descritas em `progresso-26-anotacoes.md`, ensaio transacional acima e reabertura pública HTTPS. A 14 inteira continua parcial: falta piloto autenticado com equipe/aparelhos reais, inclusive instalação e atualização em Windows/Android e Safari/iPhone. O ensaio SQL não substitui login real nem concorrência entre aparelhos. Fotos continuam exigindo conexão e ainda não foram fornecidas. Recuperação ambígua de fornecedor/fabricante exige conferência explícita, sem recriação automática.

Revisão limitada da 7: oito RPCs offline conferidos com verificação de acesso, sem EXECUTE para anon e search_path vazio. Avisos existentes permanecem: proteção de senhas vazadas desativada, RPCs SECURITY DEFINER que exigem análise individual e tabelas privadas sem política (sem acesso concedido). Não houve mudança de autenticação nem encerramento da auditoria.
