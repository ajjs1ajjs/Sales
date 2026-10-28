# Локальний реліз Sales PWA: перевірки -> збірка -> ідемпотентна публікація в dist/sales.
# Дзеркало .github/workflows/release.yml (той — лише ручний fallback з CI).
# Публікує ТІЛЬКИ якщо збірка відрізняється від живого сайту (дані sales/data/
# належать шедулеру dist і зберігаються). Інакше — ні тега, ні бампа.
#
# ВИМОГА: PowerShell 7+ (pwsh). Windows PowerShell 5.1 некоректно передає
# аргументи з пробілами у native-команди (gh api --jq) і реліз падає.
#
# Використання (pwsh 7+):
#   pwsh -NoProfile -File scripts/Release-Local.ps1   # patch-бамп при реальних змінах
#   pwsh -NoProfile -File scripts/Release-Local.ps1 -Bump minor
#   pwsh -NoProfile -File scripts/Release-Local.ps1 -Version 1.6.0
param(
  [ValidateSet('patch', 'minor', 'major')][string]$Bump = 'patch',
  [string]$Version = '',
  [switch]$Force
)

if ($PSVersionTable.PSVersion.Major -lt 7) {
  Write-Host '::error::Release requires PowerShell 7+ (pwsh): Windows PowerShell 5.1 mis-quotes native arguments (gh api --jq with spaces). Run: pwsh -NoProfile -File scripts/Release-Local.ps1'
  exit 1
}

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$DistRepo = 'ajjs1ajjs/dist'
$Prefix = 'sales-v'

function Fail([string]$msg) { Write-Host "::error::$msg"; exit 1 }
Import-Module (Join-Path $PSScriptRoot 'Release-Core.psm1') -Force

function Test-CachedDiff {
  git diff --cached --quiet 2>$null
  $code = $LASTEXITCODE
  return (Get-ReleaseDiffState $code) -eq 'changed'
}

# --- 0. Передумови -----------------------------------------------------------
foreach ($t in @('gh', 'node', 'npm', 'git')) {
  if (-not (Get-Command $t -ErrorAction SilentlyContinue)) { Fail "$t not found in PATH" }
}
gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'gh not authenticated (gh auth login)' }
if (git status --porcelain) { Fail 'working tree is dirty — commit or stash first' }
$sourceSha = git rev-parse HEAD
Assert-ReleaseCommandSucceeded $LASTEXITCODE 'read source commit'
$tags = gh release list --repo $DistRepo --limit 200 --json tagName --jq '.[].tagName'
Assert-ReleaseCommandSucceeded $LASTEXITCODE 'read release tags'

# --- 1. Наступна версія ------------------------------------------------------
$pattern = "^" + $Prefix + '\d+\.\d+\.\d+$'
if ($Version) {
  $next = $Version
} else {
  $latest = $tags | Where-Object { $_ -match $pattern } | ForEach-Object { $_ -replace ("^" + $Prefix), '' } |
    Sort-Object { [version]$_ } | Select-Object -Last 1
  if (-not $latest) { $latest = '0.0.0' }
  $v = [version]$latest
  switch ($Bump) {
    'major' { $next = "$($v.Major + 1).0.0" }
    'minor' { $next = "$($v.Major).$($v.Minor + 1).0" }
    default { $next = "$($v.Major).$($v.Minor).$($v.Build + 1)" }
  }
}
$tag = "$Prefix$next"
if (-not (Test-ReleaseVersion $next)) { Fail "Invalid release version: $next" }
$reconciling = $false
$releaseQuery = '.[] | select((.body // "") | contains("Source commit: ' + $sourceSha + '"))'
$sourceReleaseJson = gh api --paginate "repos/$DistRepo/releases?per_page=100" --jq $releaseQuery | Select-Object -First 1
Assert-ReleaseCommandSucceeded $LASTEXITCODE 'read existing release metadata'
$sourceRelease = if ($sourceReleaseJson) { $sourceReleaseJson | ConvertFrom-Json } else { $null }
if ($sourceRelease) {
  $reconcileVersion = $sourceRelease.tag_name -replace ("^" + [regex]::Escape($Prefix)), ''
  if (-not (Test-ReleaseVersion $reconcileVersion)) { Fail 'Existing release has an invalid version tag.' }
  $next = $reconcileVersion
  $tag = $sourceRelease.tag_name
  $artifactMatch = [regex]::Match([string]$sourceRelease.body, '(?im)^Artifact commit: ([0-9a-f]{40})\s*$')
  if (-not $artifactMatch.Success) { Fail "Existing release $tag has no artifact commit SHA." }
  $artifactSha = $artifactMatch.Groups[1].Value.ToLowerInvariant()
  $reconciling = $true
}
Write-Host "Candidate tag: $tag"

if (-not $reconciling) {
  $prevPref = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    gh release view $tag --repo $DistRepo 2>$null | Out-Null
    $tagExists = ($LASTEXITCODE -eq 0)
  } finally { $ErrorActionPreference = $prevPref }
  if ($tagExists) { Fail "Release $tag already exists for another source commit." }
}

# --- 1.5. Снапшот даних (тільки для локального прев'ю) -----------------------
# public/data/ НЕ публікується: крок 3 виключає data/ з копіювання, тому живу
# дату на сайті тримає шедулер dist (щогодини). Тут лише попереджаємо, що
# локальний снапшот застарів — на сам реліз це не впливає.
try {
  $deals = Get-Content 'public/data/deals.json' -Raw | ConvertFrom-Json
  $snapshotUtc = [datetimeoffset]::Parse($deals.lastUpdated)
  $ageHours = ([datetimeoffset]::UtcNow - $snapshotUtc).TotalHours
  if ($ageHours -gt 48) {
    Write-Warning ('Локальний снапшот deals.json від {0:yyyy-MM-dd HH:mm} UTC ({1:N0} год тому) — оновіть для прев''ю: npm run fetch' -f $snapshotUtc, $ageHours)
  }
} catch {
  Write-Warning 'Не вдалося прочитати public/data/deals.json — локальний снапшот може бути відсутній.'
}

# --- 2. Перевірки + збірка ---------------------------------------------------
npm ci
if ($LASTEXITCODE -ne 0) { Fail 'npm ci failed' }
npm audit --audit-level=high
if ($LASTEXITCODE -ne 0) { Fail 'npm audit found high+ vulnerabilities' }
npm run lint
if ($LASTEXITCODE -ne 0) { Fail 'lint failed' }
npm test
if ($LASTEXITCODE -ne 0) { Fail 'tests failed' }
# Sitemap генерується щоразу (scripts/generate-sitemap.ts). Завдяки
# .gitattributes (public/sitemap.xml text eol=lf) файл лишається байт-у-байт
# тим самим, тому примусовий checkout більше не потрібен.
npm run build
if ($LASTEXITCODE -ne 0) { Fail 'build failed' }

# --- 3. Публікація в dist (тільки при змінах) --------------------------------
if (-not $reconciling) {
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('dist-sales-{0}' -f [guid]::NewGuid().ToString('N'))
# M3: жодних токенів у командному рядку — автентифікація через credential
# helper у keyring (gh auth), тому тут звичайний clone/push без секретів.
git clone "https://github.com/$DistRepo.git" $tmp --depth 1 --quiet
if ($LASTEXITCODE -ne 0) { Fail 'dist clone failed' }
try {
  New-Item -ItemType Directory -Path "$tmp/sales" -Force | Out-Null
  # Дзеркало dist/sales <- dist/, КРІМ data/ (.nojekyll теж зберігаємо як було).
  robocopy dist "$tmp/sales" /MIR /XD data /XF .nojekyll /NJH /NJS /NDL | Out-Null
  if ($LASTEXITCODE -ge 8) { Fail "robocopy failed ($LASTEXITCODE)" }
  Push-Location $tmp
  git config user.name 'local-release'
  git config user.email 'local-release@localhost'
  git add -A sales
  if (-not (Test-CachedDiff)) {
    $subject = git log -1 --format=%s
    Assert-ReleaseCommandSucceeded $LASTEXITCODE 'read artifact commit message'
    if ($subject -match [regex]::Escape("($tag)") -and $subject -match [regex]::Escape("[source=$sourceSha]")) {
      $artifactSha = git rev-parse HEAD
      Assert-ReleaseCommandSucceeded $LASTEXITCODE 'read recovered artifact commit'
      Write-Host 'Recovered the artifact commit after a partial release failure.'
    } else {
      Write-Host 'No site changes to publish — no tag, no bump. Done.'
      Pop-Location
      exit 0
    }
  } else {
    if (-not $Force) {
      $ans = Read-Host "Publish site build ($tag)? [y/N]"
      if ($ans -ne 'y' -and $ans -ne 'Y') { Pop-Location; Write-Host 'aborted'; exit 0 }
    }
    git commit -m "chore(sales): publish site build ($tag) [source=$sourceSha]"
    Assert-ReleaseCommandSucceeded $LASTEXITCODE 'dist commit'
    $artifactSha = git rev-parse HEAD
    Assert-ReleaseCommandSucceeded $LASTEXITCODE 'read artifact commit'
    git push origin HEAD:main
    Assert-ReleaseCommandSucceeded $LASTEXITCODE 'dist push'
  }
  Pop-Location
  Write-Host "Published $tag build."
} finally {
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
}
} else {
  Write-Host "Reconciling source version for existing release $tag."
}

# --- 4. Тег релізу ------------------------------------------------------------
# Note: gh exits 1 when the release is missing — expected on first publish.
# Temporarily relax the preference so the probe can't terminate the script.
$prevPref = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
  gh release view $tag --repo $DistRepo 2>$null | Out-Null
  $tagExists = ($LASTEXITCODE -eq 0)
} catch {
  $tagExists = $false
} finally {
  $ErrorActionPreference = $prevPref
}
if ($tagExists) {
  $releaseBody = gh release view $tag --repo $DistRepo --json body --jq .body
  Assert-ReleaseCommandSucceeded $LASTEXITCODE 'read existing release notes'
  if ($releaseBody -notmatch "(?im)^Source commit: $([regex]::Escape($sourceSha))\s*$" -or
      $releaseBody -notmatch "(?im)^Artifact commit: $([regex]::Escape($artifactSha))\s*$") {
    Fail "Existing release $tag does not match this source/artifact build. Refusing to reuse it."
  }
  $tagRef = gh api "repos/$DistRepo/git/ref/tags/$tag" | ConvertFrom-Json
  Assert-ReleaseCommandSucceeded $LASTEXITCODE 'read existing release tag target'
  $tagCommitSha = $tagRef.object.sha
  if ($tagRef.object.type -eq 'tag') {
    $tagObject = gh api "repos/$DistRepo/git/tags/$tagCommitSha" | ConvertFrom-Json
    Assert-ReleaseCommandSucceeded $LASTEXITCODE 'resolve annotated release tag'
    $tagCommitSha = $tagObject.object.sha
  }
  if ($tagCommitSha -ne $artifactSha) { Fail "Release tag $tag does not point at artifact commit $artifactSha." }
}
if (-not $tagExists) {
  $prev = $tags | Where-Object { $_ -match $pattern -and $_ -ne $tag } |
    ForEach-Object { $_ -replace ("^" + $Prefix), '' } |
    Sort-Object { [version]$_ } | Select-Object -Last 1
  if ($prev) { $notes = "**Full Changelog**: https://github.com/$DistRepo/compare/$Prefix$prev...$tag" }
  else { $notes = "Game Sales $tag" }
  $notes = "$notes`n`nSource commit: $sourceSha`nArtifact commit: $artifactSha"
  $manifestDir = Join-Path ([IO.Path]::GetTempPath()) ('sales-release-{0}' -f [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $manifestDir | Out-Null
  $manifestPath = Join-Path $manifestDir 'sales-release-manifest.json'
  npx tsx scripts/release-core.ts write-manifest $next $sourceSha $artifactSha $manifestPath
  Assert-ReleaseCommandSucceeded $LASTEXITCODE 'create release provenance'
  gh release create $tag --repo $DistRepo --target $artifactSha --title "Game Sales v$next" --notes $notes
  $createExitCode = $LASTEXITCODE
  if ($createExitCode -ne 0) {
    Remove-Item -LiteralPath $manifestDir -Recurse -Force
    Assert-ReleaseCommandSucceeded $createExitCode 'create release'
  }
  gh release upload $tag $manifestPath --repo $DistRepo --clobber
  $uploadExitCode = $LASTEXITCODE
  Remove-Item -LiteralPath $manifestDir -Recurse -Force
  Assert-ReleaseCommandSucceeded $uploadExitCode 'upload release provenance'
} else {
  $manifestDir = Join-Path ([IO.Path]::GetTempPath()) ('sales-release-{0}' -f [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $manifestDir | Out-Null
  $prevPref = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    gh release download $tag --repo $DistRepo --pattern 'sales-release-manifest.json' --dir $manifestDir
    $downloadExitCode = $LASTEXITCODE
  } catch {
    $downloadExitCode = 1
  } finally {
    $ErrorActionPreference = $prevPref
  }
  if ($downloadExitCode -ne 0) {
    # Recover a release whose tag was created but whose asset upload failed.
    $manifestPath = Join-Path $manifestDir 'sales-release-manifest.json'
    npx tsx scripts/release-core.ts write-manifest $next $sourceSha $artifactSha $manifestPath
    Assert-ReleaseCommandSucceeded $LASTEXITCODE 'recreate release provenance'
    gh release upload $tag $manifestPath --repo $DistRepo --clobber
    $uploadExitCode = $LASTEXITCODE
    Remove-Item -LiteralPath $manifestDir -Recurse -Force
    Assert-ReleaseCommandSucceeded $uploadExitCode 'recover release provenance upload'
  } else {
    npx tsx scripts/release-core.ts verify-manifest (Join-Path $manifestDir 'sales-release-manifest.json') $next $sourceSha $artifactSha
    $verifyExitCode = $LASTEXITCODE
    Remove-Item -LiteralPath $manifestDir -Recurse -Force
    Assert-ReleaseCommandSucceeded $verifyExitCode 'verify existing release provenance'
    Write-Host "Release $tag already exists and matches this source/artifact build."
  }
}

# --- 5. Бамп версії ------------------------------------------------------------
$env:SALES_NEXT_VERSION = $next
node -e "const fs=require('fs');const version=process.env.SALES_NEXT_VERSION;for(const p of ['package.json','package-lock.json']){const j=JSON.parse(fs.readFileSync(p,'utf8'));j.version=version;if(p==='package-lock.json'&&j.packages?.[''])j.packages[''].version=version;fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n');}"
if ($LASTEXITCODE -ne 0) { Fail 'version bump failed' }
git add package.json
git add package-lock.json
if (-not (Test-CachedDiff)) { Write-Host 'no changes'; exit 0 }
git commit -m "chore(release): $tag [skip ci]"
Assert-ReleaseCommandSucceeded $LASTEXITCODE 'source release commit'
git push
Assert-ReleaseCommandSucceeded $LASTEXITCODE 'source release push'
Write-Host "Released $tag"
