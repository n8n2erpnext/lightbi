param(
  [Parameter(Mandatory = $true)][string]$Installer,
  [Parameter(Mandatory = $true)][string]$Output
)

$resolved = (Resolve-Path $Installer).Path
$signature = Get-AuthenticodeSignature -FilePath $resolved
$hash = (Get-FileHash -Algorithm SHA256 -Path $resolved).Hash.ToLowerInvariant()
$evidence = [ordered]@{
  schema_version = "lightbi.windows-publisher-evidence.v1"
  artifact = [System.IO.Path]::GetFileName($resolved)
  sha256 = $hash
  signature_status = [string]$signature.Status
  signer_subject = if ($signature.SignerCertificate) { $signature.SignerCertificate.Subject } else { $null }
  signer_thumbprint = if ($signature.SignerCertificate) { $signature.SignerCertificate.Thumbprint } else { $null }
  generated_at = [DateTime]::UtcNow.ToString("o")
}
$evidence | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 -Path $Output
Write-Host "Authenticode evidence: status=$($evidence.signature_status) subject=$($evidence.signer_subject)"
