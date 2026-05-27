/**
 * Redirect Splash Worker
 * ----------------------
 * Entry point for the Cloudflare Worker. The worker is bound to the
 * legacy hostnames (e.g. hr.dtg-lab.net, fs.gmis.dtg-lab.net) via
 * Custom Domains. For every request it:
 *
 *   1. Looks up the destination from `config.ts`
 *   2. Honors fast-exit signals (?redirect, ?skip=1, cookie)
 *   3. Otherwise renders a localized splash page with countdown
 *   4. Captures analytics beacons posted from the browser
 *
 * Compatible with `wrangler dev` for local iteration and
 * `wrangler deploy` for shipping. See README.md for full setup.
 */

import { lookupRedirect } from './config.js';
import { resolveLanguage } from './i18n.js';
import { pickVariant, resolveTheme } from './themes.js';
import { renderSplash } from './splash.js';
import { buildEvent, recordEvent } from './analytics.js';
import type { Env, SupportedLanguage, AnalyticsEventType } from './types.js';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const host = request.headers.get('host') ?? url.host;

    // -----------------------------------------------------------
    // 1. Beacon endpoint — records client-side analytics events.
    //    Browsers POST here via navigator.sendBeacon().
    // -----------------------------------------------------------
    if (url.pathname === '/__redirect_splash_event' && request.method === 'POST') {
      return handleBeacon(request, env);
    }

    // -----------------------------------------------------------
    // 2. Health check
    // -----------------------------------------------------------
    if (url.pathname === '/__health') {
      return new Response(
        JSON.stringify({ status: 'ok', environment: env.ENVIRONMENT, timestamp: Date.now() }),
        { headers: { 'content-type': 'application/json' } },
      );
    }

    // -----------------------------------------------------------
    // 3. Look up redirect configuration for this hostname
    // -----------------------------------------------------------
    const match = lookupRedirect(host);
    if (!match) {
      // Unknown host — return a clean 404 (do not leak details)
      return new Response('Not Found', { status: 404 });
    }
    const { legacyHost, config } = match;

    // -----------------------------------------------------------
    // 4. Immediate redirect signals
    //    a) ?redirect       — user clicked "Go Now"
    //    b) ?skip=1         — bypass splash entirely
    //    c) hideSplash=1    — preference cookie (server-side fast path)
    // -----------------------------------------------------------
    const cookieHeader = request.headers.get('cookie');
    const hasSkipCookie = cookieHeader?.includes('hideSplash=1') ?? false;
    const hasSkipParam = url.searchParams.has('redirect') || url.searchParams.get('skip') === '1';

    if (hasSkipParam || hasSkipCookie) {
      ctx.waitUntil(
        Promise.resolve(
          recordEvent(
            env.ANALYTICS,
            buildEvent(request, {
              type: 'redirect_skipped',
              legacyHost,
              newHost: new URL(config.newUrl).hostname,
              variant: 'A',
              language: 'en',
              countdownSeconds: 0,
              hadSkipFlag: true,
            }),
          ),
        ),
      );

      // Preserve any additional query parameters or path from the legacy URL
      // by appending them to the destination if appropriate.
      const destination = appendForwardedParams(config.newUrl, url, ['redirect', 'skip', 'lang', 'theme', 'variant']);
      return Response.redirect(destination, 302);
    }

    // -----------------------------------------------------------
    // 5. Resolve user preferences from request
    // -----------------------------------------------------------
    const language: SupportedLanguage = resolveLanguage(
      url,
      request.headers.get('accept-language'),
      env.DEFAULT_LANGUAGE,
    );
    const variant = pickVariant(request, env.ENABLE_AB_TESTING === 'true', url);
    const theme = resolveTheme(url, cookieHeader);
    const countdownSeconds = clamp(parseInt(env.COUNTDOWN_SECONDS, 10) || 8, 2, 60);

    // -----------------------------------------------------------
    // 6. Render the splash page
    // -----------------------------------------------------------
    const backgroundImageUrl = sanitizeImageUrl(env.BACKGROUND_IMAGE_URL);
    const logoUrl = sanitizeImageUrl(env.LOGO_URL);
    const html = renderSplash({
      config,
      legacyHost,
      countdownSeconds,
      language,
      variant,
      orgName: env.ORG_NAME,
      supportEmail: env.SUPPORT_EMAIL,
      theme,
      backgroundImageUrl,
      logoUrl,
    });

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        // Prevent intermediate caches from serving stale splash pages
        // while still letting the browser keep a short cached copy
        'cache-control': 'public, max-age=60, must-revalidate',
        // Security headers — appropriate for a public-facing splash
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'referrer-policy': 'no-referrer',
        // Conservative CSP — only inline styles & scripts (we ship both inline)
        // img-src allows https: so customers can provide a background image
        // or logo hosted on their own CDN. data: URIs also supported for
        // small inline images. No other resource types can be loaded.
        'content-security-policy':
          "default-src 'none'; " +
          "style-src 'unsafe-inline'; " +
          "script-src 'unsafe-inline'; " +
          "img-src 'self' data: https:; " +
          "connect-src 'self'; " +
          "form-action 'none'; " +
          "base-uri 'none'; " +
          "frame-ancestors 'none';",
        // Allow the page to render in the browser's preferred color scheme
        'color-scheme': 'light dark',
        // Custom header for monitoring/debugging
        'x-redirect-splash-variant': variant,
        'x-redirect-splash-lang': language,
      },
    });
  },
};

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

/**
 * Append safe forwarded query parameters from the legacy URL to the destination.
 * Excludes splash-specific parameters that shouldn't follow the user.
 */
function appendForwardedParams(destination: string, source: URL, exclude: string[]): string {
  const dest = new URL(destination);
  for (const [key, value] of source.searchParams.entries()) {
    if (exclude.includes(key)) continue;
    if (!dest.searchParams.has(key)) {
      dest.searchParams.append(key, value);
    }
  }
  return dest.toString();
}

/**
 * Clamp a number between min and max.
 */
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Sanitize a customer-provided image URL.
 *
 * We only accept:
 *   - https:// URLs (so customers can host wherever they like)
 *   - data: URIs (for inline embedded images)
 *
 * Anything else (http:, javascript:, file:, etc.) is rejected and
 * treated as if the URL was not configured. This keeps the CSP and
 * the rendered HTML safe even if someone misconfigures the env var.
 */
function sanitizeImageUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
    return trimmed;
  }
  return undefined;
}

/**
 * Handle a beacon POST sent by the splash page client script.
 * Body: JSON { type, legacyHost, variant, language }
 */
async function handleBeacon(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as {
      type?: string;
      legacyHost?: string;
      variant?: string;
      language?: string;
    };

    // Validate event type
    const validEvents: AnalyticsEventType[] = [
      'splash_shown',
      'redirect_executed',
      'redirect_skipped',
      'bookmark_clicked',
      'dont_show_again',
      'manual_redirect',
      'language_changed',
      'theme_changed',
    ];

    if (!body.type || !validEvents.includes(body.type as AnalyticsEventType)) {
      return new Response('invalid event', { status: 400 });
    }

    const legacyHost = (body.legacyHost ?? '').slice(0, 100);
    if (!legacyHost) {
      return new Response('missing legacy host', { status: 400 });
    }

    const match = lookupRedirect(legacyHost);
    const newHost = match ? new URL(match.config.newUrl).hostname : 'unknown';
    const variant = (body.variant === 'A' || body.variant === 'B' || body.variant === 'C')
      ? body.variant
      : 'A';
    const language = (body.language ?? 'en') as SupportedLanguage;
    const countdown = parseInt(env.COUNTDOWN_SECONDS, 10) || 8;

    recordEvent(
      env.ANALYTICS,
      buildEvent(request, {
        type: body.type as AnalyticsEventType,
        legacyHost,
        newHost,
        variant,
        language,
        countdownSeconds: countdown,
        hadSkipFlag: false,
      }),
    );

    // 204 No Content — beacon protocol
    return new Response(null, { status: 204 });
  } catch {
    return new Response('bad request', { status: 400 });
  }
}
