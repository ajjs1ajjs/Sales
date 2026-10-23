function Get-ReleaseDiffState([int]$ExitCode) {
  if ($ExitCode -eq 0) { return 'unchanged' }
  if ($ExitCode -eq 1) { return 'changed' }
  throw "git diff --cached failed ($ExitCode)."
}

function Assert-ReleaseCommandSucceeded([int]$ExitCode, [string]$Operation) {
  if ($ExitCode -ne 0) { throw "$Operation failed ($ExitCode)." }
}

function Test-ReleaseVersion([string]$Version) {
  return $Version -cmatch '^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$'
}

Export-ModuleMember -Function Get-ReleaseDiffState, Assert-ReleaseCommandSucceeded, Test-ReleaseVersion
