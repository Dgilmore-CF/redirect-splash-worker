/**
 * Analytics module.
 *
 * Uses Cloudflare Analytics Engine to record events. Analytics Engine
 * is a write-only time-series store optimized for billions of events
 * per day with sampled querying via SQL.
 *
 * Schema:
 *   blobs:    string fields (text labels)
 *     1: event type
 *     2: legacy host
 *     3: new host
 *     4: variant (A/B/C)
 *     5: language
 *     6: country (cf-ipcountry)
 *     7: colo
 *     8: user agent (truncated)
 *
 *   doubles:  numeric fields
 *     1: countdown seconds
 *     2: had skip flag (0 or 1)
 *
 *   indexes:  high-cardinality dimension for fast filtering
 *     legacy host (lets us query per-hostname efficiently)
 *
 * Querying:
 *   Use the SQL API or the Workers Analytics Engine dashboard.
 *   Example:
 *     SELECT blob1 AS event, count() AS c
 *     FROM redirect_splash_events
 *     WHERE blob2 = 'hr.dtg-lab.net' AND timestamp > now() - INTERVAL '7' DAY
 *     GROUP BY event
 */

import type { AnalyticsEvent, AnalyticsEventType } from './types.js';

/**
 * Write a single analytics event to the Analytics Engine dataset.
 *
 * This is fire-and-forget — it's safe to call without awaiting.
 * Errors are caught and logged but never thrown so analytics
 * failures never break the user experience.
 */
export function recordEvent(
  analytics: AnalyticsEngineDataset | undefined,
  event: AnalyticsEvent,
): void {
  if (!analytics) {
    // No binding configured — silently skip
    return;
  }

  try {
    analytics.writeDataPoint({
      // Blobs (string labels)
      blobs: [
        event.type,
        event.legacyHost,
        event.newHost,
        event.variant,
        event.language,
        event.country.slice(0, 4),
        event.colo.slice(0, 8),
        event.userAgent.slice(0, 200),
      ],
      // Doubles (numeric metrics)
      doubles: [event.countdownSeconds, event.hadSkipFlag ? 1 : 0],
      // Index: high-cardinality field for fast partitioning at query time
      indexes: [event.legacyHost],
    });
  } catch (err) {
    // Analytics failures are never fatal
    console.error('Analytics write failed:', err);
  }
}

/**
 * Convenience helper that fills in common context fields from
 * the request and only requires the event-specific data.
 */
export function buildEvent(
  request: Request,
  context: {
    type: AnalyticsEventType;
    legacyHost: string;
    newHost: string;
    variant: AnalyticsEvent['variant'];
    language: AnalyticsEvent['language'];
    countdownSeconds: number;
    hadSkipFlag: boolean;
  },
): AnalyticsEvent {
  const cf = request.cf as IncomingRequestCfProperties | undefined;
  return {
    ...context,
    userAgent: request.headers.get('user-agent') ?? 'unknown',
    country: cf?.country ?? 'XX',
    colo: cf?.colo ?? 'XXX',
  };
}
