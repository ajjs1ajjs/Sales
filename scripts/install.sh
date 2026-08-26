#!/usr/bin/env bash
#
# Game Sales Aggregator - one-line installer/runner for Ubuntu / Debian.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/ajjs1ajjs/Sales/main/scripts/install.sh | bash
#   bash scripts/install.sh            # build + preview server
#   bash scripts/install.sh --dev      # Vite dev server
#
# Everything missing is installed automatically: Node.js 22 (NodeSource)
# and project dependencies via npm ci. Fetches fresh deals data, builds
# dist/ and starts a local server.
#
# Telegram notifications are skipped automatically when TELEGRAM_BOT_TOKEN /
# TELEGRAM_CHAT_ID are not set.

set -euo pipefail

DEV=0
for arg in "$@"; do
    case "$arg" in
        --dev) DEV=1 ;;
    esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log()  { printf '\033[1;36m[Sales]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[Sales]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[Sales]\033[0m %s\n' "$*" >&2; exit 1; }

ensure_node() {
    if command -v npm >/dev/null 2>&1; then
        return 0
    fi
    log "npm not found - installing Node.js 22..."
    if command -v apt-get >/dev/null 2>&1 && command -v curl >/dev/null 2>&1; then
        if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi
        curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO bash -
        $SUDO apt-get install -y nodejs || fail "Node.js installation failed. Install it manually: https://nodejs.org"
    else
        fail "Need apt-get + curl to auto-install Node.js, or install Node.js 20+ manually and re-run."
    fi
    command -v npm >/dev/null 2>&1 || fail "Node.js installed but 'npm' is not on PATH yet. Open a new shell and re-run."
}

cd "$REPO_ROOT"

log "Node $(node --version), npm $(npm --version)"
log "Installing dependencies..."
npm ci

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
    warn "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set - Telegram notifications will be skipped."
fi
log "Fetching fresh deals data..."
npx tsx scripts/fetch-deals.ts || warn "fetch-deals failed (offline?) - continuing with existing data."

if [ "$DEV" -eq 1 ]; then
    log "Starting Vite dev server on http://localhost:5173 ..."
    exec npm run dev
fi

log "Building production bundle..."
npm run build

log "==============================================="
log " Game Sales Aggregator is ready"
log "   Build output: $REPO_ROOT/dist"
log "   Serving at:   http://localhost:4173"
log "==============================================="
exec npm run preview
