$ErrorActionPreference = 'Continue'
Set-StrictMode -Version Latest

$tool = [Environment]::GetEnvironmentVariable('LIGHTBI_ESIGNER_CKA_TOOL')
$masterKey = [Environment]::GetEnvironmentVariable('LIGHTBI_ESIGNER_MASTER_KEY')
$workingRoot = [Environment]::GetEnvironmentVariable('LIGHTBI_ESIGNER_WORKING_ROOT')

if ($tool -and (Test-Path $tool)) {
  try { $null = & $tool unload 2>&1 } catch {}
}
if ($masterKey -and (Test-Path $masterKey)) {
  Remove-Item $masterKey -Force -ErrorAction SilentlyContinue
}
if ($workingRoot -and (Test-Path $workingRoot)) {
  Remove-Item $workingRoot -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host 'eSigner CKA ephemeral runner material cleaned.'
