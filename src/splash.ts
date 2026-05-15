/**
 * Splash page HTML generator.
 *
 * Produces a self-contained HTML document (no external assets,
 * no CDN dependencies) so the page renders instantly. Inline CSS
 * follows a professional government/enterprise visual style:
 *
 *   - Sans-serif system fonts (no web font downloads)
 *   - Conservative color palette: deep navy, slate gray, white
 *   - Strong typographic hierarchy
 *   - Clear, accessible focus rings and color contrast
 *   - Server-rendered SVG icons (no emoji in the main UI)
 *
 * Three layout variants are supported (A/B/C) selected by themes.ts.
 */

import type { SplashOptions, SupportedLanguage } from './types.js';
import { translations, format } from './i18n.js';

/**
 * Build the complete splash page HTML.
 */
export function renderSplash(opts: SplashOptions): string {
  const t = translations[opts.language];
  const { config, legacyHost, countdownSeconds, variant, theme } = opts;

  // ---- Common values used across variants ------------------------------
  const newUrl = escapeHtml(config.newUrl);
  const newUrlJs = escapeJs(config.newUrl);
  const serviceName = escapeHtml(config.serviceName);
  const description = escapeHtml(config.description);
  const legacyHostHtml = escapeHtml(legacyHost);
  const orgNameHtml = escapeHtml(opts.orgName);
  const supportEmailHtml = escapeHtml(opts.supportEmail);
  const languageHtml = opts.language;
  const variantHtml = variant;
  const themeAttr = theme === 'auto' ? '' : ` data-theme="${theme}"`;

  // Storage key namespaced by host so different services don't share state
  const storageKey = `redirectSplash:hide:${legacyHost}`;

  // ---- HTML body -------------------------------------------------------
  return `<!DOCTYPE html>
<html lang="${languageHtml}"${themeAttr}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(format(t.pageTitle, { serviceName: config.serviceName }))}</title>
  <style>${styles()}</style>
</head>
<body data-variant="${variantHtml}">
  <a href="#main" class="skip-link">Skip to main content</a>

  <header class="top-bar" role="banner">
    <div class="container top-bar__inner">
      <div class="brand">
        ${officialMarkSvg()}
        <span class="brand__name">${orgNameHtml}</span>
      </div>
      <div class="top-bar__controls">
        ${languageSelector(opts.language)}
        ${themeToggle(t)}
      </div>
    </div>
  </header>

  <main id="main" class="container main" role="main">
    ${renderVariant(variant, {
      t,
      serviceName,
      description,
      newUrl,
      legacyHostHtml,
      countdownSeconds,
      icon: iconSvg(config.icon),
    })}

    <section class="card help-card" aria-labelledby="help-heading">
      <h2 id="help-heading">${escapeHtml(t.helpHeading)}</h2>
      <p>${escapeHtml(t.helpBody)}</p>
      <p class="help-card__contact">
        ${escapeHtml(format(t.supportContact, { email: opts.supportEmail }))
          .replace(supportEmailHtml, `<a href="mailto:${supportEmailHtml}">${supportEmailHtml}</a>`)}
      </p>
    </section>
  </main>

  <footer class="footer" role="contentinfo">
    <div class="container footer__inner">
      <span>${escapeHtml(format(t.poweredBy, { org: opts.orgName }))}</span>
      <span class="footer__meta">v=${variantHtml} · ${languageHtml}</span>
    </div>
  </footer>

  <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>

  <script>${clientScript({
    newUrl: newUrlJs,
    countdownSeconds,
    storageKey: escapeJs(storageKey),
    legacyHost: escapeJs(legacyHost),
    variant,
    language: languageHtml,
    copiedMessage: escapeJs(t.copied),
  })}</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
//  Variant-specific layouts
// ---------------------------------------------------------------------------

interface VariantContext {
  t: (typeof translations)[SupportedLanguage];
  serviceName: string;
  description: string;
  newUrl: string;
  legacyHostHtml: string;
  countdownSeconds: number;
  icon: string;
}

function renderVariant(variant: 'A' | 'B' | 'C', ctx: VariantContext): string {
  switch (variant) {
    case 'A':
      return variantA(ctx);
    case 'B':
      return variantB(ctx);
    case 'C':
      return variantC(ctx);
  }
}

// Variant A — Minimalist
function variantA(ctx: VariantContext): string {
  return `
    <section class="card notice-card variant-a" aria-labelledby="notice-heading">
      <div class="notice-card__icon">${ctx.icon}</div>
      <h1 id="notice-heading">${escapeHtml(ctx.t.noticeHeading)}</h1>
      <p class="notice-card__lede">${escapeHtml(
        format(ctx.t.noticeSubheading, { serviceName: ctx.serviceName }),
      )}</p>

      <div class="url-box">
        <span class="url-box__label">${escapeHtml(ctx.t.newUrlLabel)}</span>
        <a class="url-box__link" id="new-url-link" href="${ctx.newUrl}">${ctx.newUrl}</a>
        <button class="url-box__copy" type="button" id="copy-url" aria-label="${escapeHtml(ctx.t.copyLinkLabel)}">
          ${copySvg()} <span>${escapeHtml(ctx.t.copyButton)}</span>
        </button>
      </div>

      <div class="countdown" role="status" aria-live="polite">
        <span>${escapeHtml(ctx.t.redirectingIn)}</span>
        <span class="countdown__num" id="countdown">${ctx.countdownSeconds}</span>
        <span>${escapeHtml(ctx.t.seconds)}</span>
      </div>

      <div class="actions">
        <a class="btn btn--primary" id="go-now" href="${ctx.newUrl}">
          ${escapeHtml(ctx.t.goNowButton)} ${arrowSvg()}
        </a>
      </div>

      ${bookmarkBlock(ctx)}
      ${dontShowAgainBlock(ctx)}
    </section>
  `;
}

// Variant B — Detailed step-by-step
function variantB(ctx: VariantContext): string {
  return `
    <section class="card notice-card variant-b" aria-labelledby="notice-heading">
      <div class="notice-card__header">
        <div class="notice-card__icon">${ctx.icon}</div>
        <div>
          <h1 id="notice-heading">${escapeHtml(ctx.t.noticeHeading)}</h1>
          <p class="notice-card__lede">${escapeHtml(
            format(ctx.t.noticeSubheading, { serviceName: ctx.serviceName }),
          )}</p>
        </div>
      </div>

      <p class="notice-card__description">${ctx.description}</p>

      <div class="legacy-row">
        <span class="legacy-row__label">${escapeHtml(ctx.t.legacyUrlLabel)}:</span>
        <code>${ctx.legacyHostHtml}</code>
      </div>

      <ol class="steps">
        <li>
          <strong>${escapeHtml(ctx.t.newUrlLabel)}</strong>
          <div class="url-box">
            <a class="url-box__link" id="new-url-link" href="${ctx.newUrl}">${ctx.newUrl}</a>
            <button class="url-box__copy" type="button" id="copy-url" aria-label="${escapeHtml(ctx.t.copyLinkLabel)}">
              ${copySvg()} <span>${escapeHtml(ctx.t.copyButton)}</span>
            </button>
          </div>
        </li>
        <li>
          <strong>${escapeHtml(ctx.t.bookmarkHeading)}</strong>
          <p>${escapeHtml(ctx.t.bookmarkInstructionsDetail)}</p>
          <p class="bookmark-shortcut">
            <kbd>${escapeHtml(ctx.t.shortcutKey)}</kbd>
            <span class="muted">${escapeHtml(ctx.t.shortcutHint)}</span>
          </p>
          <p class="bookmarklet-hint">${escapeHtml(ctx.t.bookmarkletDragHint)}</p>
          <a class="bookmarklet" id="bookmarklet"
             href="${ctx.newUrl}"
             title="${escapeHtml(ctx.serviceName)}">
            ${bookmarkSvg()} ${escapeHtml(ctx.serviceName)}
          </a>
        </li>
      </ol>

      <div class="countdown" role="status" aria-live="polite">
        <span>${escapeHtml(ctx.t.redirectingIn)}</span>
        <span class="countdown__num" id="countdown">${ctx.countdownSeconds}</span>
        <span>${escapeHtml(ctx.t.seconds)}</span>
      </div>

      <div class="actions">
        <a class="btn btn--primary" id="go-now" href="${ctx.newUrl}">
          ${escapeHtml(ctx.t.goNowButton)} ${arrowSvg()}
        </a>
      </div>

      ${dontShowAgainBlock(ctx)}
    </section>
  `;
}

// Variant C — Government formal
function variantC(ctx: VariantContext): string {
  return `
    <section class="card notice-card variant-c" aria-labelledby="notice-heading">
      <div class="formal-header">
        <div class="formal-seal">${ctx.icon}</div>
        <div>
          <p class="formal-eyebrow">${escapeHtml(ctx.t.noticeHeading).toUpperCase()}</p>
          <h1 id="notice-heading">${ctx.serviceName}</h1>
        </div>
      </div>

      <div class="formal-divider"></div>

      <p class="notice-card__lede">${escapeHtml(
        format(ctx.t.noticeSubheading, { serviceName: ctx.serviceName }),
      )}</p>

      <p class="notice-card__description">${ctx.description}</p>

      <dl class="formal-grid">
        <dt>${escapeHtml(ctx.t.legacyUrlLabel)}</dt>
        <dd><code>https://${ctx.legacyHostHtml}/</code></dd>
        <dt>${escapeHtml(ctx.t.newUrlLabel)}</dt>
        <dd>
          <div class="url-box">
            <a class="url-box__link" id="new-url-link" href="${ctx.newUrl}">${ctx.newUrl}</a>
            <button class="url-box__copy" type="button" id="copy-url" aria-label="${escapeHtml(ctx.t.copyLinkLabel)}">
              ${copySvg()} <span>${escapeHtml(ctx.t.copyButton)}</span>
            </button>
          </div>
        </dd>
      </dl>

      <div class="countdown countdown--formal" role="status" aria-live="polite">
        <span>${escapeHtml(ctx.t.redirectingIn)}</span>
        <span class="countdown__num" id="countdown">${ctx.countdownSeconds}</span>
        <span>${escapeHtml(ctx.t.seconds)}</span>
      </div>

      <div class="actions">
        <a class="btn btn--primary" id="go-now" href="${ctx.newUrl}">
          ${escapeHtml(ctx.t.goNowButton)} ${arrowSvg()}
        </a>
      </div>

      ${bookmarkBlock(ctx)}
      ${dontShowAgainBlock(ctx)}
    </section>
  `;
}

// ---------------------------------------------------------------------------
//  Shared component fragments
// ---------------------------------------------------------------------------

function bookmarkBlock(ctx: VariantContext): string {
  return `
    <div class="bookmark-block">
      <h3>${escapeHtml(ctx.t.bookmarkHeading)}</h3>
      <p>${escapeHtml(ctx.t.bookmarkInstructions)}</p>
      <p class="bookmark-shortcut">
        <kbd>${escapeHtml(ctx.t.shortcutKey)}</kbd>
        <span class="muted">${escapeHtml(ctx.t.shortcutHint)}</span>
      </p>
      <p class="bookmarklet-hint">${escapeHtml(ctx.t.bookmarkletDragHint)}</p>
      <a class="bookmarklet" id="bookmarklet"
         href="${ctx.newUrl}"
         title="${escapeHtml(ctx.serviceName)}">
        ${bookmarkSvg()} ${escapeHtml(ctx.serviceName)}
      </a>
    </div>
  `;
}

function dontShowAgainBlock(ctx: VariantContext): string {
  return `
    <label class="dont-show-again">
      <input type="checkbox" id="hide-splash">
      <span>${escapeHtml(ctx.t.dontShowAgain)}</span>
    </label>
    <p class="dont-show-again__hint muted">${escapeHtml(ctx.t.dontShowAgainHint)}</p>
  `;
}

function languageSelector(active: SupportedLanguage): string {
  const langs: Array<[SupportedLanguage, string]> = [
    ['en', 'English'],
    ['es', 'Español'],
    ['fr', 'Français'],
    ['de', 'Deutsch'],
    ['pt', 'Português'],
    ['ja', '日本語'],
  ];
  return `<select class="lang-select" id="lang-select" aria-label="Language">
    ${langs
      .map(
        ([code, label]) =>
          `<option value="${code}"${code === active ? ' selected' : ''}>${label}</option>`,
      )
      .join('')}
  </select>`;
}

function themeToggle(t: (typeof translations)[SupportedLanguage]): string {
  return `<select class="theme-select" id="theme-select" aria-label="${escapeHtml(t.themeToggle)}">
    <option value="auto">${escapeHtml(t.themeAuto)}</option>
    <option value="light">${escapeHtml(t.themeLight)}</option>
    <option value="dark">${escapeHtml(t.themeDark)}</option>
  </select>`;
}

// ---------------------------------------------------------------------------
//  Inline SVG icons
// ---------------------------------------------------------------------------

function officialMarkSvg(): string {
  return `<svg class="brand__mark" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
    <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M16 7 L20 16 L16 25 L12 16 Z" fill="currentColor"/>
    <circle cx="16" cy="16" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
  </svg>`;
}

function iconSvg(name: 'people' | 'finance' | 'document' | 'generic'): string {
  switch (name) {
    case 'people':
      return `<svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
        <circle cx="24" cy="16" r="7" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M10 40c0-7.732 6.268-14 14-14s14 6.268 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
    case 'finance':
      return `<svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
        <rect x="6" y="18" width="36" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M6 14 L24 6 L42 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <line x1="12" y1="22" x2="12" y2="36" stroke="currentColor" stroke-width="2"/>
        <line x1="24" y1="22" x2="24" y2="36" stroke="currentColor" stroke-width="2"/>
        <line x1="36" y1="22" x2="36" y2="36" stroke="currentColor" stroke-width="2"/>
      </svg>`;
    case 'document':
      return `<svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
        <path d="M12 6 H30 L38 14 V42 H12 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M30 6 V14 H38" fill="none" stroke="currentColor" stroke-width="2"/>
        <line x1="18" y1="22" x2="32" y2="22" stroke="currentColor" stroke-width="2"/>
        <line x1="18" y1="28" x2="32" y2="28" stroke="currentColor" stroke-width="2"/>
        <line x1="18" y1="34" x2="26" y2="34" stroke="currentColor" stroke-width="2"/>
      </svg>`;
    default:
      return `<svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
        <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M24 14 V26 L32 30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
  }
}

function copySvg(): string {
  return `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <rect x="4" y="4" width="10" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M2 12 V3 a1 1 0 0 1 1 -1 H11" fill="none" stroke="currentColor" stroke-width="1.5"/>
  </svg>`;
}

function arrowSvg(): string {
  return `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path d="M3 8 H13 M9 4 L13 8 L9 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function bookmarkSvg(): string {
  return `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path d="M4 2 H12 V14 L8 11 L4 14 Z" fill="currentColor"/>
  </svg>`;
}

// ---------------------------------------------------------------------------
//  CSS — professional government / enterprise styling
// ---------------------------------------------------------------------------

function styles(): string {
  return `
    :root {
      --color-bg: #f4f5f7;
      --color-surface: #ffffff;
      --color-surface-2: #f9fafb;
      --color-text: #1a202c;
      --color-text-muted: #4a5568;
      --color-border: #e2e8f0;
      --color-border-strong: #cbd5e0;
      --color-primary: #1a365d;
      --color-primary-hover: #2c5282;
      --color-accent: #2b6cb0;
      --color-success: #276749;
      --color-warning: #c05621;
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
      --radius-sm: 4px;
      --radius-md: 6px;
      --radius-lg: 8px;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
                   "Helvetica Neue", Arial, sans-serif;
      --font-mono: "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
    }

    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --color-bg: #0f1419;
        --color-surface: #1a202c;
        --color-surface-2: #2d3748;
        --color-text: #e2e8f0;
        --color-text-muted: #a0aec0;
        --color-border: #2d3748;
        --color-border-strong: #4a5568;
        --color-primary: #63b3ed;
        --color-primary-hover: #90cdf4;
        --color-accent: #4299e1;
      }
    }

    [data-theme="dark"] {
      --color-bg: #0f1419;
      --color-surface: #1a202c;
      --color-surface-2: #2d3748;
      --color-text: #e2e8f0;
      --color-text-muted: #a0aec0;
      --color-border: #2d3748;
      --color-border-strong: #4a5568;
      --color-primary: #63b3ed;
      --color-primary-hover: #90cdf4;
      --color-accent: #4299e1;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: var(--font-sans);
      font-size: 16px;
      line-height: 1.5;
      color: var(--color-text);
      background: var(--color-bg);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .skip-link {
      position: absolute;
      left: -9999px;
      top: 0;
      background: var(--color-primary);
      color: #fff;
      padding: 8px 16px;
      z-index: 100;
    }
    .skip-link:focus { left: 8px; top: 8px; }

    .container {
      max-width: 760px;
      margin: 0 auto;
      padding: 0 24px;
    }

    /* ---- Top bar ----------------------------------------------------- */
    .top-bar {
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      padding: 16px 0;
    }
    .top-bar__inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: var(--color-primary);
      font-weight: 600;
      font-size: 0.95rem;
      letter-spacing: 0.025em;
    }
    .brand__mark { flex-shrink: 0; }
    .top-bar__controls {
      display: inline-flex;
      gap: 8px;
      align-items: center;
    }
    .lang-select,
    .theme-select {
      font-family: inherit;
      font-size: 0.85rem;
      padding: 6px 10px;
      background: var(--color-surface);
      color: var(--color-text);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .lang-select:focus,
    .theme-select:focus {
      outline: 2px solid var(--color-accent);
      outline-offset: 1px;
    }

    /* ---- Main / cards ------------------------------------------------ */
    .main {
      padding: 40px 24px 24px;
    }
    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      padding: 32px;
      margin-bottom: 20px;
    }

    .notice-card { position: relative; }
    .notice-card__icon {
      color: var(--color-primary);
      margin-bottom: 16px;
    }
    .notice-card__header {
      display: flex;
      gap: 20px;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    .notice-card__header .notice-card__icon { margin-bottom: 0; }
    h1 {
      font-size: 1.75rem;
      line-height: 1.25;
      margin: 0 0 8px;
      color: var(--color-text);
      letter-spacing: -0.01em;
    }
    .notice-card__lede {
      font-size: 1.1rem;
      color: var(--color-text-muted);
      margin: 0 0 20px;
    }
    .notice-card__description {
      color: var(--color-text-muted);
      margin: 0 0 20px;
    }
    h2 {
      font-size: 1.15rem;
      margin: 0 0 8px;
      color: var(--color-text);
    }
    h3 {
      font-size: 1rem;
      margin: 0 0 8px;
      color: var(--color-text);
    }

    /* ---- URL box ----------------------------------------------------- */
    .url-box {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 14px 16px;
      background: var(--color-surface-2);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      margin: 12px 0;
    }
    .url-box__label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.075em;
      color: var(--color-text-muted);
      font-weight: 600;
      margin-right: 4px;
    }
    .url-box__link {
      flex: 1;
      min-width: 240px;
      font-family: var(--font-mono);
      font-size: 0.9rem;
      color: var(--color-accent);
      word-break: break-all;
      text-decoration: none;
    }
    .url-box__link:hover { text-decoration: underline; }
    .url-box__copy {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      font-family: inherit;
      font-size: 0.85rem;
      background: var(--color-surface);
      color: var(--color-text);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background 0.15s;
    }
    .url-box__copy:hover {
      background: var(--color-surface-2);
      border-color: var(--color-primary);
    }
    .url-box__copy:focus {
      outline: 2px solid var(--color-accent);
      outline-offset: 1px;
    }

    /* ---- Countdown --------------------------------------------------- */
    .countdown {
      margin: 24px 0;
      padding: 16px 20px;
      background: var(--color-surface-2);
      border-left: 4px solid var(--color-primary);
      border-radius: var(--radius-sm);
      font-size: 1rem;
      color: var(--color-text);
    }
    .countdown__num {
      display: inline-block;
      min-width: 1.5em;
      text-align: center;
      font-weight: 700;
      font-size: 1.5em;
      color: var(--color-primary);
      font-variant-numeric: tabular-nums;
      margin: 0 4px;
    }
    .countdown--formal {
      text-align: center;
      border-left: none;
      border-top: 2px solid var(--color-primary);
      border-bottom: 2px solid var(--color-primary);
      border-radius: 0;
    }

    /* ---- Buttons ----------------------------------------------------- */
    .actions {
      margin: 24px 0;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 600;
      border-radius: var(--radius-md);
      cursor: pointer;
      text-decoration: none;
      border: 1px solid transparent;
      transition: background 0.15s, transform 0.05s;
    }
    .btn:active { transform: translateY(1px); }
    .btn--primary {
      background: var(--color-primary);
      color: #fff;
      border-color: var(--color-primary);
    }
    .btn--primary:hover {
      background: var(--color-primary-hover);
      border-color: var(--color-primary-hover);
    }
    .btn:focus {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }

    /* ---- Bookmark block ---------------------------------------------- */
    .bookmark-block {
      margin: 24px 0;
      padding: 20px;
      background: var(--color-surface-2);
      border-radius: var(--radius-md);
      border: 1px dashed var(--color-border-strong);
    }
    .bookmark-shortcut {
      margin: 8px 0;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    kbd {
      display: inline-block;
      padding: 4px 8px;
      font-family: var(--font-mono);
      font-size: 0.85rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      box-shadow: 0 1px 0 var(--color-border-strong);
    }
    .bookmarklet-hint {
      margin: 12px 0 6px;
      font-size: 0.9rem;
      color: var(--color-text-muted);
    }
    .bookmarklet {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      background: var(--color-primary);
      color: #fff;
      border-radius: var(--radius-sm);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: grab;
      user-select: none;
    }
    .bookmarklet:hover { background: var(--color-primary-hover); }
    .bookmarklet:active { cursor: grabbing; }

    /* ---- Don't show again ------------------------------------------- */
    .dont-show-again {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 20px 0 4px;
      cursor: pointer;
      font-size: 0.95rem;
    }
    .dont-show-again input { cursor: pointer; }
    .dont-show-again__hint {
      margin: 0 0 8px 24px;
      font-size: 0.85rem;
    }

    /* ---- Variant B specifics ---------------------------------------- */
    .legacy-row {
      padding: 8px 0;
      font-size: 0.9rem;
      color: var(--color-text-muted);
    }
    .legacy-row code {
      font-family: var(--font-mono);
      color: var(--color-text);
    }
    .steps {
      list-style: none;
      counter-reset: step;
      padding: 0;
      margin: 16px 0;
    }
    .steps li {
      counter-increment: step;
      padding: 16px 0 16px 56px;
      border-top: 1px solid var(--color-border);
      position: relative;
    }
    .steps li:first-child { border-top: none; }
    .steps li::before {
      content: counter(step);
      position: absolute;
      left: 0;
      top: 16px;
      width: 36px;
      height: 36px;
      background: var(--color-primary);
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1rem;
    }
    .steps li strong { display: block; margin-bottom: 8px; color: var(--color-text); }

    /* ---- Variant C (formal) ----------------------------------------- */
    .variant-c .formal-header {
      display: flex;
      gap: 20px;
      align-items: center;
      margin-bottom: 16px;
    }
    .variant-c .formal-seal {
      flex-shrink: 0;
      color: var(--color-primary);
      width: 64px;
      height: 64px;
      border: 2px solid var(--color-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .variant-c .formal-seal svg { width: 36px; height: 36px; }
    .variant-c .formal-eyebrow {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: var(--color-text-muted);
      margin: 0 0 4px;
    }
    .variant-c .formal-divider {
      height: 2px;
      background: var(--color-primary);
      margin: 16px 0;
    }
    .formal-grid {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 8px 16px;
      margin: 16px 0;
      font-size: 0.95rem;
    }
    .formal-grid dt {
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.075em;
      align-self: center;
    }
    .formal-grid dd { margin: 0; }
    .formal-grid dd code {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      padding: 2px 6px;
      background: var(--color-surface-2);
      border-radius: var(--radius-sm);
    }

    /* ---- Help / footer ---------------------------------------------- */
    .help-card { font-size: 0.95rem; }
    .help-card__contact { margin-top: 12px; }
    .help-card__contact a {
      color: var(--color-accent);
      text-decoration: none;
    }
    .help-card__contact a:hover { text-decoration: underline; }

    .footer {
      margin-top: 32px;
      padding: 16px 0;
      border-top: 1px solid var(--color-border);
      font-size: 0.85rem;
      color: var(--color-text-muted);
    }
    .footer__inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .footer__meta {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      opacity: 0.6;
    }

    /* ---- Toast notifications ---------------------------------------- */
    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-primary);
      color: #fff;
      padding: 12px 20px;
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-md);
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .toast.show {
      opacity: 1;
    }

    .muted { color: var(--color-text-muted); font-size: 0.9rem; }

    /* ---- Responsive --------------------------------------------------- */
    @media (max-width: 600px) {
      h1 { font-size: 1.5rem; }
      .card { padding: 24px 20px; }
      .url-box { flex-direction: column; align-items: stretch; }
      .url-box__copy { justify-content: center; }
      .notice-card__header { flex-direction: column; }
      .steps li { padding-left: 0; padding-top: 56px; }
      .steps li::before { top: 16px; left: 0; }
      .actions .btn { flex: 1; justify-content: center; }
    }

    /* ---- Reduced motion --------------------------------------------- */
    @media (prefers-reduced-motion: reduce) {
      * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
    }

    /* ---- Print -------------------------------------------------------- */
    @media print {
      .top-bar__controls, .actions, .toast { display: none; }
      .card { box-shadow: none; border: 1px solid #999; }
    }
  `;
}

// ---------------------------------------------------------------------------
//  Client-side script
// ---------------------------------------------------------------------------

interface ScriptOpts {
  newUrl: string;
  countdownSeconds: number;
  storageKey: string;
  legacyHost: string;
  variant: string;
  language: string;
  copiedMessage: string;
}

function clientScript(o: ScriptOpts): string {
  return `
    (function() {
      'use strict';
      var NEW_URL = "${o.newUrl}";
      var INITIAL_COUNT = ${o.countdownSeconds};
      var STORAGE_KEY = "${o.storageKey}";
      var LEGACY_HOST = "${o.legacyHost}";
      var VARIANT = "${o.variant}";
      var LANGUAGE = "${o.language}";
      var COPIED_MSG = "${o.copiedMessage}";

      // --- Honor saved "don't show again" preference ---------------------
      try {
        if (window.localStorage && localStorage.getItem(STORAGE_KEY) === 'true') {
          recordBeacon('redirect_skipped');
          window.location.replace(NEW_URL);
          return;
        }
      } catch (e) { /* localStorage may be unavailable; ignore */ }

      // --- Record splash shown -------------------------------------------
      recordBeacon('splash_shown');

      // --- Countdown ------------------------------------------------------
      var count = INITIAL_COUNT;
      var countEl = document.getElementById('countdown');
      var redirected = false;
      var interval = setInterval(function() {
        count -= 1;
        if (countEl) countEl.textContent = String(count);
        if (count <= 0) {
          clearInterval(interval);
          redirected = true;
          recordBeacon('redirect_executed');
          window.location.href = NEW_URL;
        }
      }, 1000);

      // --- Manual redirect button ----------------------------------------
      var goNow = document.getElementById('go-now');
      if (goNow) {
        goNow.addEventListener('click', function() {
          if (!redirected) {
            clearInterval(interval);
            redirected = true;
            recordBeacon('manual_redirect');
          }
        });
      }

      // --- Copy URL button -----------------------------------------------
      var copyBtn = document.getElementById('copy-url');
      if (copyBtn) {
        copyBtn.addEventListener('click', function() {
          copyToClipboard(NEW_URL).then(function() {
            showToast(COPIED_MSG);
            recordBeacon('bookmark_clicked');
          });
        });
      }

      // --- Bookmarklet click ---------------------------------------------
      var bookmarklet = document.getElementById('bookmarklet');
      if (bookmarklet) {
        bookmarklet.addEventListener('click', function(e) {
          // Allow the natural behavior but track it
          recordBeacon('bookmark_clicked');
        });
      }

      // --- "Don't show again" checkbox -----------------------------------
      var hideCheckbox = document.getElementById('hide-splash');
      if (hideCheckbox) {
        hideCheckbox.addEventListener('change', function(e) {
          try {
            if (e.target.checked) {
              localStorage.setItem(STORAGE_KEY, 'true');
              recordBeacon('dont_show_again');
            } else {
              localStorage.removeItem(STORAGE_KEY);
            }
          } catch (err) { /* ignore */ }
        });
      }

      // --- Language selector ---------------------------------------------
      var langSelect = document.getElementById('lang-select');
      if (langSelect) {
        langSelect.addEventListener('change', function(e) {
          recordBeacon('language_changed');
          var u = new URL(window.location.href);
          u.searchParams.set('lang', e.target.value);
          window.location.href = u.toString();
        });
      }

      // --- Theme selector ------------------------------------------------
      var themeSelect = document.getElementById('theme-select');
      if (themeSelect) {
        // Initialize from current
        var current = document.documentElement.getAttribute('data-theme') || 'auto';
        themeSelect.value = current;
        themeSelect.addEventListener('change', function(e) {
          var newTheme = e.target.value;
          if (newTheme === 'auto') {
            document.documentElement.removeAttribute('data-theme');
          } else {
            document.documentElement.setAttribute('data-theme', newTheme);
          }
          document.cookie = 'theme=' + newTheme + '; path=/; max-age=31536000; samesite=lax';
          recordBeacon('theme_changed');
        });
      }

      // --- Helpers --------------------------------------------------------
      function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(text);
        }
        // Fallback for older browsers
        return new Promise(function(resolve) {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); } catch (e) {}
          document.body.removeChild(ta);
          resolve();
        });
      }

      function showToast(msg) {
        var t = document.getElementById('toast');
        if (!t) return;
        t.textContent = msg;
        t.hidden = false;
        t.classList.add('show');
        setTimeout(function() {
          t.classList.remove('show');
          setTimeout(function() { t.hidden = true; }, 200);
        }, 2000);
      }

      function recordBeacon(eventType) {
        try {
          var body = JSON.stringify({
            type: eventType,
            legacyHost: LEGACY_HOST,
            variant: VARIANT,
            language: LANGUAGE
          });
          if (navigator.sendBeacon) {
            navigator.sendBeacon('/__redirect_splash_event', body);
          } else {
            fetch('/__redirect_splash_event', {
              method: 'POST',
              body: body,
              headers: { 'content-type': 'application/json' },
              keepalive: true
            }).catch(function() {});
          }
        } catch (e) { /* ignore beacon failures */ }
      }
    })();
  `;
}

// ---------------------------------------------------------------------------
//  Escaping helpers
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJs(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');
}
