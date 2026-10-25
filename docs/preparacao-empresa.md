# Preparação para uso na empresa — 25/10/2026

Esta lista registra a situação real; não significa que o sistema está liberado para operação real.

## Concluído

- Hospedagem: https://liber-automotive.vercel.app/.
- Login confirmado pelo usuário.
- GitHub amarall06/StockFlow conectado à Vercel, produção na branch main com preset Vite e configuração pública do Supabase.
- Primeiro deploy automático: 54b014b, Ready; domínio principal atribuído. Conferidos 53 caixas, oito códigos e dois alertas na sessão autenticada, sem erros de console.

## Cada nova publicação

Compilar, verificar as funções alteradas, fazer commit e push da pasta ativa em `C:/Users/fs_am/Documents/Codex/2026-10-23/files-mentioned-by-the-user-projeto/outputs/StockFlow`. Confirmar o mesmo commit na Vercel com status Ready em Production e testar o domínio principal. Salvar um arquivo não o envia ao GitHub. Migrações SQL são uma etapa separada; a Vercel não as executa.

## Backup — pendente até exportação e restauração conferidas

Conferência no painel em 25/10: organização Liber no plano Free. A página Scheduled backups informa que esse plano não inclui backups do projeto. Nenhum upgrade foi contratado. O usuário confirmou ter a senha do banco, sem compartilhá-la. Preparados clientes portáteis PostgreSQL 18.6 em outputs/tools/pgsql/bin, extraídos do arquivo oficial EDB indicado pelo PostgreSQL para Windows; executáveis pg_dump e pg_restore conferidos. Certificado público do Supabase obtido no botão Download certificate de Database > Settings, somado às raízes confiáveis do Windows para a verificação TLS.

Script `scripts/backup-database.ps1`: pede senha oculta no PowerShell do usuário, verifica TLS/hostname, ativa modo somente leitura, exporta banco em formato custom e cargos sem senhas, verifica índice com pg_restore --list e grava hashes e manifesto. O destino é outputs/Backups/Supabase, fora do Git. Sintaxe conferida, mas **a exportação ainda não foi executada com a senha**. A leitura do índice não substitui teste de restauração. Backups não incluem objetos de Storage, configuração da plataforma, funções Edge ou segredos externos; preservar estes itens separadamente quando aplicável.

Executar no PowerShell do usuário: `& "C:/Users/fs_am/Documents/Codex/2026-10-23/files-mentioned-by-the-user-projeto/outputs/StockFlow/scripts/backup-database.ps1"`. Não enviar a senha, o dump ou os arquivos de contas ao chat. Guardar em local privado e separado do computador após confirmar a exportação. Uma pasta com manifesto failed/incomplete não é backup concluído.

GitHub guarda código, não os dados do banco ou as contas do Supabase. A chave publishable não produz um backup administrativo completo.

1. Entrar no painel do projeto e conferir Database > Backups: data, cobertura e retenção disponíveis. Não contratar upgrade sem autorização.
2. Se necessário, seguir a exportação lógica oficial de roles, schema e dados. Credenciais ficam apenas no ambiente administrativo apropriado, nunca no frontend, chat ou GitHub.
3. Guardar a cópia privada em local separado do projeto. Não publicar dumps com dados de usuários no repositório.
4. Planejar separadamente a cópia dos objetos de Storage quando houver fotos: o backup do banco contém metadados, não os arquivos armazenados.
5. Restaurar em ambiente separado e conferir saldos, histórico, funções, políticas e usuários. Não restaurar um ensaio no banco usado pelo site.

Fontes oficiais consultadas em 25/10/2026:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

## Dados reais e piloto — pendentes

Obter autorização da empresa. Confirmar códigos, aplicações, fabricantes, prateleiras e contagens com o responsável. Planejar a transição para não misturar exemplos com operação real nem apagar históricos indevidamente.

Testar com contas de cada cargo: consulta, recebimento, aprovação de amortecedores, transferência e saídas. Molas não passam por teste. Ensaiar descarte/devolução com motivo; duas pessoas no mesmo saldo; repetição após falha de rede sem duplicação ou saldo negativo. Registrar resultados e responsáveis. Piloto com a equipe e conferência física dependem de participação humana e ainda não foram realizados.
