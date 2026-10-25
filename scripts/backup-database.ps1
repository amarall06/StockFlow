# Exportação somente de leitura. A senha nunca é escrita no comando ou no arquivo.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$outputsRoot = Split-Path $projectRoot -Parent
$toolsRoot = Join-Path $outputsRoot 'tools'
$dumpTool = Join-Path $toolsRoot 'pgsql/bin/pg_dump.exe'
$rolesTool = Join-Path $toolsRoot 'pgsql/bin/pg_dumpall.exe'
$restoreTool = Join-Path $toolsRoot 'pgsql/bin/pg_restore.exe'
$rootCertificate = Join-Path $toolsRoot 'liber-postgres-ca.pem'
foreach ($requiredFile in @($dumpTool, $rolesTool, $restoreTool, $rootCertificate)) {
    if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
        throw "Ferramenta ou certificado ausente: $requiredFile"
    }
}

# Caminho fora do repositório: o backup pode conter dados privados e contas.
$backupRoot = Join-Path $outputsRoot 'Backups/Supabase'
$backupDirectory = Join-Path $backupRoot ((Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0, 6))
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$dumpPath = Join-Path $backupDirectory 'database.dump'
$rolesPath = Join-Path $backupDirectory 'roles.sql'
$manifestPath = Join-Path $backupDirectory 'manifest.json'
$manifest = [ordered]@{
    project = 'tfatagbhmkeelbvstcvb'
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
    status = 'incomplete'
    restoreTested = $false
    coverage = 'Logical database export and role definitions without role passwords. Storage files and platform settings require separate backup.'
}
$manifest | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding UTF8

# A conexão Session pooler foi conferida no painel do projeto; suporta rede IPv4.
$connectionArgs = @('--host=aws-0-us-east-1.pooler.supabase.com', '--port=5432', '--username=postgres.tfatagbhmkeelbvstcvb', '--database=postgres', '--no-password')
$previousEnvironment = @{}
foreach ($variableName in @('PGPASSWORD', 'PGSSLMODE', 'PGSSLROOTCERT', 'PGCONNECT_TIMEOUT', 'PGOPTIONS')) {
    $previousEnvironment[$variableName] = [Environment]::GetEnvironmentVariable($variableName, 'Process')
}
$secret = $null
$passwordPointer = [IntPtr]::Zero
try {
    Write-Host 'Backup de leitura do banco LIBER. Não digite a senha do login do site.'
    $secret = Read-Host 'Senha do BANCO do Supabase (entrada oculta)' -AsSecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $env:PGSSLMODE = 'verify-full'
    $env:PGSSLROOTCERT = $rootCertificate
    $env:PGCONNECT_TIMEOUT = '20'
    # Impede escrita no banco mesmo se uma configuração local tentar mudá-la.
    $env:PGOPTIONS = '-c default_transaction_read_only=on'

    Write-Host 'Exportando banco...'
    & $dumpTool @connectionArgs '--format=custom' '--lock-wait-timeout=15s' "--file=$dumpPath" 2> (Join-Path $backupDirectory 'database-errors.log')
    if ($LASTEXITCODE -ne 0) { throw 'A exportação do banco falhou. Confira database-errors.log na pasta indicada abaixo.' }

    Write-Host 'Exportando definições de cargos, sem senhas...'
    # --database escolhe o banco inicial usado pela ferramenta para consultar os cargos.
    $roleConnectionArgs = @('--host=aws-0-us-east-1.pooler.supabase.com', '--port=5432', '--username=postgres.tfatagbhmkeelbvstcvb', '--database=postgres', '--no-password')
    & $rolesTool @roleConnectionArgs '--roles-only' '--no-role-passwords' "--file=$rolesPath" 2> (Join-Path $backupDirectory 'roles-errors.log')
    if ($LASTEXITCODE -ne 0) { throw 'As definições de cargos não foram exportadas. Confira roles-errors.log; o backup continua incompleto.' }

    # Lê o índice do arquivo local. Não se conecta a um destino nem restaura dados.
    & $restoreTool '--list' $dumpPath 1> (Join-Path $backupDirectory 'contents.list') 2> (Join-Path $backupDirectory 'validation-errors.log')
    if ($LASTEXITCODE -ne 0) { throw 'O arquivo exportado não passou na verificação de leitura.' }
    $manifest.status = 'exported'
    $manifest['databaseSha256'] = (Get-FileHash -LiteralPath $dumpPath -Algorithm SHA256).Hash
    $manifest['rolesSha256'] = (Get-FileHash -LiteralPath $rolesPath -Algorithm SHA256).Hash
    $manifest | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    Write-Host 'Exportação concluída e índice legível. A restauração em ambiente separado ainda precisa ser testada.'
}
catch {
    $manifest.status = 'failed'
    $manifest | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    throw
}
finally {
    if ($passwordPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer) }
    if ($null -ne $secret) { $secret.Dispose() }
    foreach ($variableName in $previousEnvironment.Keys) {
        [Environment]::SetEnvironmentVariable($variableName, $previousEnvironment[$variableName], 'Process')
    }
    Write-Host "Pasta privada do backup: $backupDirectory"
    Write-Host 'Não envie os arquivos de backup ao GitHub nem ao chat.'
}
