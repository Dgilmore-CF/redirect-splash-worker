# Simulation Environment

This directory contains both:

1. **`src/simulation.ts`** (in the parent `src/` directory) — A separate Worker that
   serves the destination portal pages dynamically based on hostname. This is the
   primary simulation deployment.

2. **Static HTML samples** in `legacy/` and `new/` — Reference / standalone HTML
   files you can open directly in a browser to preview without deploying anything.

## Quick local preview

```bash
# Open the legacy "before" page (just opens an HTML file)
open simulation/legacy/index.html

# Open one of the new destination portal pages
open simulation/new/hcmx-hrprd.html
open simulation/new/fscmx-fsprd.html
```

## Deploying the simulation worker

The simulation worker uses the `simulation` environment in `wrangler.jsonc`:

```bash
# First, edit wrangler.jsonc and replace <YOUR_ZONE_ID> with your real zone ID
npm run dev                                  # local
wrangler deploy --env simulation             # deploy
```

After deploy, point DNS records (proxied) for:
- `hcmx.gmis.dtg-lab.net`  →  any dummy A record (e.g. `192.0.2.1`)
- `fscmx.gmis.dtg-lab.net` →  any dummy A record (e.g. `192.0.2.1`)

The worker custom domain takes over before traffic reaches the dummy IP.

## End-to-end test flow

```
   visit hr.dtg-lab.net
            │
            ▼
   ┌────────────────────┐
   │ redirect-splash    │   ← deployed via `wrangler deploy`
   │ worker             │
   │  • shows splash    │
   │  • counts down     │
   │  • redirects after │
   └────────────────────┘
            │
            ▼  https://hcmx.gmis.dtg-lab.net/psp/hrprd?cmd=login
   ┌────────────────────┐
   │ simulation worker  │   ← deployed via `wrangler deploy --env simulation`
   │  • mock HR portal  │
   │  • mock FS portal  │
   └────────────────────┘
```
