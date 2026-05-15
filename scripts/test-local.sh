#!/usr/bin/env bash
#
# test-local.sh
# -------------
# Starts wrangler dev locally and prints test URLs that exercise each
# code path. Useful for iterating on the splash page UI before deploy.
#
# The worker normally matches on the Host header. Locally we use a
# custom Host header to simulate each legacy hostname.
#
# Usage:
#   ./scripts/test-local.sh
#
# Then in another terminal:
#   curl -H 'Host: hr.dtg-lab.net' http://localhost:8787/
#

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$( cd "${SCRIPT_DIR}/.." &> /dev/null && pwd )"

cd "$PROJECT_DIR"

cat <<'EOF'
======================================================================
 Local Development — Redirect Splash Worker
======================================================================

This will start `wrangler dev` on http://localhost:8787

When it's running, open another terminal and try:

  # Render splash page for HR
  curl -i -H 'Host: hr.dtg-lab.net' http://localhost:8787/

  # Render splash page for Finance
  curl -i -H 'Host: fs.gmis.dtg-lab.net' http://localhost:8787/

  # Skip splash (immediate redirect)
  curl -i -H 'Host: hr.dtg-lab.net' http://localhost:8787/?skip=1

  # Health check
  curl -i http://localhost:8787/__health

  # Force a specific variant (QA)
  curl -i -H 'Host: hr.dtg-lab.net' 'http://localhost:8787/?variant=A'
  curl -i -H 'Host: hr.dtg-lab.net' 'http://localhost:8787/?variant=B'
  curl -i -H 'Host: hr.dtg-lab.net' 'http://localhost:8787/?variant=C'

  # Force a specific language
  curl -i -H 'Host: hr.dtg-lab.net' 'http://localhost:8787/?lang=es'

To view in browser, add to /etc/hosts (requires sudo):
  127.0.0.1   hr.dtg-lab.net.local
  127.0.0.1   fs.gmis.dtg-lab.net.local

Then visit http://hr.dtg-lab.net.local:8787/  (and edit config.ts to add
those `.local` hosts to REDIRECT_MAP for testing).

Press Ctrl+C to stop.

======================================================================

EOF

exec npx wrangler dev --port 8787
