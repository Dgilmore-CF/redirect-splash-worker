/**
 * Worker integration tests
 *
 * These run against the actual worker bundle via @cloudflare/vitest-pool-workers
 * which provides a Miniflare-backed test environment. Use SELF.fetch() to
 * invoke the worker as if it were receiving a real request.
 */

import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';

const LAB_HR_HOST = 'hr.dtg-lab.net';
const LAB_FS_HOST = 'fs.gmis.dtg-lab.net';

describe('redirect-splash worker', () => {
  describe('hostname routing', () => {
    it('returns 404 for unknown hostnames', async () => {
      const res = await SELF.fetch('http://unknown.example.com/');
      expect(res.status).toBe(404);
    });

    it('renders splash for HR legacy hostname', async () => {
      const res = await SELF.fetch('http://localhost/', {
        headers: { host: LAB_HR_HOST },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
      const body = await res.text();
      expect(body).toContain('Human Resources Portal');
      expect(body).toContain('hcmx.gmis.dtg-lab.net');
    });

    it('renders splash for FS legacy hostname', async () => {
      const res = await SELF.fetch('http://localhost/', {
        headers: { host: LAB_FS_HOST },
      });
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('Financial Services Portal');
      expect(body).toContain('fscmx.gmis.dtg-lab.net');
    });
  });

  describe('immediate redirect signals', () => {
    it('redirects when ?skip=1 is present', async () => {
      const res = await SELF.fetch('http://localhost/?skip=1', {
        headers: { host: LAB_HR_HOST },
        redirect: 'manual',
      });
      expect([301, 302, 303, 307, 308]).toContain(res.status);
      expect(res.headers.get('location')).toContain('hcmx.gmis.dtg-lab.net');
    });

    it('redirects when ?redirect is present', async () => {
      const res = await SELF.fetch('http://localhost/?redirect', {
        headers: { host: LAB_HR_HOST },
        redirect: 'manual',
      });
      expect([301, 302, 303, 307, 308]).toContain(res.status);
    });

    it('redirects when hideSplash cookie is set', async () => {
      const res = await SELF.fetch('http://localhost/', {
        headers: { host: LAB_HR_HOST, cookie: 'hideSplash=1' },
        redirect: 'manual',
      });
      expect([301, 302, 303, 307, 308]).toContain(res.status);
    });

    it('forwards safe query params on redirect', async () => {
      const res = await SELF.fetch('http://localhost/?skip=1&deeplink=foo', {
        headers: { host: LAB_HR_HOST },
        redirect: 'manual',
      });
      const location = res.headers.get('location') ?? '';
      expect(location).toContain('deeplink=foo');
      // Internal splash params should not leak forward
      expect(location).not.toContain('skip=1');
    });
  });

  describe('localization', () => {
    it('uses query param to override language', async () => {
      const res = await SELF.fetch('http://localhost/?lang=es', {
        headers: { host: LAB_HR_HOST },
      });
      const body = await res.text();
      // "Nueva URL" appears in row2 of every variant (not uppercased)
      // and is the same Spanish label across all three layouts.
      expect(body).toContain('Nueva URL');
      // Also verify the page title (always present) uses the Spanish form.
      expect(body).toContain('Aviso de servicio');
      expect(res.headers.get('x-redirect-splash-lang')).toBe('es');
    });

    it('honors Accept-Language', async () => {
      const res = await SELF.fetch('http://localhost/', {
        headers: {
          host: LAB_HR_HOST,
          'accept-language': 'fr-FR,fr;q=0.9',
        },
      });
      expect(res.headers.get('x-redirect-splash-lang')).toBe('fr');
    });

    it('falls back to English for unsupported languages', async () => {
      const res = await SELF.fetch('http://localhost/?lang=xx', {
        headers: { host: LAB_HR_HOST },
      });
      // Accept-Language not set, so we should fall back to default (en)
      expect(res.headers.get('x-redirect-splash-lang')).toBe('en');
    });
  });

  describe('variants', () => {
    it('honors ?variant=A', async () => {
      const res = await SELF.fetch('http://localhost/?variant=A', {
        headers: { host: LAB_HR_HOST },
      });
      expect(res.headers.get('x-redirect-splash-variant')).toBe('A');
    });

    it('honors ?variant=B', async () => {
      const res = await SELF.fetch('http://localhost/?variant=B', {
        headers: { host: LAB_HR_HOST },
      });
      expect(res.headers.get('x-redirect-splash-variant')).toBe('B');
    });

    it('honors ?variant=C', async () => {
      const res = await SELF.fetch('http://localhost/?variant=C', {
        headers: { host: LAB_HR_HOST },
      });
      expect(res.headers.get('x-redirect-splash-variant')).toBe('C');
    });

    it('renders different layouts for each variant', async () => {
      const responses = await Promise.all(
        (['A', 'B', 'C'] as const).map(async (v) => {
          const res = await SELF.fetch(`http://localhost/?variant=${v}`, {
            headers: { host: LAB_HR_HOST },
          });
          return res.text();
        }),
      );
      // Each variant should include the variant marker in the body
      expect(responses[0]).toContain('data-variant="A"');
      expect(responses[1]).toContain('data-variant="B"');
      expect(responses[2]).toContain('data-variant="C"');
    });
  });

  describe('beacon endpoint', () => {
    it('accepts valid beacon events', async () => {
      const res = await SELF.fetch('http://localhost/__redirect_splash_event', {
        method: 'POST',
        body: JSON.stringify({
          type: 'splash_shown',
          legacyHost: LAB_HR_HOST,
          variant: 'A',
          language: 'en',
        }),
      });
      expect(res.status).toBe(204);
    });

    it('rejects beacons without a type', async () => {
      const res = await SELF.fetch('http://localhost/__redirect_splash_event', {
        method: 'POST',
        body: JSON.stringify({ legacyHost: LAB_HR_HOST }),
      });
      expect(res.status).toBe(400);
    });

    it('rejects beacons with invalid type', async () => {
      const res = await SELF.fetch('http://localhost/__redirect_splash_event', {
        method: 'POST',
        body: JSON.stringify({
          type: '../../etc/passwd',
          legacyHost: LAB_HR_HOST,
        }),
      });
      expect(res.status).toBe(400);
    });

    it('rejects malformed JSON', async () => {
      const res = await SELF.fetch('http://localhost/__redirect_splash_event', {
        method: 'POST',
        body: 'not json',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('health endpoint', () => {
    it('returns 200 with environment info', async () => {
      const res = await SELF.fetch('http://localhost/__health');
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string; environment: string };
      expect(body.status).toBe('ok');
      expect(body.environment).toBeDefined();
    });
  });

  describe('security headers', () => {
    it('sets a strict CSP', async () => {
      const res = await SELF.fetch('http://localhost/', {
        headers: { host: LAB_HR_HOST },
      });
      const csp = res.headers.get('content-security-policy');
      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('allows https images for customer branding', async () => {
      const res = await SELF.fetch('http://localhost/', {
        headers: { host: LAB_HR_HOST },
      });
      const csp = res.headers.get('content-security-policy');
      // Customers need to be able to point at their own CDN-hosted logos
      // and background images.
      expect(csp).toContain('img-src');
      expect(csp).toContain('https:');
    });

    it('sets X-Frame-Options DENY', async () => {
      const res = await SELF.fetch('http://localhost/', {
        headers: { host: LAB_HR_HOST },
      });
      expect(res.headers.get('x-frame-options')).toBe('DENY');
    });

    it('disallows search engine indexing', async () => {
      const res = await SELF.fetch('http://localhost/', {
        headers: { host: LAB_HR_HOST },
      });
      const body = await res.text();
      expect(body).toContain('noindex');
    });
  });

  // -------------------------------------------------------------------
  // Branding (optional background image + logo) tests
  // -------------------------------------------------------------------
  // The deployed binding for BACKGROUND_IMAGE_URL / LOGO_URL is empty
  // by default, so when the worker is invoked without configured branding
  // we should NOT see the has-bg class or any background-image style on
  // the body element. These tests cover the default (off) state.
  describe('branding (defaults off)', () => {
    it('does not render a background image when no URL is configured', async () => {
      const res = await SELF.fetch('http://localhost/', {
        headers: { host: LAB_HR_HOST },
      });
      const html = await res.text();

      // Inspect the <body> tag specifically — the CSS section legitimately
      // mentions the has-bg class in comments and selectors, so we need a
      // precise match on the rendered element rather than a substring search.
      const bodyTag = html.match(/<body[^>]*>/)?.[0] ?? '';
      expect(bodyTag).not.toContain('has-bg');
      // The CSS variable should not be set on the body when no image is
      // configured (the style attribute should be absent entirely).
      expect(bodyTag).not.toContain('--bg-image');
    });

    it('does not render an <img> logo when no logo URL is configured', async () => {
      const res = await SELF.fetch('http://localhost/', {
        headers: { host: LAB_HR_HOST },
      });
      const html = await res.text();
      // Falls back to the text badge with the org name.
      expect(html).toContain('class="muted small org-badge"');
      // No <img> element with org-logo class should be rendered.
      expect(html).not.toMatch(/<img[^>]*class="org-logo"/);
    });
  });
});
