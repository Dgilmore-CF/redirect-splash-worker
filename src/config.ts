/**
 * Redirect configuration map.
 *
 * Defines which legacy hostnames the worker handles and where they
 * should redirect to. The worker matches against `request.headers.get('host')`
 * (case-insensitive) so keys MUST be lowercase.
 *
 * To add a new redirect, append a new entry below.
 */

import type { RedirectMap } from './types.js';

export const REDIRECT_MAP: RedirectMap = {
  // ============================================================
  // Lab environment (DTG Lab)
  // ============================================================
  'hr.dtg-lab.net': {
    newUrl: 'https://hcmx.gmis.dtg-lab.net/psp/hrprd?cmd=login',
    serviceName: 'Human Resources Portal',
    description:
      'The HR portal has moved to a new secure location as part of our ongoing infrastructure modernization.',
    icon: 'people',
  },
  'fs.gmis.dtg-lab.net': {
    newUrl: 'https://fscmx.gmis.dtg-lab.net/psp/fsprd?cmd=login',
    serviceName: 'Financial Services Portal',
    description:
      'The Financial Services portal has moved to a new secure location as part of our ongoing infrastructure modernization.',
    icon: 'finance',
  },

  // ============================================================
  // Production placeholders — replace with customer values
  // ============================================================
  // 'hr.example.com': {
  //   newUrl: 'https://hcmx.example.com/psp/hrprd?cmd=login',
  //   serviceName: 'Human Resources Portal',
  //   description: 'The HR portal has moved to a new secure location.',
  //   icon: 'people',
  // },
};

/**
 * Look up redirect config for a given hostname.
 * Performs case-insensitive matching and strips port numbers.
 *
 * @returns the matched config, or `null` if the host is not handled.
 */
export function lookupRedirect(host: string | null): {
  legacyHost: string;
  config: ReturnType<typeof getConfig>;
} | null {
  if (!host) return null;
  const normalized = host.toLowerCase().split(':')[0];
  const config = REDIRECT_MAP[normalized];
  if (!config) return null;
  return { legacyHost: normalized, config };
}

function getConfig(key: string) {
  return REDIRECT_MAP[key];
}
