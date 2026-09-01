<#
.SYNOPSIS
    Game Sales Aggregator - one-line installer/runner for Windows.

.DESCRIPTION
    Mirrors scripts/install.sh for Ubuntu/Debian. Fully automatic:

      irm https://raw.githubusercontent.com/ajjs1ajjs/Sales/main/scripts/install.ps1 | iex

    Or locally:
      powershell -ExecutionPolicy Bypass -File scripts\install.ps1
      powershell -ExecutionPolicy Bypass -File scripts\install.ps1 -Dev

    What it does (everything missing is installed automatically):
      1. Installs Node.js LTS via winget if npm is not available.
      2. Installs project dependencies (npm ci).
      3. Fetches fresh deals data into public/data/deals.json.
      4. Builds the production bundle (dist/) and generates sitemap.xml.
      5. Starts a local server: -Dev runs the Vite dev server, otherwise
         `vite preview` serves the built dist/.

    Telegram notifications are skipped automatically when the
    TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID environment variables are not set.

.PARAMETER Dev
    Start the Vite dev server instead of serving the production build.
#>
[CmdletBinding()]
param(
    [switch]$Dev
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot

function Log  { param($m) Write-Host "[Sales] $m" -ForegroundColor Cyan }
function Warn { param($m) Write-Host "[Sales] $m" -ForegroundColor Yellow }
function Fail { param($m) Write-Host "[Sales] $m" -ForegroundColor Red; exit 1 }

function Refresh-Path {
    $machinePath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
    $userPath    = [Environment]::GetEnvironmentVariable("PATH", "User")
    $env:PATH = "$machinePath;$userPath"
}

# ------------------------------------------------- auto-install Node.js ------
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Log "npm not found - installing Node.js LTS via winget..."
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        & winget install --id OpenJS.NodeJS.LTS -e --silent `
            --accept-source-agreements --accept-package-agreements | Out-Null
        Refresh-Path
        $env:PATH = "$env:ProgramFiles\nodejs;$env:PATH"
    } else {
        Fail "winget not available. Install Node.js manually from https://nodejs.org and re-run."
    }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Fail "Node.js installed but 'npm' is not on PATH yet. Open a new terminal and re-run."
    }
}
Log "Node $(node --version), npm $(npm --version)"

Set-Location $RepoRoot

# ------------------------------------------------------------- install -------
Log "Installing dependencies..."
npm ci
if ($LASTEXITCODE -ne 0) { Fail "npm ci failed." }

# ------------------------------------------------------------- fetch ---------
if (-not $env:TELEGRAM_BOT_TOKEN -or -not $env:TELEGRAM_CHAT_ID) {
    Warn "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set - Telegram notifications will be skipped."
}
Log "Fetching fresh deals data..."
npx tsx scripts/fetch-deals.ts
if ($LASTEXITCODE -ne 0) { Warn "fetch-deals failed (offline?) - continuing with existing data." }

if ($Dev) {
    Log "Starting Vite dev server on http://localhost:5173 ..."
    npm run dev
    exit $LASTEXITCODE
}

# ------------------------------------------------------------- build ---------
Log "Building production bundle..."
npm run build
if ($LASTEXITCODE -ne 0) { Fail "build failed." }

Log "==============================================="
Log " Game Sales Aggregator is ready"
Log "   Build output: $RepoRoot\dist"
Log "   Serving at:   http://localhost:4173"
Log "==============================================="
npm run preview
