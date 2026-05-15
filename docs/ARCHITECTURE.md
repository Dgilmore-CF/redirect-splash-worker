# Architecture

## Overview

The redirect-splash worker is a single Cloudflare Worker bound (via
Custom Domains) to the legacy hostnames being decommissioned. The
worker is the **origin** for those hostnames — there is no fallback
backend. Every request that reaches the legacy URL is handled entirely
inside the worker.

```
            ┌──────────────────────────────────────────────────────────┐
            │                  Cloudflare Edge                          │
            │                                                            │
   Client   │   ┌───────────────────────────┐                            │
   ───────▶ │   │  redirect-splash worker    │  ── writeDataPoint ──▶    │
            │   │  • src/index.ts (entry)    │                          │
            │   │  • src/splash.ts (renderer)│                          │
            │   │  • src/i18n.ts             │                          │
            │   │  • src/themes.ts           │                          │
            │   │  • src/analytics.ts        │                          │
            │   └────────────┬──────────────┘                            │
            │                │                                          │
            │                ▼                                          │
            │       302 → new URL                                        │
            └──────────────────────────────────────────────────────────┘
                              │
                              ▼
            ┌──────────────────────────────────────────────────────────┐
            │            New Destination Service                       │
            │  (real production app OR simulation worker)              │
            └──────────────────────────────────────────────────────────┘
```

## Request flow

1. **Custom Domain triggers worker.** Cloudflare routes any request to
   `hr.dtg-lab.net` or `fs.gmis.dtg-lab.net` to the worker.
2. **Worker `fetch` handler runs** (`src/index.ts`).
3. **Beacon path?** If the request is `POST /__redirect_splash_event`,
   record the event to Analytics Engine and return 204.
4. **Health check?** If `GET /__health`, return JSON status.
5. **Hostname lookup.** `lookupRedirect(host)` returns the destination
   config or `null` (→ 404).
6. **Fast-exit signals:**
   - `?redirect` or `?skip=1` query parameter — immediate 302
   - `hideSplash=1` cookie — immediate 302
   Forwarded params are appended to the destination URL (excluding the
   splash control params).
7. **Render splash page:**
   - Resolve language from `?lang=` → `Accept-Language` → default
   - Pick variant from `?variant=` → hash(IP+UA) → fallback C
   - Resolve theme from `?theme=` → cookie → `auto`
   - Build full HTML inline (no external assets)
8. **Return 200** with strict security headers (`CSP`, `X-Frame-Options: DENY`, etc.)

## Client-side behavior

The splash page is fully self-contained — no external scripts, no CDN,
no fonts. The inline `<script>` tag:

- Reads `localStorage` for the "don't show again" flag. If set, redirects
  immediately without showing UI.
- Starts a countdown that ticks once per second.
- Records analytics events via `navigator.sendBeacon('/__redirect_splash_event')`.
  - `splash_shown` — on first render
  - `redirect_executed` — when the countdown reaches zero
  - `manual_redirect` — when the user clicks "Continue to New Site"
  - `bookmark_clicked` — when the user clicks "Copy URL" or the bookmarklet
  - `dont_show_again` — when the checkbox is toggled
  - `language_changed` / `theme_changed` — when those selectors change
- Wires up the copy-to-clipboard button.
- Wires up the language/theme selectors.

## Analytics

We use **Cloudflare Analytics Engine** rather than an external service so:

- No outbound network call from the worker → no added latency.
- Single binding configuration.
- Data lives in the customer's Cloudflare account.
- Queryable with SQL via the Analytics Engine SQL API.

Schema (`AnalyticsEvent` in `src/types.ts`):

| Field             | Slot     | Type    | Example                          |
|-------------------|----------|---------|----------------------------------|
| event type        | blob1    | string  | `splash_shown`                   |
| legacy host       | blob2    | string  | `hr.dtg-lab.net`                 |
| new host          | blob3    | string  | `hcmx.gmis.dtg-lab.net`          |
| variant           | blob4    | string  | `A`, `B`, `C`                    |
| language          | blob5    | string  | `en`, `es`, `fr`, …              |
| country           | blob6    | string  | `US`, `CA`, …                    |
| colo              | blob7    | string  | `IAD`, `LAX`, …                  |
| user agent (200c) | blob8    | string  | `Mozilla/5.0 …`                  |
| countdown seconds | double1  | number  | `8`                              |
| had skip flag     | double2  | number  | `0` or `1`                       |
| (index)           | index    | string  | legacy host (for partitioning)   |

Example SQL (Workers Analytics Engine SQL API):

```sql
SELECT
  blob1 AS event,
  count() AS events
FROM redirect_splash_events
WHERE
  blob2 = 'hr.dtg-lab.net'
  AND timestamp > now() - INTERVAL '7' DAY
GROUP BY event
ORDER BY events DESC;
```

```sql
-- Compare variant effectiveness
SELECT
  blob4 AS variant,
  countIf(blob1 = 'splash_shown')        AS shown,
  countIf(blob1 = 'manual_redirect')     AS manual,
  countIf(blob1 = 'redirect_executed')   AS auto,
  countIf(blob1 = 'dont_show_again')     AS dismissed,
  countIf(blob1 = 'bookmark_clicked')    AS bookmarked
FROM redirect_splash_events
WHERE timestamp > now() - INTERVAL '7' DAY
GROUP BY variant;
```

## A/B test bucketing

`src/themes.ts::pickVariant`:

1. `?variant=A|B|C` override always wins (used by QA).
2. If `ENABLE_AB_TESTING=false`, always return `C` (the formal variant).
3. Otherwise hash `cf-connecting-ip + user-agent` and modulo by 3.

The hash is djb2 — cheap and deterministic. Visitors get a stable
variant for the duration of the migration (since their IP + UA don't
typically change mid-session).

## Security model

- **No backend.** The worker is the entire stack. No connection strings,
  no secrets in the worker itself.
- **Strict CSP.** Only inline `<style>` and `<script>` (which we ship)
  and `data:` images. No third-party scripts can be injected even if
  someone tries.
- **`X-Frame-Options: DENY`** — splash cannot be embedded in an iframe.
- **`referrer-policy: no-referrer`** — destination URLs don't leak back
  to anyone via the Referer header.
- **`robots: noindex`** — splash pages should not appear in search results.
- **No PII storage.** Analytics events truncate the user agent and only
  record geo to the country level.
- **No third-party requests** from the splash page client script.

## Failure modes

| Scenario                       | What happens                                       |
|--------------------------------|----------------------------------------------------|
| Worker code throws             | Cloudflare returns a generic 1101 error. We add `observability` so the error appears in the dashboard. |
| Analytics Engine binding down  | `recordEvent` swallows the error and logs to console. User journey is unaffected. |
| Unknown hostname               | 404 with no details (avoids leaking the route map). |
| Malformed beacon body          | 400 returned, no analytics written. |
| Client JavaScript disabled     | The user sees the splash text and the manual "Continue" link, but the countdown does not advance. They must click through. |
| `localStorage` unavailable     | Try/catch wrapper, falls through to normal splash flow. |

## Scaling considerations

- Worker invocations are global (all Cloudflare data centers).
- The HTML response is ~30-60 KB and is served entirely from the edge.
- Analytics Engine writes are sampled at 1.0 (every event) but can be
  reduced via `head_sampling_rate` in `wrangler.jsonc` if volume warrants.
- The worker uses no KV / D1 / Durable Objects, so there is no
  consistency layer to consider.
