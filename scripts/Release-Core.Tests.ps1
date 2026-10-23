$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'Release-Core.psm1') -Force

function Assert([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw "Assertion failed: $Message" }
}

Assert ((Get-ReleaseDiffState 0) -eq 'unchanged') 'exit 0 is a no-op'
Assert ((Get-ReleaseDiffState 1) -eq 'changed') 'exit 1 is a staged diff'

$diffFailure = $false
try { Get-ReleaseDiffState 128 | Out-Null } catch { $diffFailure = $true }
Assert $diffFailure 'unexpected diff errors must stop the release'

Assert (Test-ReleaseVersion '1.2.3') 'valid semver accepted'
Assert (-not (Test-ReleaseVersion 'v1.2.3')) 'tag prefix rejected as version input'
Assert (-not (Test-ReleaseVersion '1.02.3')) 'leading zero rejected'

Assert-ReleaseCommandSucceeded 0 'commit'
$pushFailure = $false
try { Assert-ReleaseCommandSucceeded 1 'push' } catch { $pushFailure = $_.Exception.Message -match 'push failed' }
Assert $pushFailure 'failed push must stop the release'

Write-Output 'Release-Core tests passed.'
