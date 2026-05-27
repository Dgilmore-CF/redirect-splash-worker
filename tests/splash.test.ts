/**
 * Direct unit tests for the splash renderer.
 *
 * These bypass the worker fetch handler and exercise renderSplash() so
 * we can vary the input options (specifically backgroundImageUrl and
 * logoUrl) without having to redeploy with different env vars.
 */

import { describe, it, expect } from 'vitest';
import { renderSplash } from '../src/splash.js';
import type { SplashOptions } from '../src/types.js';

function makeOpts(overrides: Partial<SplashOptions> = {}): SplashOptions {
  return {
    config: {
      newUrl: 'https://new.example.com/login',
      serviceName: 'Example Portal',
      description: 'Example service description.',
      icon: 'people',
    },
    legacyHost: 'old.example.com',
    countdownSeconds: 5,
    language: 'en',
    variant: 'A',
    orgName: 'Example Org',
    supportEmail: 'support@example.com',
    theme: 'auto',
    ...overrides,
  };
}

describe('renderSplash branding', () => {
  describe('background image', () => {
    it('renders without background by default', () => {
      const html = renderSplash(makeOpts());
      const bodyTag = html.match(/<body[^>]*>/)?.[0] ?? '';
      expect(bodyTag).not.toContain('has-bg');
      expect(bodyTag).not.toContain('--bg-image');
    });

    it('applies has-bg class and CSS variable when an https URL is provided', () => {
      const html = renderSplash(
        makeOpts({ backgroundImageUrl: 'https://cdn.example.com/bg.jpg' }),
      );
      const bodyTag = html.match(/<body[^>]*>/)?.[0] ?? '';
      expect(bodyTag).toContain('has-bg');
      // URL is wrapped in single quotes so the outer style="..." stays
      // a well-formed HTML attribute.
      expect(bodyTag).toContain("--bg-image:url('https://cdn.example.com/bg.jpg')");
    });

    it('accepts data: URIs including base64 payloads with semicolons', () => {
      const dataUri =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const html = renderSplash(makeOpts({ backgroundImageUrl: dataUri }));
      const bodyTag = html.match(/<body[^>]*>/)?.[0] ?? '';
      expect(bodyTag).toContain('has-bg');
      // Data URI characters (;, =, /, +) must survive escaping intact.
      expect(bodyTag).toContain(dataUri);
    });

    it("escapes single quotes that would terminate the url('') string", () => {
      // The Worker's sanitizeImageUrl would reject this, but renderSplash
      // is also called from tests / future code paths so it defends itself.
      const malicious = "https://x.com/a');background:red;--('";
      const html = renderSplash(makeOpts({ backgroundImageUrl: malicious }));
      const bodyTag = html.match(/<body[^>]*>/)?.[0] ?? '';

      // Every literal single quote from the input must be escaped — i.e.
      // preceded by a backslash. Walk the URL portion of the body tag and
      // confirm there are no unescaped single quotes that could break
      // out of the url('...') CSS string.
      const urlMatch = bodyTag.match(/url\('(.*)'\)/);
      expect(urlMatch).not.toBeNull();
      const inside = urlMatch![1];
      // Count single quotes that are NOT preceded by a backslash
      const unescaped = inside.match(/(?<!\\)'/g);
      expect(unescaped).toBeNull();
      // And confirm the escape character is present
      expect(inside).toContain("\\'");
    });

    it('produces a syntactically valid HTML <body> tag', () => {
      const html = renderSplash(
        makeOpts({ backgroundImageUrl: 'https://cdn.example.com/bg.jpg' }),
      );
      // No unbalanced double-quote pairs in the body tag attributes.
      const bodyTag = html.match(/<body[^>]*>/)?.[0] ?? '';
      const dqCount = (bodyTag.match(/"/g) ?? []).length;
      expect(dqCount % 2).toBe(0);
    });
  });

  describe('logo', () => {
    it('renders an org name badge by default', () => {
      const html = renderSplash(makeOpts());
      expect(html).toContain('class="muted small org-badge"');
      expect(html).not.toMatch(/<img[^>]*class="org-logo"/);
    });

    it('renders an <img> with the configured logo URL', () => {
      const html = renderSplash(
        makeOpts({ logoUrl: 'https://cdn.example.com/logo.svg' }),
      );
      expect(html).toMatch(
        /<img[^>]*class="org-logo"[^>]*src="https:\/\/cdn\.example\.com\/logo\.svg"/,
      );
      // The text badge should NOT also render — only one or the other
      expect(html).not.toContain('class="muted small org-badge"');
    });

    it('uses the org name as the logo alt text for accessibility', () => {
      const html = renderSplash(
        makeOpts({
          orgName: 'Tennessee Department of Lab',
          logoUrl: 'https://cdn.example.com/seal.png',
        }),
      );
      expect(html).toContain('alt="Tennessee Department of Lab"');
    });
  });
});
