# Testes locais: não solicitam senha e não conectam ao Supabase.
$ErrorActionPreference = 'Stop'
$tokens = $null
$parseErrors = $null
$sourcePath = Join-Path $PSScriptRoot 'backup-database.ps1'
$syntax = [Management.Automation.Language.Parser]::ParseFile($sourcePath, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw ($parseErrors.Message -join '; ') }
$function = $syntax.Find({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Invoke-BackupTool' }, $true)
Invoke-Expression $function.Extent.Text
$testDirectory = Join-Path $env:TEMP ('liber-backup-check-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testDirectory | Out-Null
$nodeExecutable = (Get-Command node).Source
$warningLog = Join-Path $testDirectory 'warning.log'
Invoke-BackupTool -Executable $nodeExecutable -ToolArguments @('-e', "process.stderr.write('aviso');") -ErrorLog $warningLog
if ((Get-Content -Raw -LiteralPath $warningLog) -ne 'aviso') { throw 'Aviso não preservado.' }
$failed = $false
try { Invoke-BackupTool -Executable $nodeExecutable -ToolArguments @('-e', 'process.exit(7)') -ErrorLog (Join-Path $testDirectory 'error.log') }
catch { $failed = $true }
if (-not $failed) { throw 'Código de saída não zero deveria falhar.' }

$toolsRoot = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'tools/pgsql/bin'
foreach ($item in @(@('connectionArgs', 'pg_dump.exe'), @('roleConnectionArgs', 'pg_dumpall.exe'))) {
    $name = $item[0]
    $assignment = $syntax.Find({ param($node) $node -is [Management.Automation.Language.AssignmentStatementAst] -and $node.Left.Extent.Text -eq ('$' + $name) }.GetNewClosure(), $true)
    Invoke-Expression $assignment.Extent.Text
    $arguments = @(Get-Variable -Name $name -ValueOnly | ForEach-Object {
        if ($_ -like '--host=*') { '--host=127.0.0.1' }
        elseif ($_ -like '--port=*') { '--port=1' }
        else { $_ }
    })
    $log = Join-Path $testDirectory ($item[1] + '.log')
    # A porta local fechada impede qualquer exportação, mas permite validar o parser real.
    try { Invoke-BackupTool -Executable (Join-Path $toolsRoot $item[1]) -ToolArguments $arguments -ErrorLog $log }
    catch { }
    $message = Get-Content -Raw -LiteralPath $log
    if ($message -match 'illegal option|unrecognized option|invalid option' -or $message -notmatch 'connection to server') { throw "Parâmetros rejeitados por $($item[1]): $message" }
}
Write-Output 'OK: sintaxe, aviso com saída zero, falha com saída não zero e parâmetros aceitos pelas duas ferramentas. Nenhuma senha usada ou conexão ao Supabase realizada.'
