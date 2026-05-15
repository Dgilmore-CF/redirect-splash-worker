#!/usr/bin/env bash
#
# setup-dns.sh
# ------------
# Creates the placeholder DNS records the Workers need to attach to.
# Custom Domains require a proxied record to exist before they can be
# bound. We create lightweight A records pointing to 192.0.2.1 (TEST-NET-1)
# which is unroutable — the Worker takes over before any IP traffic flows.
#
# Required environment:
#   CLOUDFLARE_API_TOKEN   API token with Zone.DNS:Edit on the target zone
#   LAB_ZONE_ID            dtg-lab.net zone ID
#
# Usage:
#   export CLOUDFLARE_API_TOKEN=...
#   export LAB_ZONE_ID=...
#   ./scripts/setup-dns.sh
#

set -euo pipefail

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN must be set}"
: "${LAB_ZONE_ID:?LAB_ZONE_ID must be set}"

HOSTS=(
  "hr.dtg-lab.net"
  "fs.gmis.dtg-lab.net"
  "hcmx.gmis.dtg-lab.net"
  "fscmx.gmis.dtg-lab.net"
)

PLACEHOLDER_IP="192.0.2.1"   # TEST-NET-1 — never routable, Worker intercepts first

api() {
  local method="$1"
  local path="$2"
  shift 2
  curl -sS -X "$method" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.cloudflare.com/client/v4${path}" \
    "$@"
}

echo "==> Creating placeholder DNS records on zone ${LAB_ZONE_ID}"
echo

for host in "${HOSTS[@]}"; do
  printf "  • %-32s ... " "$host"

  # Check if record already exists
  EXISTING=$(api GET "/zones/${LAB_ZONE_ID}/dns_records?type=A&name=${host}" | \
    grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)

  if [ -n "$EXISTING" ]; then
    echo "already exists ($EXISTING) — leaving alone"
    continue
  fi

  RESPONSE=$(api POST "/zones/${LAB_ZONE_ID}/dns_records" \
    -d "$(cat <<EOF
{
  "type": "A",
  "name": "${host}",
  "content": "${PLACEHOLDER_IP}",
  "ttl": 1,
  "proxied": true,
  "comment": "Placeholder for redirect-splash worker. Worker intercepts before IP is used."
}
EOF
)")

  if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "created"
  else
    echo "FAILED"
    echo "    $RESPONSE"
  fi
done

echo
echo "Done. Records are proxied (orange-cloud) so the Worker can attach."
echo "Re-run 'wrangler deploy' if it failed previously due to missing DNS."
