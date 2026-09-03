param(
  [Parameter(Mandatory = $true)][ValidateSet('sandbox','product')][string]$Mode,
  [Parameter(Mandatory = $true)][string]$ExpectedSubject,
  [Parameter(Mandatory = $true)][string]$GithubEnvPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Require-EnvironmentSecret([string]$Name) {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) { throw "Required eSigner secret is missing: $Name" }
  return $value
}

$username = Require-EnvironmentSecret 'SSL_COM_ESIGNER_USERNAME'
$password = Require-EnvironmentSecret 'SSL_COM_ESIGNER_PASSWORD'
$totpSecret = Require-EnvironmentSecret 'SSL_COM_ESIGNER_TOTP_SECRET'
if ([string]::IsNullOrWhiteSpace($ExpectedSubject) -or -not $ExpectedSubject.StartsWith('CN=')) {
  throw 'ExpectedSubject must be the exact product certificate Subject beginning with CN=.'
}

$workingRoot = Join-Path $env:RUNNER_TEMP "lightbi-esigner-cka-$([Guid]::NewGuid().ToString('N'))"
$archive = Join-Path $workingRoot 'esigner-cka.zip'
$extractDir = Join-Path $workingRoot 'archive'
$installDir = Join-Path $workingRoot 'install'
$masterKey = Join-Path $installDir 'master.key'
$ckaTool = Join-Path $installDir 'eSignerCKATool.exe'
New-Item -ItemType Directory -Force -Path $extractDir,$installDir | Out-Null

try {
  Invoke-WebRequest -Uri 'https://ssl.com/download/ssl-com-esigner-cka' -OutFile $archive
  Expand-Archive -Path $archive -DestinationPath $extractDir -Force
  $ckaInstaller = Get-ChildItem $extractDir -Recurse -File -Filter '*.exe' |
    Where-Object { $_.Name -match 'eSigner.*CKA|SSL.*eSigner.*CKA' } |
    Select-Object -First 1
  if (-not $ckaInstaller) { throw 'SSL.com eSigner CKA installer was not found in the official archive.' }

  $installerSignature = Get-AuthenticodeSignature -FilePath $ckaInstaller.FullName
  if ($installerSignature.Status -ne 'Valid' -or -not $installerSignature.SignerCertificate) {
    throw "Downloaded eSigner CKA installer is not Authenticode-valid: $($installerSignature.Status)"
  }
  Write-Host "eSigner CKA installer publisher verified: $($installerSignature.SignerCertificate.Subject)"

  $installArgs = @('/CURRENTUSER','/VERYSILENT','/SUPPRESSMSGBOXES',"/DIR=`"$installDir`"")
  $install = Start-Process -FilePath $ckaInstaller.FullName -ArgumentList $installArgs -Wait -PassThru
  if ($install.ExitCode -ne 0 -or -not (Test-Path $ckaTool)) { throw "eSigner CKA installation failed with exit code $($install.ExitCode)." }

  $null = & $ckaTool config -mode $Mode -user $username -pass $password -totp $totpSecret -key $masterKey -r 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'eSigner CKA account configuration failed.' }
  $null = & $ckaTool unload 2>&1
  $null = & $ckaTool load 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'eSigner CKA certificate load failed.' }

  $loadedCertificates = @(Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert)
  if ($Mode -eq 'product') {
    $certificates = @($loadedCertificates | Where-Object { $_.Subject -eq $ExpectedSubject })
    if ($certificates.Count -ne 1) { throw "Expected exactly one loaded product code-signing certificate for subject '$ExpectedSubject'; found $($certificates.Count)." }
    $certificate = $certificates[0]
  } else {
    $expected = @($loadedCertificates | Where-Object { $_.Subject -eq $ExpectedSubject })
    if ($expected.Count -eq 1) { $certificate = $expected[0] }
    elseif ($loadedCertificates.Count -eq 1) { $certificate = $loadedCertificates[0] }
    else { throw "Sandbox certificate selection is ambiguous; found $($loadedCertificates.Count) loaded code-signing certificates." }
  }

  "LIGHTBI_WINDOWS_PUBLISHER_THUMBPRINT=$($certificate.Thumbprint)" | Out-File -FilePath $GithubEnvPath -Append -Encoding utf8
  "LIGHTBI_ESIGNER_CKA_TOOL=$ckaTool" | Out-File -FilePath $GithubEnvPath -Append -Encoding utf8
  "LIGHTBI_ESIGNER_MASTER_KEY=$masterKey" | Out-File -FilePath $GithubEnvPath -Append -Encoding utf8
  "LIGHTBI_ESIGNER_WORKING_ROOT=$workingRoot" | Out-File -FilePath $GithubEnvPath -Append -Encoding utf8
  Write-Host "eSigner CKA ready: mode=$Mode subject=$($certificate.Subject) thumbprint=$($certificate.Thumbprint)"
}
catch {
  if (Test-Path $ckaTool) { try { $null = & $ckaTool unload 2>&1 } catch {} }
  if (Test-Path $masterKey) { Remove-Item $masterKey -Force -ErrorAction SilentlyContinue }
  Remove-Item $workingRoot -Recurse -Force -ErrorAction SilentlyContinue
  throw
}
