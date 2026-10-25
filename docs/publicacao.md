# Publicação da LIBER automotive

Publicado em 25/10/2026: https://liber-automotive.vercel.app/.

Publicação feita pelo envio direto da pasta `dist` ao projeto `liber-automotive` da conta `amarall06s-projects` na Vercel. Foram enviados somente cinco arquivos compilados (HTML, JavaScript, CSS e SVGs), sem fontes, `.env.local` ou senhas. O build utiliza a URL e a chave publishable do Supabase da configuração local. Versão de código: commit local `2e726fa`.

A tela de login foi conferida no endereço HTTPS, sem erros no console. A entrada com credenciais e a conferência dos dados nesse novo endereço ainda dependem do usuário. O computador de casa pode ficar desligado.

O push ao GitHub não foi concluído: o Git do Windows apresentou erro de credenciais Schannel; a tentativa com OpenSSL encontrou erro de cadeia de certificados. A validação TLS foi preservada. A hospedagem está ativa independentemente desse envio. As atualizações locais NÃO são publicadas automaticamente: precisam de novo build e envio, ou futura conexão do projeto ao GitHub.

## Configuração para futura conexão ao GitHub

- Repositório: `amarall06/StockFlow`, branch `main`.
- Framework: Vite.
- Comando de instalação: `npm ci`.
- Comando de compilação: `npm run build`.
- Pasta de saída: `dist`.
- Variáveis de ambiente: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

Use os valores da configuração local apenas nos campos correspondentes da hospedagem. A chave publishable é destinada ao navegador; nunca colocar `service_role`, chave secreta ou senha do banco em variáveis VITE. O arquivo `.env.local` continua ignorado pelo Git. Alterar variáveis exige uma nova compilação/publicação.

## Comportamento online

O login e o perfil ativo continuam obrigatórios. As operações dependem das permissões do Supabase. A versão publicada aguarda carregar o estoque antes de liberar os formulários. Em caso de falha ou banco vazio, mostra uma mensagem, sem substituir os dados por um estoque salvo somente no navegador. O modo local de desenvolvimento ainda permite demonstração.

A hospedagem serve os arquivos compilados; depois da publicação, o computador de casa não precisa ficar ligado. Os dados continuam no mesmo projeto Supabase. O sistema permanece em testes com dados fictícios; publicar não conclui as etapas funcionais pendentes.

## Conferência após publicar

1. Abrir a URL final e confirmar que a tela de login aparece sem sessão.
2. Entrar com a conta existente e confirmar o carregamento do Supabase.
3. Conferir amortecedores, molas, garantia e histórico sem criar movimentações reais.
4. Testar o acesso em outro dispositivo/rede.

Referências: https://vercel.com/docs/frameworks/frontend/vite e https://vercel.com/docs/environment-variables/managing-environment-variables.
