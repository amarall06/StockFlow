# Publicação da LIBER automotive

Publicado em 25/10/2026: https://liber-automotive.vercel.app/.

Publicação feita pelo envio direto da pasta `dist` ao projeto `liber-automotive` da conta `amarall06s-projects` na Vercel. Foram enviados somente cinco arquivos compilados (HTML, JavaScript, CSS e SVGs), sem fontes, `.env.local` ou senhas. O build utiliza a URL e a chave publishable do Supabase da configuração local. Versão de código: commit local `2e726fa`.

A tela de login foi conferida no endereço HTTPS, sem erros no console. O usuário confirmou que entrou corretamente no site publicado. O computador de casa pode ficar desligado.

Em 25/10/2026, o projeto da Vercel foi conectado ao repositório `amarall06/StockFlow`, com autorização do usuário para acrescentar esse repositório à instalação existente da Vercel. Branch de produção `main` confirmada, preset Vite salvo e as duas variáveis públicas do Supabase salvas nos ambientes Production e Preview. O primeiro deploy disparado por commit ainda precisa ser verificado; até isso acontecer, o endereço continua atendendo a versão enviada por Drop.

O push desta sessão permanece bloqueado pelo gerenciador de credenciais do Windows. A conexão HTTPS foi resolvida usando OpenSSL com os certificados raiz confiáveis do Windows, sem desativar TLS. Foi solicitado ao usuário executar o push no PowerShell normal do computador. Nenhuma senha ou token foi colocado no código.

## Configuração da conexão ao GitHub

- Repositório: `amarall06/StockFlow`, branch `main`.
- Framework: Vite.
- Instalação: padrão da Vercel para npm, com `package-lock.json` no repositório.
- Comando de compilação: `npm run build`.
- Pasta de saída: `dist`.
- Variáveis de ambiente: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

Use os valores da configuração local apenas nos campos correspondentes da hospedagem. A chave publishable é destinada ao navegador; nunca colocar `service_role`, chave secreta ou senha do banco em variáveis VITE. O arquivo `.env.local` continua ignorado pelo Git. Alterar variáveis exige uma nova compilação/publicação.

Depois de verificar a primeira publicação automática, o fluxo será: editar os arquivos, testar, criar um commit e enviar com `git push origin main`. Apenas salvar um arquivo no computador não envia a atualização ao GitHub. As migrações SQL do Supabase continuam sendo uma etapa separada; a Vercel não as executa automaticamente.

## Comportamento online

O login e o perfil ativo continuam obrigatórios. As operações dependem das permissões do Supabase. A versão publicada aguarda carregar o estoque antes de liberar os formulários. Em caso de falha ou banco vazio, mostra uma mensagem, sem substituir os dados por um estoque salvo somente no navegador. O modo local de desenvolvimento ainda permite demonstração.

A hospedagem serve os arquivos compilados; depois da publicação, o computador de casa não precisa ficar ligado. Os dados continuam no mesmo projeto Supabase. O sistema permanece em testes com dados fictícios; publicar não conclui as etapas funcionais pendentes.

## Conferência após publicar

1. Abrir a URL final e confirmar que a tela de login aparece sem sessão.
2. Entrar com a conta existente e confirmar o carregamento do Supabase.
3. Conferir amortecedores, molas, garantia e histórico sem criar movimentações reais.
4. Testar o acesso em outro dispositivo/rede.

Referências: https://vercel.com/docs/frameworks/frontend/vite e https://vercel.com/docs/environment-variables/managing-environment-variables.
