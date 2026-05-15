# Redirect Splash Worker

A Cloudflare Worker that intercepts requests to legacy URLs, displays a
professional splash page advising users to update their bookmarks, then
redirects them to the new destination after a configurable countdown.

Designed for government, education and enterprise migrations where you
need to **inform users about a URL change without breaking their workflow**.

## Features

- **Professional, government/enterprise styling** — Conservative palette, system fonts, accessible contrast, no emoji clutter in the UI.
- **Three splash variants** (A/B/C) for A/B testing — minimalist, detailed step-by-step, and formal government-style.
- **Six built-in languages** — English, Spanish, French, German, Portuguese, Japanese — auto-detected from `Accept-Language`, overridable via `?lang=`.
- **Dark / light / auto theme** — Respects the OS `prefers-color-scheme` and offers an explicit toggle that persists in a cookie.
- **Configurable countdown** — Default 8 seconds, set via the `COUNTDOWN_SECONDS` environment variable.
- **Bookmark helper** — Draggable bookmarklet (works in all modern browsers), copy-to-clipboard, plus a clear `Ctrl+D` / `⌘+D` hint.
- **"Don't show again" preference** — `localStorage` for per-device suppression plus a cookie path for server-side fast-skip.
- **Analytics** — All key events (splash shown, redirect executed, bookmark clicked, manual redirect, theme/language change, etc.) are recorded to Cloudflare Analytics Engine.
- **Multi-environment** — Lab, simulation, and production environments are all defined in a single `wrangler.jsonc`.
- **Simulation worker** included for end-to-end testing without real backends.
- **Type-checked** TypeScript, **unit-tested** with `@cloudflare/vitest-pool-workers`.
- **CI/CD** via GitHub Actions with environment promotion.

## Quick start

```bash
# 1. Install
npm install

# 2. Sign in to Cloudflare
npx wrangler login

# 3. Run locally
npm run dev
# Visit http://localhost:8787 with Host header simulation:
#   curl -H 'Host: hr.dtg-lab.net' http://localhost:8787/

# 4. Deploy to lab
npm run deploy:lab
```

## How it works

```
                         ┌─────────────────────────────────┐
   Visit                 │   redirect-splash worker         │
   hr.dtg-lab.net   ──▶  │   (this project)                 │
                         │                                  │
                         │   • match host                   │
                         │   • check ?skip / cookie         │
                         │   • render localized splash      │
                         │   • record analytics             │
                         └──────────────┬───────────────────┘
                                        │ (after countdown)
                                        ▼
                         ┌─────────────────────────────────┐
                         │   hcmx.gmis.dtg-lab.net          │
                         │   /psp/hrprd?cmd=login           │
                         └─────────────────────────────────┘
```

The worker is attached to the legacy hostnames using Cloudflare **Custom Domains**, which means:

- All paths on the legacy hostname hit the worker (`/*`)
- TLS is handled by Cloudflare automatically
- No origin server is required (the worker is the origin)

## Project layout

```
.
├── src/
│   ├── index.ts          Main worker entry point
│   ├── simulation.ts     Simulation worker (mock destination portals)
│   ├── config.ts         Hostname → destination map
│   ├── splash.ts         Splash page renderer (HTML/CSS/JS)
│   ├── i18n.ts           Translations & language resolution
│   ├── themes.ts         A/B variant + theme resolution
│   ├── analytics.ts      Analytics Engine event recording
│   └── types.ts          Shared TypeScript types
├── simulation/           Reference HTML files for the destination portals
├── scripts/
│   ├── deploy-lab.sh     Lab deploy + smoke test
│   ├── setup-dns.sh      Creates placeholder DNS records
│   └── test-local.sh     Local dev helper
├── tests/                Vitest worker tests
├── docs/                 Architecture & deployment guides
├── .github/workflows/    CI/CD pipelines
├── wrangler.jsonc        Worker configuration (lab / simulation / production)
├── package.json
└── tsconfig.json
```

## Configuration

All runtime configuration is in `wrangler.jsonc`. The three environments are:

| Environment   | When to use                                                 | Trigger                              |
|---------------|-------------------------------------------------------------|--------------------------------------|
| `lab` (default) | Your DTG Lab account, hr.dtg-lab.net / fs.gmis.dtg-lab.net | `wrangler deploy`                    |
| `simulation`    | Mock destination portals (hcmx, fscmx)                     | `wrangler deploy --env simulation`   |
| `production`    | Customer Enterprise zone (placeholder — fill in)            | `wrangler deploy --env production`   |

To add or change a redirect, edit `src/config.ts`. The map is keyed by the
legacy hostname (lowercase) and points to a `RedirectConfig` with the new
URL, a human-readable service name, a description, and an icon.

## Further reading

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — System design, request flow, security model
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Step-by-step lab deployment + production rollout
- [`docs/ANALYTICS.md`](docs/ANALYTICS.md) — How to query analytics events
- [`simulation/README.md`](simulation/README.md) — Setting up the destination portal simulation

## License

MIT — see [LICENSE](LICENSE) for details.
