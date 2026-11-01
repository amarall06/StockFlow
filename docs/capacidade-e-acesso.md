# Capacidade, acesso e cópia privada

## A demanda informada

500 saídas por dia e 900 entradas por semana equivalem a aproximadamente 629 operações
por dia, ou 0,0073 por segundo na média de 24 horas. Concentradas em oito horas, são
aproximadamente 0,022 por segundo. Essa média é pequena para PostgreSQL, mas não descreve
picos simultâneos, fotos grandes, relatórios abertos e a rede dos funcionários.

O site grava as operações no Supabase; a Vercel entrega a interface estática. Quem limita
uma gravação é principalmente o banco, a concorrência sobre o mesmo saldo, o plano e a rede.
O cadastro atual restringe os números dos códigos de cada prefixo a 1–100; aumentar esse
catálogo é uma mudança diferente de aumentar o número de movimentações.

## Ensaio reproduzível

Com Docker: `node tests/database/run-local.mjs --capacity`.

O teste cria PostgreSQL 17 descartável, instala as migrações e adiciona 180 dias sintéticos:
500 vendas/dia e 129 recebimentos/dia, aproximadamente 903/semana. Depois executa 500 saídas
e 900 recebimentos com UUIDs pelas RPCs reais, além de relatórios. Não toca no banco da empresa.
Histórico final do ensaio: 114.621 movimentos.

| Operação | Chamadas | Média no servidor | Percentil 95 |
|---|---:|---:|---:|
| Saída | 500 | 0,359 ms | 0,495 ms |
| Entrada | 900 | 0,373 ms | 0,573 ms |
| Painel | 20 | 18,583 ms | 44,059 ms |
| Gráfico de 90 dias | 20 | 69,170 ms | 75,245 ms |

P95 significa que 95% das medições terminaram até aquele tempo. Esses números são do
container e excluem internet, Auth, PostgREST, envio de fotos e características do plano
hospedado. Não são promessa de latência em produção nem teste de 500 usuários simultâneos.
Há também um ensaio separado de reenvios simultâneos da mesma transferência: um único
movimento é gravado, com conservação das caixas. O ensaio de volume é sequencial.

Conclusão técnica: o volume informado passou no ensaio do banco e não é alto pela média;
acompanhar CPU, conexões, espaço, erros e latência no Supabase durante o piloto. Rever plano
ou agregações se relatórios e picos elevarem a latência. O índice existente de movimentos
por tipo/data atende as consultas recentes; a nova série diária usa os mesmos filtros.

## Funcionários aprovados em qualquer lugar

- O endereço não é senha. Qualquer visitante pode carregar o formulário de login.
- O estoque exige uma sessão válida e um perfil ativo, com cargo aprovado no banco.
- O novo cadastro de e-mails autorizados fica no esquema privado, sem acesso dos clientes.
- Contas existentes são preservadas. Novas contas exigem um e-mail previamente autorizado;
  o perfil continua inativo por padrão. Cargo e ativação não vêm de metadados do usuário.
- A autorização do endereço não envia mensagem, não cria conta nem ativa acesso sozinha.
- A ausência de indexação em buscadores reduz a descoberta; não substitui login nem RLS.

Fluxo administrativo atual, no painel do Supabase com conta proprietária:

1. No SQL Editor, autorizar o endereço exato (substituir o exemplo):

```sql
insert into private.company_allowed_emails(email)
values (lower(trim('funcionario@empresa.exemplo')))
on conflict do nothing;
```

2. Em Authentication → Users, convidar o endereço autorizado. Isso depende de envio de
   e-mail configurado; a integração não testa entrega usando endereços reais sem necessidade.
3. Conferir a identidade da pessoa e só então ativar seu perfil e definir seu cargo em
   `public.profiles`. Não conceder Administrador por conveniência. Nunca desativar a única
   conta administradora ativa. O painel completo de convites ainda não faz parte desta entrega.
4. Revogar acesso desativando `profiles.is_active`; os comandos do banco verificam essa
   condição. Remover um endereço da lista bloqueia cadastro novo, não revoga conta existente.

Não incluir `.env.local`, tokens, senhas ou dumps de produção no GitHub.

## Cópia privada fora do computador

Destino escolhido: `amarall06/StockFlow-backup-privado`. Conferir `visibility=private`
antes do envio e conferir o SHA remoto depois. O repositório público original não se torna
privado por haver uma cópia privada. Evitar dados reais e segredos em ambos.

Essa cópia contém código, estilos, testes, migrações e documentação. Não contém as tabelas
com dados, contas Auth ou fotos privadas do Supabase. Backup do banco e do Storage tem ciclo
separado; a cópia do código não substitui backup/restauração desses serviços.
