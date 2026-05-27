# Redirect Splash Worker

A Cloudflare Worker that informs users of a URL change before automatically
redirecting them to a new destination. Designed for migrations where you
need to **notify users without breaking their workflow** — typical use
cases are application rehoming, vanity-URL retirement, mergers and
acquisitions, and government service relocations.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](tsconfig.json)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020)](https://workers.cloudflare.com/)

---

## Table of contents

- [What it does](#what-it-does)
- [Features](#features)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Branding](#branding)
- [Architecture](#architecture)
- [Deploying to production](#deploying-to-production)
- [Analytics](#analytics)
- [Testing](#testing)
- [Project layout](#project-layout)
- [Documentation](#documentation)
- [License](#license)

---

## What it does

When a user requests a legacy URL bound to this Worker, the request is
intercepted at the Cloudflare edge and answered with a compact notice
banner that:

1. Identifies the moved service and shows the new URL.
2. Counts down for a configurable number of seconds.
3. Provides one-click controls to copy the new URL or save a bookmark.
4. Records the interaction in Cloudflare Analytics Engine.
5. Redirects the browser to the new destination.

Users can opt out of the splash on a per-device basis with a single click.
The banner is rendered in a compact top-of-page strip so the rest of the
viewport remains free for any custom background image or branding.

```
   GET https://old.example.com/path
                 │
                 ▼
   ┌────────────────────────────────────┐
   │  Cloudflare Worker (this project)  │
   │  • host lookup                     │
   │  • skip-flag fast path             │
   │  • render localized splash         │
   │  • record analytics                │
   └────────────────────────────────────┘
                 │  (after countdown)
                 ▼
        302 → https://new.example.com/path
```

---

## Features

| | Feature | Notes |
|---|---|---|
| ✓ | Multi-hostname routing | Single Worker handles many legacy hosts via a config map |
| ✓ | Compact banner UI | Pinned to the top of the viewport, no scrolling required |
| ✓ | Three layout variants | Minimalist, detailed, formal — A/B-testable per request |
| ✓ | Six built-in languages | English, Spanish, French, German, Portuguese, Japanese |
| ✓ | `Accept-Language` detection | Manual override available via `?lang=` |
| ✓ | Light / dark / auto theme | Honors `prefers-color-scheme`, user override persists in a cookie |
| ✓ | Configurable countdown | Per-environment, clamped to 2–60 seconds |
| ✓ | Copy-to-clipboard | One-click copy with toast confirmation |
| ✓ | Bookmark helper | Draggable bookmarklet plus a `Ctrl+D` / `⌘+D` hint |
| ✓ | "Don't show again" opt-out | Per-device, stored in `localStorage` |
| ✓ | Server-side fast skip | Cookie or `?skip=1` returns a 302 without rendering the splash |
| ✓ | Forwarded query params | Deep-link parameters are preserved on redirect |
| ✓ | Customer branding | Optional background image and logo via env vars |
| ✓ | Strict security headers | CSP, X-Frame-Options, Referrer-Policy, robots noindex |
| ✓ | Analytics Engine integration | Eight event types, queryable via SQL |
| ✓ | Self-contained HTML | No external assets or CDN dependencies |
| ✓ | Multi-environment config | Lab, simulation, production environments in one file |
| ✓ | Companion simulation worker | Mock destination portals for end-to-end testing |

---

## Quick start

**Prerequisites:** Node.js 18+, npm, and a Cloudflare account with at least
one zone you control.

```bash
# 1. Install dependencies
npm install

# 2. Authenticate Wrangler
npx wrangler login

# 3. Edit src/config.ts to add your legacy → new URL mapping
#    Edit wrangler.jsonc to set your routes and environment variables

# 4. Run locally
npm run dev

# 5. Deploy
npm run deploy
```

For a fully detailed step-by-step walkthrough including DNS setup,
Custom Domain attachment, and CI/CD integration, see
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## Configuration

### Hostname → destination mapping

Edit `src/config.ts`. Keys are lowercase hostnames; values describe the
destination and how it should be presented to users:

```ts
export const REDIRECT_MAP: RedirectMap = {
  'old.example.com': {
    newUrl: 'https://new.example.com/login',
    serviceName: 'Human Resources Portal',
    description: 'The HR portal has moved to a new secure location.',
    icon: 'people',  // 'people' | 'finance' | 'document' | 'generic'
  },
};
```

### Environment variables

Set per environment in `wrangler.jsonc`:

| Variable | Default | Purpose |
|---|---|---|
| `COUNTDOWN_SECONDS` | `"8"` | Seconds before automatic redirect (clamped 2–60) |
| `ENABLE_AB_TESTING` | `"true"` | When `false`, always serves the formal variant |
| `DEFAULT_LANGUAGE` | `"en"` | Fallback when `Accept-Language` isn't matched |
| `ORG_NAME` | `"Your Organization"` | Shown in the banner footer |
| `SUPPORT_EMAIL` | `"helpdesk@example.com"` | Contact for users needing help |
| `ENVIRONMENT` | `"production"` | Surfaced by `/__health` and analytics |
| `BACKGROUND_IMAGE_URL` | `""` | Optional — see [Branding](#branding) |
| `LOGO_URL` | `""` | Optional — see [Branding](#branding) |

### Request-level overrides

For QA and accessibility, these query parameters override the defaults
on a per-request basis without redeploying:

| Parameter | Effect |
|---|---|
| `?lang=es` | Force a specific language (`en`, `es`, `fr`, `de`, `pt`, `ja`) |
| `?variant=A` | Force a specific splash variant (`A`, `B`, `C`) |
| `?theme=dark` | Force theme (`light`, `dark`, `auto`) |
| `?skip=1` | Server-side fast skip — issues 302 immediately |
| `?redirect` | Same as `?skip=1` |

---

## Branding

Customers can optionally provide a background image and/or a logo to
match their visual identity. Both are configured via environment
variables in `wrangler.jsonc` and require no code changes.

### Background image

```jsonc
"vars": {
  "BACKGROUND_IMAGE_URL": "https://cdn.example.com/headquarters.jpg"
}
```

- Must be an `https://` URL or a `data:image/...` URI.
- Recommended dimensions: 1920×1080 or larger.
- Recommended file size: under 500 KB.
- Rendered with a translucent gradient overlay so the splash banner
  remains legible in both light and dark themes.
- In dark mode the overlay automatically darkens.

### Logo

```jsonc
"vars": {
  "LOGO_URL": "https://cdn.example.com/agency-logo.svg"
}
```

- Must be an `https://` URL or a `data:image/...` URI.
- Replaces the plain-text organization name in the banner footer.
- Rendered at a fixed height of 22 px with a max width of 180 px.
- Monochrome logos are automatically inverted in dark mode.

### Security model

Both URLs are sanitized at request time — anything other than `https://`
or `data:image/` is silently ignored (the field is treated as if it were
empty). The Content-Security-Policy allows `img-src 'self' data: https:`
so customer images load from any HTTPS origin without weakening the
overall policy. No other resource types can be loaded.

---

## Architecture

The Worker is the **origin** for every hostname it serves — there is no
fallback backend. This makes the deployment model simple and the failure
surface tiny.

### Request flow

```
┌───────────────────────────────────────────────────────────────┐
│                      Cloudflare edge                          │
│                                                               │
│   Request ──▶ Worker                                          │
│                │                                              │
│                ├─ host lookup (config.ts)                     │
│                ├─ skip flag? (?skip / cookie) ──▶ 302         │
│                ├─ resolve language / variant / theme          │
│                ├─ render splash HTML (splash.ts)              │
│                └─ writeDataPoint(...)  ──▶ Analytics Engine   │
└───────────────────────────────────────────────────────────────┘
```

### Routing modes

The project demonstrates both Cloudflare routing approaches:

| Worker | Mode | Used for |
|---|---|---|
| **Splash worker** | Custom Domain | Legacy hostnames where the Worker is the only origin |
| **Simulation worker** | Routes | Demo destination portals that coexist with normal DNS |

For complete details on the design — security model, failure modes,
analytics schema, and scaling considerations — see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Deploying to production

The repository ships with three pre-configured Wrangler environments:

| Environment | Purpose | Command |
|---|---|---|
| `lab` (default) | Internal testing | `wrangler deploy` |
| `simulation` | Mock destination portals | `wrangler deploy --env simulation` |
| `production` | Customer-facing | `wrangler deploy --env production` |

Each environment has its own routes, variables, and analytics dataset.
A GitHub Actions workflow at `.github/workflows/deploy.yml` automates
the full pipeline with manual approval gates between environments.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full guide,
including:

- Cloudflare API token scoping
- Placeholder DNS record setup
- Smoke testing
- Rollback procedures
- Multi-environment promotion

---

## Analytics

Every meaningful user interaction is recorded to Cloudflare Analytics
Engine. The schema captures eight event types with full context (legacy
host, variant, language, country, colo, user agent) for behavioural
analysis and A/B test evaluation.

A few example queries:

```sql
-- Top events for a single migration over the past week
SELECT blob1 AS event, count() AS n
FROM redirect_splash_events
WHERE blob2 = 'old.example.com'
  AND timestamp > now() - INTERVAL '7' DAY
GROUP BY event
ORDER BY n DESC;

-- A/B test: how often does each variant drive a bookmark click?
SELECT
  blob4 AS variant,
  countIf(blob1 = 'splash_shown') AS shown,
  countIf(blob1 = 'bookmark_clicked') AS bookmarked,
  round(countIf(blob1 = 'bookmark_clicked')
        / nullIf(countIf(blob1 = 'splash_shown'), 0), 3) AS ctr
FROM redirect_splash_events
WHERE timestamp > now() - INTERVAL '14' DAY
GROUP BY variant;
```

Schema reference and additional queries: [`docs/ANALYTICS.md`](docs/ANALYTICS.md).

---

## Testing

```bash
# Unit + integration tests against the Worker bundle (Vitest + Miniflare)
npm test

# Type check only
npm run lint

# Local dev server with Host-header simulation
npm run dev

# Tail live production logs after deploy
npm run tail
```

The test suite covers hostname routing, fast-skip signals, localization,
variant selection, the analytics beacon endpoint, the health endpoint,
security headers, and branding behavior (both default and configured).

---

## Project layout

```
.
├── src/
│   ├── index.ts          Worker entry — routing, headers, beacon endpoint
│   ├── simulation.ts     Companion worker hosting mock destination portals
│   ├── config.ts         Hostname → destination map
│   ├── splash.ts         Compact banner HTML/CSS/JS renderer
│   ├── i18n.ts           Translations and language resolution
│   ├── themes.ts         A/B variant bucketing and theme resolution
│   ├── analytics.ts      Cloudflare Analytics Engine integration
│   └── types.ts          Shared TypeScript types
├── simulation/           Reference HTML for the destination portals
├── scripts/              Deploy, DNS setup, and local test helpers
├── tests/                Vitest test suites
├── docs/                 Architecture, deployment, and analytics guides
├── .github/workflows/    CI and deploy pipelines
├── wrangler.jsonc        Multi-environment Worker configuration
└── package.json
```

---

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — System design, request flow, security model, schema
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Step-by-step deployment and rollback
- [`docs/ANALYTICS.md`](docs/ANALYTICS.md) — Analytics Engine schema, queries, and retention
- [`simulation/README.md`](simulation/README.md) — Running the destination-portal simulation

---

## License

MIT — see [LICENSE](LICENSE) for details.
