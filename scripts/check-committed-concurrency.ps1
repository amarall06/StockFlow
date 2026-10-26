# Disputa com COMMIT em tabelas isoladas; não registra retiradas no estoque público.
# Copia a função atual, executa dois clientes e remove apenas o schema criado por este ensaio.
[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$outputsRoot=Split-Path $projectRoot -Parent
$psql=Join-Path $outputsRoot 'tools/pgsql/bin/psql.exe'
$certificate=Join-Path $outputsRoot 'tools/liber-postgres-ca.pem'
if(!(Test-Path -LiteralPath $psql) -or !(Test-Path -LiteralPath $certificate)){throw 'Ferramentas PostgreSQL ou certificado ausentes.'}
$reportDirectory=Join-Path $outputsRoot ('verifications/committed-concurrency-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'-'+[guid]::NewGuid().ToString('N').Substring(0,6))
New-Item -ItemType Directory -Path $reportDirectory -Force | Out-Null
$workers=New-Object System.Collections.ArrayList
$previousEnvironment=@{}
foreach($name in @('PGPASSWORD','PGSSLMODE','PGSSLROOTCERT','PGCONNECT_TIMEOUT','PGOPTIONS')){$previousEnvironment[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
$secret=$null
$pointer=[IntPtr]::Zero
$report=[ordered]@{status='incomplete';createdAt=[DateTimeOffset]::UtcNow.ToString('o');permanentWrites=$false;restorePerformed=$false}

function SqlLiteral([string]$value){return "'"+$value.Replace("'","''")+"'"}
function Start-PgWorker([string]$name,[string]$sql){
    $sqlFile=Join-Path $reportDirectory ($name+'.sql')
    [IO.File]::WriteAllText($sqlFile,$sql,[Text.UTF8Encoding]::new($false))
    $arguments=@('--host=aws-0-us-east-1.pooler.supabase.com','--port=5432','--username=postgres.tfatagbhmkeelbvstcvb','--dbname=postgres','--no-password','--no-psqlrc','--tuples-only','--no-align','--set=ON_ERROR_STOP=1',"--file=$sqlFile")
    $process=New-Object Diagnostics.Process
    $process.StartInfo.FileName=$psql
    $process.StartInfo.Arguments=($arguments|ForEach-Object{'"'+$_+'"'}) -join ' '
    $process.StartInfo.UseShellExecute=$false
    $process.StartInfo.CreateNoWindow=$true
    $process.StartInfo.RedirectStandardOutput=$true
    $process.StartInfo.RedirectStandardError=$true
    [void]$process.Start()
    $worker=[PSCustomObject]@{Name=$name;Process=$process;Output=$process.StandardOutput.ReadToEndAsync();Error=$process.StandardError.ReadToEndAsync()}
    [void]$workers.Add($worker)
    return $worker
}
function Complete-PgWorker($worker){
    if(!$worker.Process.WaitForExit(35000)){throw "Tempo excedido em $($worker.Name)."}
    $output=$worker.Output.GetAwaiter().GetResult()
    $errors=$worker.Error.GetAwaiter().GetResult()
    [IO.File]::WriteAllText((Join-Path $reportDirectory ($worker.Name+'.out')),$output,[Text.UTF8Encoding]::new($false))
    [IO.File]::WriteAllText((Join-Path $reportDirectory ($worker.Name+'.log')),$errors,[Text.UTF8Encoding]::new($false))
    if($worker.Process.ExitCode -ne 0){throw "Ensaio $($worker.Name) falhou. Consulte o arquivo .log da pasta do relatório."}
    return $output
}

$snapshotSql=@'
select jsonb_build_object(
 'products',(select count(*) from public.products),
 'movements',(select count(*) from public.stock_movements),
 'boxes',(select sum(quantity) from public.stock_balances where unit_type='box' and status_code in('awaiting_test','released_for_sale','in_stock')),
 'balances_hash',(select md5(coalesce(string_agg(to_jsonb(b)::text,'' order by id),'')) from public.stock_balances b),
 'movements_hash',(select md5(coalesce(string_agg(to_jsonb(m)::text,'' order by id),'')) from public.stock_movements m),
 'profiles_hash',(select md5(coalesce(string_agg(to_jsonb(p)::text,'' order by id),'')) from public.profiles p)
);
'@
# O nome é gerado aqui; nenhum nome de schema é recebido do usuário.
$testSchema='liber_test_'+[guid]::NewGuid().ToString('N')
$report['scope']='Committed race using isolated table/function copies, not the public RPC endpoint.'
$report['testSchema']=$testSchema
$schemaCreated=$false
try{
    Write-Host 'Teste NOVO: primeira retirada confirmada; segunda deve ser recusada.'
    Write-Host 'Usa tabelas isoladas; nenhum saldo público será retirado.'
    $secret=Read-Host 'Senha do BANCO Supabase (oculta)' -AsSecureString
    $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    $env:PGPASSWORD=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $env:PGSSLMODE='verify-full'
    $env:PGSSLROOTCERT=$certificate
    $env:PGCONNECT_TIMEOUT='15'
    $env:PGOPTIONS='-c statement_timeout=20000 -c idle_in_transaction_session_timeout=20000'
    $baseline=(Complete-PgWorker (Start-PgWorker 'baseline' $snapshotSql)).Trim()|ConvertFrom-Json
    $setupSql=@"
begin;
create schema $testSchema;
revoke all on schema $testSchema from public;
create table $testSchema.stock_balances (like public.stock_balances including all);
create table $testSchema.stock_movements (like public.stock_movements including all);
-- LIKE não copia triggers/FKs. Não compartilhar defaults de sequências.
do `$setup`$ declare definition text; begin
 if exists(select 1 from pg_attrdef d where d.adrelid in
  ('$testSchema.stock_balances'::regclass,'$testSchema.stock_movements'::regclass)
  and pg_get_expr(d.adbin,d.adrelid) like '%nextval%') then
  raise exception 'Ensaio interrompido: default de sequência compartilhada.';
 end if;
 definition:=pg_get_functiondef('public.register_stock_outflow(text,text,text,integer,text,text,text,uuid)'::regprocedure);
 definition:=replace(definition,'public.register_stock_outflow(', '$testSchema.register_stock_outflow(');
 definition:=replace(definition,'public.stock_balances','$testSchema.stock_balances');
 definition:=replace(definition,'public.stock_movements','$testSchema.stock_movements');
 if position('public.stock_balances' in definition)>0 or position('public.stock_movements' in definition)>0
  or position('$testSchema.register_stock_outflow(' in definition)=0 then
  raise exception 'Não foi possível isolar a função.';
 end if;
 execute definition;
end `$setup`$;
revoke all on function $testSchema.register_stock_outflow(text,text,text,integer,text,text,text,uuid) from public,anon;
grant usage on schema $testSchema to authenticated;
grant execute on function $testSchema.register_stock_outflow(text,text,text,integer,text,text,text,uuid) to authenticated;
commit;
"@
    # Tentar limpeza mesmo se a confirmação do setup se perder após o COMMIT.
    $schemaCreated=$true
    [void](Complete-PgWorker (Start-PgWorker 'setup' $setupSql))
    $checks=@()
    foreach($category in @('shocks','springs')){
        $springCondition=if($category -eq 'springs'){"p.code ~ '^(MGM|MFI|MRE|MFR)-'"}else{"p.code ~ '^(AGM|AFI|ARE|AFR)-'"}
        $targetSql=@"
select jsonb_build_object('actor',(select id from public.profiles where is_active and role='administrator' and nullif(trim(display_name),'') is not null limit 1),
 'product',p.id,'code',p.code,'location',l.code,'location_id',l.id,
 'status',case when '$category'='springs' then 'in_stock' else 'released_for_sale' end)
from public.products p cross join lateral(select id,code from public.locations where is_active order by code limit 1) l
where $springCondition order by p.code limit 1;
"@
        $target=(Complete-PgWorker (Start-PgWorker ($category+'-target') $targetSql)).Trim()|ConvertFrom-Json
        if(!$target.actor -or !$target.product){throw "Sem conta/cadastro para testar $category."}
        $actor=([guid]$target.actor).ToString()
        $product=([guid]$target.product).ToString()
        $locationId=([guid]$target.location_id).ToString()
        $code=SqlLiteral $target.code
        $location=SqlLiteral $target.location
        $status=SqlLiteral $target.status
        $winnerId=[guid]::NewGuid().ToString()
        $loserId=[guid]::NewGuid().ToString()
        [void](Complete-PgWorker (Start-PgWorker ($category+'-seed') "insert into $testSchema.stock_balances(product_id,location_id,status_code,unit_type,quantity) values('$product','$locationId',$status,'box',1);"))
        $prefix=@"
begin;
select set_config('request.jwt.claim.sub','$actor',true);
select set_config('request.jwt.claims',jsonb_build_object('sub','$actor','role','authenticated')::text,true);
set local role authenticated;
"@
        $readyFile=(Join-Path $reportDirectory ($category+'-ready.txt')).Replace('\','/')
        if($readyFile.Contains("'")){throw 'Caminho não suportado.'}
        $winnerSql=$prefix+@"

select $testSchema.register_stock_outflow($code,$location,$status,1,'discard','ENSAIO ISOLADO','COMMIT-RACE','$winnerId');
\o '$readyFile'
select 'WINNER_LOCKED';
\o
select pg_sleep(6);
commit;
select 'WINNER_COMMITTED';
"@
        Write-Host "Testando $category com duas conexões..."
        $winner=Start-PgWorker ($category+'-winner') $winnerSql
        $watch=[Diagnostics.Stopwatch]::StartNew()
        $ready=$false
        while($watch.Elapsed.TotalSeconds -lt 15){
            if((Test-Path -LiteralPath $readyFile) -and ((Get-Content -Raw -LiteralPath $readyFile) -match 'WINNER_LOCKED')){$ready=$true;break}
            if($winner.Process.HasExited){break}
            Start-Sleep -Milliseconds 100
        }
        if(!$ready){[void](Complete-PgWorker $winner);throw 'Primeira conexão não confirmou o bloqueio.'}
        # NOWAIT prova que o bloqueio existe quando a segunda conexão entra.
        # Em seguida, ela aguarda a primeira confirmar e precisa receber P0001.
        $loserSql=$prefix+@"

set local lock_timeout='10s';
do `$loser`$ declare actual_state text:='00000'; begin
 begin
  perform 1 from $testSchema.stock_balances where product_id='$product' for update nowait;
 exception when lock_not_available then actual_state:='55P03'; end;
 if actual_state<>'55P03' then raise exception 'A segunda conexão não encontrou o bloqueio esperado.'; end if;
 actual_state:='00000';
 begin
  perform $testSchema.register_stock_outflow($code,$location,$status,1,'discard','ENSAIO ISOLADO','COMMIT-RACE','$loserId');
 exception when others then get stacked diagnostics actual_state=returned_sqlstate; end;
 if actual_state<>'P0001' then raise exception 'Esperado saldo insuficiente após COMMIT; recebido %',actual_state; end if;
end `$loser`$;
rollback;
select 'LOSER_REJECTED_AFTER_COMMIT';
"@
        # O probe NOWAIT precisa apenas ler/bloquear a tabela isolada como authenticated.
        [void](Complete-PgWorker (Start-PgWorker ($category+'-probe-grant') "grant select,update on $testSchema.stock_balances to authenticated;"))
        $loser=Complete-PgWorker (Start-PgWorker ($category+'-loser') $loserSql)
        $winnerOutput=Complete-PgWorker $winner
        if($loser -notmatch 'LOSER_REJECTED_AFTER_COMMIT' -or $winnerOutput -notmatch 'WINNER_COMMITTED'){throw 'Confirmações ausentes.'}
        # Reenvio após COMMIT: mesma requisição retorna o evento já salvo.
        $retrySql=$prefix+@"

select $testSchema.register_stock_outflow($code,$location,$status,1,'discard','ENSAIO ISOLADO','COMMIT-RACE','$winnerId');
commit;
do `$verify`$ begin
 if (select count(*) from $testSchema.stock_movements where product_id='$product')<>1
  or exists(select 1 from $testSchema.stock_balances where product_id='$product')
  or not exists(select 1 from $testSchema.stock_movements where outflow_request_id='$winnerId') then
  raise exception 'Saldo ou número de eventos incorreto.';
 end if;
end `$verify`$;
select 'ONE_EVENT_ZERO_BALANCE';
"@
        $retry=Complete-PgWorker (Start-PgWorker ($category+'-retry') $retrySql)
        if($retry -notmatch 'ONE_EVENT_ZERO_BALANCE'){throw 'Reenvio sem verificação.'}
        $checks+=@("${category}_winner_committed","${category}_loser_rejected_after_commit","${category}_retry_one_event")
    }
    $report['checks']=$checks
    $report.status='checks_passed_cleanup_pending'
}catch{
    $report.status='failed'
    $report['error']=$_.Exception.Message
    throw
}finally{
    foreach($worker in $workers){try{if(!$worker.Process.HasExited){$worker.Process.Kill();$worker.Process.WaitForExit(5000)|Out-Null}}catch{}}
    try{
        if($schemaCreated){
            # Somente o nome UUID gerado por esta execução pode ser removido.
            if($testSchema -notmatch '^liber_test_[a-f0-9]{32}$'){throw 'Nome de schema inválido.'}
            [void](Complete-PgWorker (Start-PgWorker 'cleanup' "drop schema if exists $testSchema cascade;"))
            $report['isolatedSchemaRemoved']=$true
        }
        if($baseline){
            $after=(Complete-PgWorker (Start-PgWorker 'after' $snapshotSql)).Trim()|ConvertFrom-Json
            $report['baseline']=$baseline
            $report['after']=$after
            foreach($field in @('products','movements','boxes','balances_hash','movements_hash','profiles_hash')){
                if($baseline.$field -ne $after.$field){throw "Dados públicos mudaram em $field; revisar atividade externa, sem corrigir automaticamente."}
            }
        }
        if($report.status -eq 'checks_passed_cleanup_pending'){$report.status='passed';Write-Host 'PASSOU: COMMIT, recusa concorrente e reenvio nas duas categorias; estoque público preservado.'}
    }catch{$report.status='failed';$report['cleanupOrVerificationError']=$_.Exception.Message;Write-Warning $_.Exception.Message}
    $report|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $reportDirectory 'report.json') -Encoding UTF8
    foreach($worker in $workers){$worker.Process.Dispose()}
    if($pointer -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}
    if($secret){$secret.Dispose()}
    foreach($name in $previousEnvironment.Keys){[Environment]::SetEnvironmentVariable($name,$previousEnvironment[$name],'Process')}
    Write-Host "Relatório privado: $reportDirectory"
}
