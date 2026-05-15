# Analytics Guide

The worker writes events to **Cloudflare Analytics Engine**, a write-only
time-series store designed for billions of events per day. Reads are
done via the Analytics Engine SQL API.

## Setup

The binding is declared in `wrangler.jsonc`:

```jsonc
"analytics_engine_datasets": [
  {
    "binding": "ANALYTICS",
    "dataset": "redirect_splash_events"
  }
]
```

Datasets are auto-created on first write. You don't need to provision
anything manually.

## Schema

All Analytics Engine datasets use a fixed schema of "blobs" (strings) and
"doubles" (numbers) plus a single "index" used for partitioning at query
time. This worker uses:

| Column   | Meaning                                          |
|----------|--------------------------------------------------|
| `blob1`  | Event type (`splash_shown`, `redirect_executed`, etc.) |
| `blob2`  | Legacy host (`hr.dtg-lab.net`)                   |
| `blob3`  | New host (`hcmx.gmis.dtg-lab.net`)               |
| `blob4`  | Variant (`A`, `B`, `C`)                          |
| `blob5`  | Language code (`en`, `es`, …)                    |
| `blob6`  | Country code from CF geo (`US`, `CA`, …)         |
| `blob7`  | Colo (`IAD`, `LAX`, …)                           |
| `blob8`  | User agent (truncated to 200 chars)              |
| `double1`| Countdown seconds                                |
| `double2`| Skip flag (0 or 1)                               |
| `index1` | Legacy host (for fast partition pruning)         |

## Event types

| Event                | When emitted                                            |
|----------------------|---------------------------------------------------------|
| `splash_shown`       | Splash page rendered + visible to user                  |
| `redirect_executed`  | Countdown reached zero, auto-redirect fired             |
| `redirect_skipped`   | Server-side fast-skip via `?skip=1` or cookie           |
| `manual_redirect`    | User clicked the "Continue to New Site" button          |
| `bookmark_clicked`   | User clicked the copy-URL button or the bookmarklet     |
| `dont_show_again`    | User checked the "Don't show this again" checkbox       |
| `language_changed`   | User changed language from the selector                 |
| `theme_changed`      | User changed theme from the selector                    |

## Querying

Cloudflare provides a SQL API. To use it:

1. Generate a token at **Dashboard → My Profile → API Tokens → Create Token**
2. Use the **Read Analytics** template, scoped to your account.

### `curl` example

```bash
curl "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/analytics_engine/sql" \
  -H "Authorization: Bearer $CF_ANALYTICS_TOKEN" \
  -d "SELECT blob1, count() FROM redirect_splash_events
      WHERE timestamp > now() - INTERVAL '24' HOUR
      GROUP BY blob1"
```

### Useful queries

**Top-level event counts (last 7 days):**

```sql
SELECT
  blob1 AS event,
  count() AS events
FROM redirect_splash_events
WHERE timestamp > now() - INTERVAL '7' DAY
GROUP BY event
ORDER BY events DESC;
```

**Per-host traffic + skip rate:**

```sql
SELECT
  blob2 AS legacy_host,
  countIf(blob1 = 'splash_shown')      AS splash_views,
  countIf(blob1 = 'redirect_executed') AS auto_redirects,
  countIf(blob1 = 'manual_redirect')   AS manual_redirects,
  countIf(blob1 = 'redirect_skipped')  AS server_skips,
  countIf(blob1 = 'dont_show_again')   AS opt_outs
FROM redirect_splash_events
WHERE timestamp > now() - INTERVAL '7' DAY
GROUP BY legacy_host;
```

**A/B variant performance:**

```sql
SELECT
  blob4 AS variant,
  countIf(blob1 = 'splash_shown')      AS shown,
  countIf(blob1 = 'bookmark_clicked')  AS bookmark_actions,
  countIf(blob1 = 'manual_redirect')   AS manual_clicks,
  countIf(blob1 = 'dont_show_again')   AS dismissed,
  -- Click-through rate on the bookmark CTA per variant
  round(countIf(blob1 = 'bookmark_clicked') / nullIf(countIf(blob1 = 'splash_shown'), 0), 3) AS bookmark_ctr
FROM redirect_splash_events
WHERE
  blob2 = 'hr.dtg-lab.net'
  AND timestamp > now() - INTERVAL '14' DAY
GROUP BY variant
ORDER BY shown DESC;
```

**Language distribution:**

```sql
SELECT
  blob5 AS language,
  count() AS views
FROM redirect_splash_events
WHERE
  blob1 = 'splash_shown'
  AND timestamp > now() - INTERVAL '7' DAY
GROUP BY language
ORDER BY views DESC;
```

**Geographic breakdown (top 20 countries):**

```sql
SELECT
  blob6 AS country,
  count() AS views
FROM redirect_splash_events
WHERE
  blob1 = 'splash_shown'
  AND timestamp > now() - INTERVAL '30' DAY
GROUP BY country
ORDER BY views DESC
LIMIT 20;
```

**Trend over time (hourly):**

```sql
SELECT
  toStartOfHour(timestamp) AS hour,
  count() AS events
FROM redirect_splash_events
WHERE
  blob1 = 'splash_shown'
  AND timestamp > now() - INTERVAL '48' HOUR
GROUP BY hour
ORDER BY hour;
```

**Opt-out conversion funnel:**

```sql
SELECT
  count(DISTINCT blob6) AS unique_countries,
  countIf(blob1 = 'splash_shown')    AS shown,
  countIf(blob1 = 'dont_show_again') AS opted_out,
  round(countIf(blob1 = 'dont_show_again') / nullIf(countIf(blob1 = 'splash_shown'), 0), 4) AS opt_out_rate
FROM redirect_splash_events
WHERE timestamp > now() - INTERVAL '7' DAY;
```

## Dashboard / Grafana

You can also point Grafana at the Analytics Engine SQL endpoint using the
**Cloudflare data source** or a generic SQL data source. The schema works
well with simple line charts (events over time) and stat panels
(counts by category).

## Sampling

By default, the worker uses `head_sampling_rate: 1` (every event is
recorded). If traffic grows large enough that storage cost is a concern,
you can dial this down in `wrangler.jsonc`:

```jsonc
"observability": {
  "enabled": true,
  "head_sampling_rate": 0.1   // record 10% of events
}
```

This affects worker invocation logs, not Analytics Engine writes, but
note that the Analytics Engine itself bills per data point written so
recording everything for a low-traffic migration page is fine; if it
ever spikes you can add sampling logic in `src/analytics.ts`.

## Retention

Analytics Engine retains data for **3 months by default**. If you need
longer retention for the migration timeline, export periodically to R2
or another store via a cron-triggered worker.
