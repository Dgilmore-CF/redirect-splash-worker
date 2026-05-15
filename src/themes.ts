/**
 * Theme and A/B variant selection.
 *
 * We deterministically pick a variant from a hash of the visitor's
 * IP + user-agent so that the same user gets the same experience
 * for the duration of the migration. Override with ?variant=A|B|C
 * for QA testing.
 *
 * Variant A — Minimalist (small notice, clean lines, lots of whitespace)
 * Variant B — Detailed  (more information, step-by-step instructions)
 * Variant C — Government formal (official seal style, very structured)
 */

import type { SplashVariant } from './types.js';

const ALL_VARIANTS: SplashVariant[] = ['A', 'B', 'C'];

/**
 * Pick a stable variant for a given request.
 */
export function pickVariant(
  request: Request,
  enableAbTesting: boolean,
  url: URL,
): SplashVariant {
  // Explicit override always wins (for QA/preview)
  const override = url.searchParams.get('variant');
  if (override === 'A' || override === 'B' || override === 'C') {
    return override;
  }

  // If A/B testing is disabled, always show variant C (the most formal)
  if (!enableAbTesting) {
    return 'C';
  }

  // Hash IP + UA to deterministically bucket the user
  const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0';
  const ua = request.headers.get('user-agent') ?? '';
  const seed = stringHash(ip + ua);
  return ALL_VARIANTS[seed % ALL_VARIANTS.length];
}

/**
 * Cheap deterministic hash. Not cryptographic — only used for bucketing.
 */
function stringHash(s: string): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 33) ^ s.charCodeAt(i);
  }
  // Force positive
  return hash >>> 0;
}

/**
 * Resolve the user's theme preference from the request.
 * Order of precedence:
 *   1. ?theme= query parameter (light|dark|auto)
 *   2. theme= cookie (set by a previous toggle)
 *   3. 'auto' (let CSS prefers-color-scheme decide)
 */
export function resolveTheme(
  url: URL,
  cookieHeader: string | null,
): 'light' | 'dark' | 'auto' {
  const fromQuery = url.searchParams.get('theme');
  if (fromQuery === 'light' || fromQuery === 'dark' || fromQuery === 'auto') {
    return fromQuery;
  }

  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)theme=(light|dark|auto)/);
    if (match) {
      return match[1] as 'light' | 'dark' | 'auto';
    }
  }

  return 'auto';
}
