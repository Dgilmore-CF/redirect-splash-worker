# Deployment Guide

This guide walks through deploying the redirect-splash worker to your
DTG Lab account end-to-end. It assumes you have an active `dtg-lab.net`
zone in Cloudflare and admin access to it.

## Prerequisites

- **Node.js 18+** (`node --version`)
- **npm 9+** (`npm --version`)
- **A Cloudflare account** with the `dtg-lab.net` zone onboarded
- A **Cloudflare API token** scoped to:
  - Account: `Workers Scripts:Edit`, `Workers Routes:Edit`, `Analytics Engine:Write`
  - Zone: `DNS:Edit`, `Workers Routes:Edit`
- Or use `wrangler login` for interactive OAuth (recommended for first-time setup).

## Step 0 — Clone & install

```bash
git clone <your-fork-url>
cd redirect-splash-worker
npm install
```

## Step 1 — Get your zone ID

You need the zone ID for `dtg-lab.net`:

1. Cloudflare dashboard → select the `dtg-lab.net` zone
2. Look at the right-hand sidebar → **Zone ID**
3. Copy it (looks like `0123456789abcdef0123456789abcdef`)

Save it as an environment variable for later:

```bash
export LAB_ZONE_ID="0123456789abcdef0123456789abcdef"
```

## Step 2 — Fill in placeholders

Edit `wrangler.jsonc` and replace `<YOUR_ZONE_ID>` (in the `simulation`
env section) with your real zone ID:

```jsonc
"simulation": {
  "routes": [
    { "pattern": "hcmx.gmis.dtg-lab.net/*", "zone_id": "0123456789abcdef0123456789abcdef" },
    { "pattern": "fscmx.gmis.dtg-lab.net/*", "zone_id": "0123456789abcdef0123456789abcdef" }
  ],
  ...
}
```

The `lab` (default) and `production` environments use `custom_domain: true`,
which doesn't require a zone ID — Cloudflare resolves it from the hostname.

## Step 3 — Authenticate Wrangler

```bash
npx wrangler login
```

Browser opens → log into your Cloudflare account → approve.

Verify:

```bash
npx wrangler whoami
```

## Step 4 — Create placeholder DNS records

Custom Domains require a proxied DNS record to attach to. Create them
either via the script or manually.

### Option A — Script

```bash
export CLOUDFLARE_API_TOKEN="<your-token>"
export LAB_ZONE_ID="<your-zone-id>"
./scripts/setup-dns.sh
```

This creates `A` records (proxied) pointing to `192.0.2.1` (TEST-NET-1)
for:

- `hr.dtg-lab.net`
- `fs.gmis.dtg-lab.net`
- `hcmx.gmis.dtg-lab.net`
- `fscmx.gmis.dtg-lab.net`

### Option B — Manual via dashboard

For each of the four hosts above:

1. Cloudflare dashboard → **DNS** → **Records**
2. Click **Add record**
3. **Type**: A · **Name**: (the host) · **IPv4 address**: `192.0.2.1` · **Proxy status**: Proxied · **TTL**: Auto
4. Save

The worker takes over before any IP-level traffic actually flows.

## Step 5 — Create the Analytics Engine dataset

The worker writes events to the `redirect_splash_events` dataset.
Cloudflare auto-creates Analytics Engine datasets on first write, so
nothing to do here unless you want to pre-create it manually:

1. Dashboard → **Workers & Pages** → **Analytics Engine**
2. The dataset will appear after the first event lands.

## Step 6 — Deploy the simulation worker (destination portals)

```bash
npx wrangler deploy --env simulation
```

This deploys a separate worker that hosts mock HR + FS portal sign-in
pages. After this, visiting

```
https://hcmx.gmis.dtg-lab.net/psp/hrprd?cmd=login
https://fscmx.gmis.dtg-lab.net/psp/fsprd?cmd=login
```

…should return the simulation login pages.

## Step 7 — Deploy the redirect-splash worker

```bash
npx wrangler deploy
```

This deploys the main worker bound to the legacy hostnames.

## Step 8 — Full deploy via script (idempotent)

You can do steps 6–7 + smoke-test in one shot:

```bash
npm run deploy:lab
```

The script:

- Re-installs deps (cached)
- Runs `tsc --noEmit`
- Runs tests
- Deploys simulation worker
- Deploys splash worker
- Curls each route to verify it returns 200 / 302 as expected

## Step 9 — Validate manually

| Test                                              | Expected                                   |
|---------------------------------------------------|--------------------------------------------|
| `curl -I https://hr.dtg-lab.net/`                 | 200 + `content-type: text/html`            |
| Open in browser                                   | Splash page renders, countdown ticks       |
| Wait 8 seconds                                    | Auto-redirect to `hcmx.gmis.dtg-lab.net`   |
| Open `https://hr.dtg-lab.net/?skip=1`             | Immediate 302 to new URL                   |
| Open in Spanish: `?lang=es`                       | Spanish UI                                 |
| Force variant A: `?variant=A`                     | Minimalist layout                          |
| Force variant B: `?variant=B`                     | Step-by-step layout                        |
| Force variant C: `?variant=C`                     | Formal government layout                   |
| Check "Don't show again", reload                  | Immediate redirect (no splash)             |

## Step 10 — Tailing live logs

```bash
npm run tail
```

This streams `console.log` output and HTTP details for the deployed worker.

## Promoting to production (customer's Enterprise zone)

When you're ready to deploy to the customer:

1. Edit `wrangler.jsonc` → `env.production` → fill in their real hostnames.
2. Edit `src/config.ts` → add `REDIRECT_MAP` entries for the production hosts.
3. Create proxied DNS records on the customer's zone for those hostnames.
4. Run `wrangler deploy --env production`.

Or use the GitHub Actions workflow:

```bash
# From the GitHub UI: Actions → Deploy → Run workflow → environment=production
```

## CI/CD setup (GitHub Actions)

Add these repository secrets at **Settings → Secrets and variables → Actions**:

| Secret                    | Description                                    |
|---------------------------|------------------------------------------------|
| `CLOUDFLARE_API_TOKEN`    | API token with the scopes listed in prerequisites |
| `CLOUDFLARE_ACCOUNT_ID`   | Your Cloudflare account ID                     |

Create matching **environments** (Settings → Environments) named:

- `lab`
- `simulation`
- `production`

Optionally add manual approval requirements to the `production`
environment so deploys can only proceed after a reviewer signs off.

Pushes to `main` will auto-deploy the simulation worker plus the lab
splash worker. Production deploys are gated behind a manual `workflow_dispatch`.

## Rollback

Cloudflare keeps a history of every worker version. To roll back:

```bash
# List recent versions
npx wrangler deployments list

# Roll back to a previous version
npx wrangler rollback --message "Reverting bad change"
```

You can also re-deploy a previous commit:

```bash
git checkout <previous-commit-sha>
npm run deploy:lab
git checkout main
```

## Removing the worker entirely

If you need to fully decommission the splash:

```bash
npx wrangler delete                    # removes the splash worker
npx wrangler delete --env simulation   # removes the simulation worker
```

Then delete the placeholder DNS records from the dashboard.
