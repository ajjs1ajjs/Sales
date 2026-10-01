# Локальний реліз Sales PWA: перевірки -> збірка -> ідемпотентна публікація в dist/sales.
# Дзеркало .github/workflows/release.yml (той — лише ручний fallback з CI).
# Публікує ТІЛЬКИ якщо збірка відрізняється від живого сайту (дані sales/data/
# належать шедулеру dist і зберігаються). Інакше — ні тега, ні бампа.
#
# Використання:
#   .\scripts\Release-Local.ps1                 # patch-бамп при реальних змінах
#   .\scripts\Release-Local.ps1 -Bump minor
#   .\scripts\Release-Local.ps1 -Version 1.6.0
param(
  [ValidateSet('patch', 'minor', 'major')][string]$Bump = 'patch',
  [string]$Version = '',
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$DistRepo = 'ajjs1ajjs/dist'
$Prefix = 'sales-v'

function Fail([string]$msg) { Write-Host "::error::$msg"; exit 1 }

# --- 0. Передумови -----------------------------------------------------------
foreach ($t in @('gh', 'node', 'npm', 'git')) {
  if (-not (Get-Command $t -ErrorAction SilentlyContinue)) { Fail "$t not found in PATH" }
}
gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'gh not authenticated (gh auth login)' }
if (git status --porcelain) { Fail 'working tree is dirty — commit or stash first' }

# --- 1. Наступна версія ------------------------------------------------------
if ($Version) {
  $next = $Version
} else {
  $tags = gh release list --repo $DistRepo --limit 200 --json tagName --jq '.[].tagName'
  if ($LASTEXITCODE -ne 0) { Fail 'gh release list failed' }
  $pattern = "^" + $Prefix + '\d+\.\d+\.\d+$'
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
Write-Host "Candidate tag: $tag"

# --- 2. Перевірки + збірка ---------------------------------------------------
npm ci
if ($LASTEXITCODE -ne 0) { Fail 'npm ci failed' }
npm audit --audit-level=high
if ($LASTEXITCODE -ne 0) { Fail 'npm audit found high+ vulnerabilities' }
npm run lint
if ($LASTEXITCODE -ne 0) { Fail 'lint failed' }
npm test
if ($LASTEXITCODE -ne 0) { Fail 'tests failed' }
npm run build
if ($LASTEXITCODE -ne 0) { Fail 'build failed' }
git checkout -- public/sitemap.xml 2>$null

# --- 3. Публікація в dist (тільки при змінах) --------------------------------
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('dist-sales-{0}' -f [guid]::NewGuid().ToString('N'))
$token = (gh auth token).Trim()
git clone "https://x-access-token:$token@github.com/$DistRepo.git" $tmp --depth 1 --quiet
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
  if (git diff --cached --quiet) {
    Write-Host 'No site changes to publish — no tag, no bump. Done.'
    Pop-Location
    exit 0
  }
  if (-not $Force) {
    $ans = Read-Host "Publish site build ($tag)? [y/N]"
    if ($ans -ne 'y' -and $ans -ne 'Y') { Pop-Location; Write-Host 'aborted'; exit 0 }
  }
  git commit -m "chore(sales): publish site build ($tag)"
  git push origin HEAD:main
  Pop-Location
  Write-Host "Published $tag build."
} finally {
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
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
if (-not $tagExists) {
  $prev = $tags | Where-Object { $_ -match $pattern -and $_ -ne $tag } |
    ForEach-Object { $_ -replace ("^" + $Prefix), '' } |
    Sort-Object { [version]$_ } | Select-Object -Last 1
  if ($prev) { $notes = "**Full Changelog**: https://github.com/$DistRepo/compare/$Prefix$prev...$tag" }
  else { $notes = "Game Sales $tag" }
    gh release create $tag --repo $DistRepo --title "Game Sales v$next" --notes $notes
  if ($LASTEXITCODE -ne 0) { Fail 'gh release failed' }
} else {
  Write-Host "Release $tag already exists."
}

# --- 5. Бамп версії ------------------------------------------------------------
node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('package.json','utf8'));j.version='$next';fs.writeFileSync('package.json',JSON.stringify(j,null,2)+'\n');"
git add package.json
if (git diff --cached --quiet) { Write-Host 'no changes'; exit 0 }
git commit -m "chore(release): $tag [skip ci]"
git push
Write-Host "Released $tag"
