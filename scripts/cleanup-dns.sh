#!/usr/bin/env bash
#
# cleanup-dns.sh
# --------------
# Deletes the placeholder DNS records for the legacy hostnames so that
# Cloudflare's Custom Domain feature (used by the redirect-splash worker)
# can create its own managed records.
#
# Why: setup-dns.sh creates A records as placeholders for the legacy
# hosts. But the splash worker uses Custom Domains (custom_domain: true)
# rather than Routes, which means Cloudflare insists on managing the DNS
# itself. Pre-existing records block the Custom Domain attachment.
#
# The simulation hosts (hcmx, fscmx) keep their A records because the
# simulation worker uses Routes (not Custom Domains).
#
# Required environment:
#   CLOUDFLARE_API_TOKEN   API token with Zone.DNS:Edit
#   LAB_ZONE_ID            dtg-lab.net zone ID
#
# Usage:
#   export CLOUDFLARE_API_TOKEN=...
#   export LAB_ZONE_ID=...
#   ./scripts/cleanup-dns.sh
#

set -euo pipefail

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN must be set}"
: "${LAB_ZONE_ID:?LAB_ZONE_ID must be set}"

# Only the legacy hostnames need their records deleted.
# The destination/simulation hostnames keep their records because the
# simulation worker uses Routes, not Custom Domains.
HOSTS=(
  "hr.dtg-lab.net"
  "fs.gmis.dtg-lab.net"
)

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

echo "==> Deleting placeholder DNS records that conflict with Custom Domains"
echo

for host in "${HOSTS[@]}"; do
  printf "  • %-32s ... " "$host"

  # Find the record ID — Custom Domain conflicts can come from A, AAAA,
  # or CNAME records, so check all of them.
  RECORDS=$(api GET "/zones/${LAB_ZONE_ID}/dns_records?name=${host}")
  RECORD_IDS=$(echo "$RECORDS" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 || true)

  if [ -z "$RECORD_IDS" ]; then
    echo "no records found — already clean"
    continue
  fi

  for record_id in $RECORD_IDS; do
    RESPONSE=$(api DELETE "/zones/${LAB_ZONE_ID}/dns_records/${record_id}")
    if echo "$RESPONSE" | grep -q '"success":true'; then
      echo "deleted ($record_id)"
    else
      echo "FAILED to delete $record_id"
      echo "    $RESPONSE"
    fi
  done
done

echo
echo "Done. Now re-run: npm run deploy:lab"
echo
echo "Cloudflare will create its own managed DNS records for these hostnames"
echo "as part of the Custom Domain attachment."
