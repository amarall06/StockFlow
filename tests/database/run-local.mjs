// Cria e apaga seu próprio PostgreSQL. Nunca usa URL/credencial de produção.
import { spawnSync, spawn } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
const container = `stockflow-tests-${randomUUID()}`
const env = { ...process.env }
for (const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']) delete env[key]
const docker = ['--host=unix:///var/run/docker.sock']
function command(args, input) {
  const result = spawnSync('docker', [...docker, ...args], { env, input, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message || 'Falha do Docker')
  return result.stdout
}
const psql = ['exec','-i',container,'psql','-U','postgres','-d','stockflow_test','-v','ON_ERROR_STOP=1','-At']
const sql = input => command(psql, input)
function asyncSql(input) {
  return new Promise((resolve,reject) => {
    const child=spawn('docker',[...docker,...psql],{env,stdio:['pipe','pipe','pipe']})
    let output=''
    child.stdout.on('data',chunk=>{output+=chunk});child.stderr.on('data',chunk=>{output+=chunk})
    child.on('error',reject);child.on('close',code=>code===0?resolve(output):reject(new Error(output)))
    child.stdin.end(input)
  })
}
try {
  command(['run','-d','--name',container,'-e','POSTGRES_PASSWORD=isolated-test-only','-e','POSTGRES_DB=stockflow_test','postgres:17-alpine'])
  let ready=false
  for(let attempt=0;attempt<60;attempt++) {
    // O servidor temporário de inicialização só aceita socket; aguarda o TCP final.
    try { command(['exec',container,'pg_isready','-h','127.0.0.1','-U','postgres','-d','stockflow_test']);sql('select 1;');ready=true;break } catch { await new Promise(resolve=>setTimeout(resolve,500)) }
  }
  if(!ready)throw new Error('PostgreSQL não iniciou em 30 segundos.')
  const root=new URL('../../',import.meta.url)
  sql(readFileSync(new URL('tests/database/bootstrap.sql',root),'utf8'))
  const migrations=readdirSync(new URL('supabase/migrations/',root)).filter(name=>name.endsWith('.sql')).sort()
  for(const name of migrations)sql(readFileSync(new URL(`supabase/migrations/${name}`,root),'utf8'))
  sql(readFileSync(new URL('tests/database/transfers.sql',root),'utf8'))
  sql(readFileSync(new URL('tests/database/company-activity.sql',root),'utf8'))
  const uid='11111111-1111-4111-8111-111111111111'
  const request=randomUUID()
  const call=`select public.transfer_stock_once('AGM-100','TEST-A','TEST-B','released_for_sale',2,'${request}');`
  const transaction=`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${uid}',true);${call}select pg_sleep(0.2);commit;`
  await Promise.all([asyncSql(transaction),asyncSql(transaction)])
  const counts=sql("select count(*) from public.stock_movements where movement_type='transfer';select sum(quantity) from public.stock_balances;select quantity from public.stock_balances b join public.locations l on l.id=b.location_id join public.products p on p.id=b.product_id where l.code='TEST-A' and p.code='AGM-100';").trim().split('\n')
  if(JSON.stringify(counts)!==JSON.stringify(['1','20','8']))throw new Error(`Concorrência alterou saldo/auditoria: ${counts}`)
  if(process.argv.includes('--capacity'))console.log('CAPACITY_RESULT '+sql(readFileSync(new URL('tests/database/capacity.sql',root),'utf8')).trim())
  console.log(`OK: ${migrations.length} migrações em PostgreSQL 17 isolado; contratos, permissões e dois reenvios simultâneos geram uma transferência e conservam 20 caixas.`)
} finally {
  command(['rm','-f',container])
}
