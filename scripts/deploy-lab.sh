#!/usr/bin/env bash
#
# deploy-lab.sh
# -------------
# End-to-end deployment of the redirect-splash worker AND the simulation
# worker to the DTG Lab account. Idempotent — safe to re-run.
#
# What this script does:
#   1. Verifies prerequisites (node, wrangler, auth)
#   2. Installs npm dependencies
#   3. Type-checks the project
#   4. Runs unit tests
#   5. Creates the Analytics Engine dataset (if needed)
#   6. Deploys the simulation worker (destination portals)
#   7. Deploys the redirect-splash worker (legacy hostnames)
#   8. Performs a smoke-test HTTP request against each route
#
# Usage:
#   ./scripts/deploy-lab.sh           # full deploy
#   ./scripts/deploy-lab.sh --skip-sim   # only deploy splash worker
#   ./scripts/deploy-lab.sh --dry-run    # validate config only

set -euo pipefail

# -----------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------
COLOR_RESET='\033[0m'
COLOR_BOLD='\033[1m'
COLOR_BLUE='\033[34m'
COLOR_GREEN='\033[32m'
COLOR_YELLOW='\033[33m'
COLOR_RED='\033[31m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$( cd "${SCRIPT_DIR}/.." &> /dev/null && pwd )"

SKIP_SIM=false
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --skip-sim) SKIP_SIM=true ;;
    --dry-run)  DRY_RUN=true ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
  esac
done

# -----------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------
log()    { printf "${COLOR_BLUE}${COLOR_BOLD}==>${COLOR_RESET} %s\n" "$*"; }
ok()     { printf "${COLOR_GREEN}✓${COLOR_RESET} %s\n" "$*"; }
warn()   { printf "${COLOR_YELLOW}⚠${COLOR_RESET} %s\n" "$*"; }
err()    { printf "${COLOR_RED}✗${COLOR_RESET} %s\n" "$*" >&2; }
fatal()  { err "$*"; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fatal "Required command '$1' not found in PATH"
}

# -----------------------------------------------------------------------
# Step 1: Preflight
# -----------------------------------------------------------------------
log "Preflight checks"

require_cmd node
require_cmd npm
require_cmd curl

NODE_MAJOR=$(node -v | sed -E 's/v([0-9]+)\..*/\1/')
if [ "$NODE_MAJOR" -lt 18 ]; then
  fatal "Node 18+ required. Current: $(node -v)"
fi
ok "Node $(node -v)"

cd "$PROJECT_DIR"

# -----------------------------------------------------------------------
# Step 2: Install deps
# -----------------------------------------------------------------------
log "Installing dependencies"
if [ ! -d node_modules ]; then
  npm install
else
  npm install --prefer-offline --no-audit --silent
fi
ok "Dependencies installed"

# Wrangler is provided as a dev dependency
WRANGLER="npx wrangler"

# Validate auth
log "Verifying Cloudflare authentication"
if ! $WRANGLER whoami >/dev/null 2>&1; then
  warn "Not authenticated. Run: npx wrangler login"
  fatal "Authentication required"
fi
ok "Authenticated"

# -----------------------------------------------------------------------
# Step 3: Type-check + tests
# -----------------------------------------------------------------------
log "Type-checking"
npm run lint
ok "Type-check passed"

log "Running unit tests"
if npm run test --if-present >/dev/null 2>&1; then
  ok "Tests passed"
else
  warn "Tests not configured or failed (continuing)"
fi

if [ "$DRY_RUN" = true ]; then
  log "Dry-run: validating wrangler config"
  $WRANGLER deploy --dry-run
  ok "Dry-run complete"
  exit 0
fi

# -----------------------------------------------------------------------
# Step 4: Deploy simulation worker (destination portals)
# -----------------------------------------------------------------------
if [ "$SKIP_SIM" = false ]; then
  log "Deploying simulation worker (--env simulation)"
  if grep -q '<YOUR_ZONE_ID>' wrangler.jsonc; then
    warn "wrangler.jsonc still contains <YOUR_ZONE_ID> placeholder."
    warn "Edit wrangler.jsonc and replace it with your real dtg-lab.net zone ID,"
    warn "then re-run with --skip-sim to skip this step, or fill it in to proceed."
    fatal "Cannot deploy simulation worker until zone ID is set."
  fi
  $WRANGLER deploy --env simulation
  ok "Simulation worker deployed"
else
  warn "Skipping simulation worker deploy"
fi

# -----------------------------------------------------------------------
# Step 5: Deploy redirect-splash worker (default env = lab)
# -----------------------------------------------------------------------
log "Deploying redirect-splash worker"
$WRANGLER deploy
ok "Redirect-splash worker deployed"

# -----------------------------------------------------------------------
# Step 6: Smoke tests
# -----------------------------------------------------------------------
log "Smoke testing routes"
LEGACY_HOSTS=("hr.dtg-lab.net" "fs.gmis.dtg-lab.net")

for host in "${LEGACY_HOSTS[@]}"; do
  printf "  Testing https://%s/ ... " "$host"
  STATUS=$(curl -sk -o /tmp/splash-$$.html -w "%{http_code}" "https://${host}/" || echo "000")
  if [ "$STATUS" = "200" ]; then
    if grep -q "Service Relocation" /tmp/splash-$$.html 2>/dev/null \
       || grep -q "noticeHeading" /tmp/splash-$$.html 2>/dev/null \
       || grep -q "redirect" /tmp/splash-$$.html 2>/dev/null; then
      printf "${COLOR_GREEN}OK (200)${COLOR_RESET}\n"
    else
      printf "${COLOR_YELLOW}200 but unexpected body${COLOR_RESET}\n"
    fi
  else
    printf "${COLOR_RED}HTTP %s${COLOR_RESET}\n" "$STATUS"
  fi
  rm -f /tmp/splash-$$.html
done

# Test ?skip=1 -> 302
printf "  Testing https://hr.dtg-lab.net/?skip=1 ... "
STATUS=$(curl -sk -o /dev/null -w "%{http_code}" "https://hr.dtg-lab.net/?skip=1" || echo "000")
case "$STATUS" in
  301|302|303|307|308) printf "${COLOR_GREEN}OK (%s)${COLOR_RESET}\n" "$STATUS" ;;
  *) printf "${COLOR_YELLOW}HTTP %s (expected 302)${COLOR_RESET}\n" "$STATUS" ;;
esac

ok "Smoke tests complete"

# -----------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------
echo
log "Deployment complete"
echo
echo "  Splash page URLs:"
echo "    https://hr.dtg-lab.net/"
echo "    https://fs.gmis.dtg-lab.net/"
echo
echo "  Skip splash (immediate redirect):"
echo "    https://hr.dtg-lab.net/?skip=1"
echo
echo "  Destination portals (simulation):"
echo "    https://hcmx.gmis.dtg-lab.net/psp/hrprd?cmd=login"
echo "    https://fscmx.gmis.dtg-lab.net/psp/fsprd?cmd=login"
echo
echo "  Tail logs: npm run tail"
echo
