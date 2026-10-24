# LIBER automotive

Protótipo de estoque de amortecedores e molas com React, TypeScript, Vite e Supabase. Usa produtos fictícios durante o desenvolvimento.

## Executar localmente

```powershell
npm install
npm run dev
```

Configure `.env.local` conforme `.env.example`, com a URL Supabase e a chave publicável. A configuração local é ignorada pelo Git. Chaves administrativas pertencem exclusivamente ao servidor.

```powershell
npm run build
npm run lint
```

## Recursos atuais

- Login e nome do usuário persistidos no Supabase.
- Estoque em caixas, consulta por código, entradas, transferências e histórico.
- Molas com códigos independentes e sem testagem.
- Aplicações de veículos/anos e tipos de amortecedor, com histórico de modificações.
- Cadastro de fabricantes da garantia.
- Tema claro/escuro por ícones em todas as telas.
- Adicionar/retirar caixas da garantia por fabricante preparado no código; aguarda confirmar a migração 008 e o teste no banco.

## Documentação

- [Ponto de retomada](docs/ponto-retomada.md).
- [Configuração Supabase](docs/primeiro-projeto-supabase.md).
- [Modelo e decisões da operação](docs/modelo-relacional.md).
- [Planejamento das etapas](docs/planejamento-proximas-etapas.md).
- [Acesso e administração](docs/regras-acesso-administracao.md).
- Guias de estudo do código na pasta `docs/`.

As migrações ficam em `supabase/migrations/`, em ordem numérica. Aplique somente a próxima necessária; não repita as já executadas. O seed de demonstração destina-se a uma base vazia, não a uma instalação com dados existentes.
