# Ensaio com duas conexões REAIS; todas as retiradas terminam em ROLLBACK.
# Não cria contas, não muda cargos e não grava movimentações permanentes.
[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$outputsRoot=Split-Path $projectRoot -Parent
$psql=Join-Path $outputsRoot 'tools/pgsql/bin/psql.exe'
$certificate=Join-Path $outputsRoot 'tools/liber-postgres-ca.pem'
if(!(Test-Path -LiteralPath $psql) -or !(Test-Path -LiteralPath $certificate)){throw 'Ferramentas PostgreSQL ou certificado ausentes.'}
$reportDirectory=Join-Path $outputsRoot ('verifications/concurrency-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'-'+[guid]::NewGuid().ToString('N').Substring(0,6))
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
try{
    Write-Host 'Ensaio transacional de concorrência: saldos e históricos serão preservados.'
    $secret=Read-Host 'Senha do BANCO Supabase (oculta)' -AsSecureString
    $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    $env:PGPASSWORD=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $env:PGSSLMODE='verify-full'
    $env:PGSSLROOTCERT=$certificate
    $env:PGCONNECT_TIMEOUT='15'
    $env:PGOPTIONS='-c statement_timeout=20000 -c idle_in_transaction_session_timeout=20000'
    $baseline=(Complete-PgWorker (Start-PgWorker 'baseline' $snapshotSql)).Trim()|ConvertFrom-Json
    $targetSql=@'
select jsonb_build_object('actor',(select id from public.profiles where is_active and role='administrator' and nullif(trim(display_name),'') is not null limit 1),
 'code',p.code,'location',l.code,'status',b.status_code,'boxes',b.quantity)
from public.stock_balances b join public.products p on p.id=b.product_id join public.locations l on l.id=b.location_id
where b.unit_type='box' and b.quantity>0 and l.is_active and b.status_code in('awaiting_test','released_for_sale','in_stock')
order by b.quantity,p.code,l.code limit 1;
'@
    $target=(Complete-PgWorker (Start-PgWorker 'target' $targetSql)).Trim()|ConvertFrom-Json
    if(!$target.actor -or !$target.code){throw 'Sem Administrador ativo ou saldo para o ensaio.'}
    $actor=([guid]$target.actor).ToString()
    $boxes=[int]$target.boxes
    if($boxes -lt 1){throw 'Saldo inválido para o ensaio.'}
    $code=SqlLiteral $target.code
    $location=SqlLiteral $target.location
    $status=SqlLiteral $target.status
    $holderRequest=[guid]::NewGuid().ToString()
    $contenderRequest=[guid]::NewGuid().ToString()
    $prefix=@"
begin;
set local statement_timeout='18s';
select set_config('request.jwt.claim.sub','$actor',true);
select set_config('request.jwt.claims',jsonb_build_object('sub','$actor','role','authenticated')::text,true);
set local role authenticated;
"@
    $readyFile=(Join-Path $reportDirectory 'holder-ready.txt').Replace('\','/')
    if($readyFile.Contains("'")){throw 'O caminho do relatório contém caractere não suportado.'}
    $holderSql=$prefix+@"

set local lock_timeout='2s';
do `$holder`$ begin
 perform public.register_stock_outflow($code,$location,$status,$boxes,'discard','OPTEST-CONCORRENCIA-ROLLBACK','OPTEST-HOLDER','$holderRequest'::uuid);
end `$holder`$;
\o '$readyFile'
select 'HOLDER_LOCKED';
\o
select pg_sleep(8);
rollback;
select 'HOLDER_ROLLED_BACK';
"@
    Write-Host 'Conexão A: reservando o saldo dentro de uma transação...'
    $holder=Start-PgWorker 'holder' $holderSql
    $watch=[Diagnostics.Stopwatch]::StartNew()
    $ready=$false
    while($watch.Elapsed.TotalSeconds -lt 18){
        if((Test-Path -LiteralPath $readyFile) -and ((Get-Content -Raw -LiteralPath $readyFile) -match 'HOLDER_LOCKED')){$ready=$true;break}
        if($holder.Process.HasExited){break}
        Start-Sleep -Milliseconds 100
    }
    if(!$ready){[void](Complete-PgWorker $holder);throw 'Conexão A não confirmou o bloqueio. Nenhum resultado de concorrência será declarado.'}
    $contenderSql=$prefix+@"

set local lock_timeout='1200ms';
do `$contender`$ declare actual_state text:='00000'; begin
 begin
  perform public.register_stock_outflow($code,$location,$status,$boxes,'discard','OPTEST-CONCORRENCIA-ROLLBACK','OPTEST-CONTENDER','$contenderRequest'::uuid);
 exception when others then get stacked diagnostics actual_state=returned_sqlstate; end;
 if actual_state<>'55P03' then raise exception 'Esperado bloqueio por concorrência; recebido %',actual_state; end if;
end `$contender`$;
select 'CONTENDER_BLOCKED';
rollback;
"@
    Write-Host 'Conexão B: tentando retirar o mesmo saldo simultaneamente...'
    $contenderOutput=Complete-PgWorker (Start-PgWorker 'contender' $contenderSql)
    $holderOutput=Complete-PgWorker $holder
    if($contenderOutput -notmatch 'CONTENDER_BLOCKED' -or $holderOutput -notmatch 'HOLDER_ROLLED_BACK'){throw 'Confirmações de bloqueio e rollback ausentes.'}
    $retrySql=$prefix+@"

set local lock_timeout='2s';
do `$retry`$ begin
 perform public.register_stock_outflow($code,$location,$status,$boxes,'discard','OPTEST-CONCORRENCIA-ROLLBACK','OPTEST-CONTENDER','$contenderRequest'::uuid);
end `$retry`$;
select 'RETRY_SUCCEEDED';
rollback;
"@
    Write-Host 'Repetindo a tentativa após liberar o bloqueio...'
    $retryOutput=Complete-PgWorker (Start-PgWorker 'retry' $retrySql)
    if($retryOutput -notmatch 'RETRY_SUCCEEDED'){throw 'Retomada sem confirmação.'}
    $after=(Complete-PgWorker (Start-PgWorker 'after' $snapshotSql)).Trim()|ConvertFrom-Json
    foreach($field in @('products','movements','boxes','balances_hash','movements_hash','profiles_hash')){
        if($baseline.$field -ne $after.$field){throw "A conferência final mudou em $field. Não corrigir automaticamente; revisar atividade simultânea e logs."}
    }
    $report.status='passed'
    $report['baseline']=$baseline
    $report['after']=$after
    $report['checks']=@('two_real_connections','row_lock_blocks_second_outflow','retry_after_rollback_succeeds','balances_profiles_and_history_unchanged')
    $report['limits']='Uses rollback in both connections. It does not test a committed winner followed by a rejected loser, nor real browser logins of each role.'
    Write-Host 'PASSOU: bloqueio simultâneo, retomada e preservação dos dados conferidos.'
}catch{
    $report.status='failed'
    $report['error']=$_.Exception.Message
    throw
}finally{
    foreach($worker in $workers){try{if(!$worker.Process.HasExited){$worker.Process.Kill();$worker.Process.WaitForExit(5000)|Out-Null}}catch{}; $worker.Process.Dispose()}
    $report|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $reportDirectory 'report.json') -Encoding UTF8
    if($pointer -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}
    if($secret){$secret.Dispose()}
    foreach($name in $previousEnvironment.Keys){[Environment]::SetEnvironmentVariable($name,$previousEnvironment[$name],'Process')}
    Write-Host "Relatório privado: $reportDirectory"
}
