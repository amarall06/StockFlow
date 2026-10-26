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
- Adicionar/retirar caixas da garantia por fabricante, com fluxo de devoluções.
- Fotos ilustrativas, miniatura/ampliação e envio privado por Administrador.
- Alertas de mínimo, resumo por categoria e saídas com recuperação após recarga na mesma aba.
- Giro e Curva ABC por caixas vendidas em 30/90/180 dias; backend API 14 ativo. Consultar as etapas para a situação da publicação do frontend.

## Documentação

- [Guia de estudo organizado, conceitos e exemplos comentados](docs/guia-estudo.md).
- [Ponto de retomada](docs/ponto-retomada.md).
- [Etapas do projeto e situação atual](docs/etapas-projeto.md).
- [Configuração Supabase](docs/primeiro-projeto-supabase.md).
- [Modelo e decisões da operação](docs/modelo-relacional.md).
- [Planejamento das etapas](docs/planejamento-proximas-etapas.md).
- [Acesso e administração](docs/regras-acesso-administracao.md).

