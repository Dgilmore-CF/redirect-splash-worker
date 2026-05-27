/**
 * Splash page HTML generator — COMPACT BANNER STYLE.
 *
 * Renders a tight notice banner pinned at the top of the viewport
 * (no scrolling required). All key information — service name, new URL,
 * copy button, countdown, continue button, bookmark hint, opt-out — fits
 * inside ~140px of vertical space at common viewport widths.
 *
 * Design principles:
 *   - Single, professional sans-serif (system stack — no web fonts)
 *   - Conservative palette (deep navy, slate gray, white)
 *   - All actionable elements above the fold, no scrolling needed
 *   - Inline SVG icons, no emoji in core UI
 *   - Server-rendered, fully self-contained (no external assets)
 *
 * Three layout variants are still supported (A/B/C) but they are all
 * compact — they differ in density, label placement, and visual weight,
 * not in overall page footprint.
 */

import type { SplashOptions, SupportedLanguage } from './types.js';
import { translations, format } from './i18n.js';

/**
 * Build the complete splash page HTML.
 */
export function renderSplash(opts: SplashOptions): string {
  const t = translations[opts.language];
  const { config, legacyHost, countdownSeconds, variant, theme } = opts;

  const newUrl = escapeHtml(config.newUrl);
  const newUrlJs = escapeJs(config.newUrl);
  const serviceName = escapeHtml(config.serviceName);
  const legacyHostHtml = escapeHtml(legacyHost);
  const orgNameHtml = escapeHtml(opts.orgName);
  const supportEmailHtml = escapeHtml(opts.supportEmail);
  const themeAttr = theme === 'auto' ? '' : ` data-theme="${theme}"`;
  const storageKey = `redirectSplash:hide:${legacyHost}`;

  // Optional branding inputs are sanitized by index.ts before we get here
  // — they are guaranteed to be either undefined or a safe https:/data: URL.
  // We still escape for HTML / CSS output as defense-in-depth.
  //
  // The URL is embedded inside a CSS url('...') inside an inline style
  // attribute (style="..."). Using single quotes inside url() keeps the
  // outer double-quoted HTML attribute valid.
  const bgUrl = opts.backgroundImageUrl
    ? escapeCssUrlInner(opts.backgroundImageUrl)
    : null;
  const logoUrl = opts.logoUrl ? escapeHtml(opts.logoUrl) : null;
  const bodyClass = bgUrl ? 'has-bg' : '';
  const bodyStyle = bgUrl ? ` style="--bg-image:url('${bgUrl}')"` : '';

  return `<!DOCTYPE html>
<html lang="${opts.language}"${themeAttr}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta name="referrer" content="no-referrer">
  <title>${escapeHtml(format(t.pageTitle, { serviceName: config.serviceName }))}</title>
  <style>${styles()}</style>
</head>
<body data-variant="${variant}" class="${bodyClass}"${bodyStyle}>
  <a href="#main" class="skip-link">Skip to main content</a>

  <div class="banner" role="alert" aria-labelledby="banner-title">
    ${renderVariant(variant, {
      t,
      serviceName,
      newUrl,
      legacyHostHtml,
      countdownSeconds,
      icon: iconSvg(config.icon),
      orgName: orgNameHtml,
      supportEmail: supportEmailHtml,
      language: opts.language,
      logoUrl,
    })}
  </div>

  <main id="main" class="page-body">
    <p class="muted small">
      ${escapeHtml(format(t.poweredBy, { org: opts.orgName }))}
      <span class="sep">·</span>
      <a href="mailto:${supportEmailHtml}">${supportEmailHtml}</a>
    </p>
  </main>

  <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>

  <script>${clientScript({
    newUrl: newUrlJs,
    countdownSeconds,
    storageKey: escapeJs(storageKey),
    legacyHost: escapeJs(legacyHost),
    variant,
    language: opts.language,
    copiedMessage: escapeJs(t.copied),
  })}</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
//  Variant-specific layouts (all compact)
// ---------------------------------------------------------------------------

interface VariantContext {
  t: (typeof translations)[SupportedLanguage];
  serviceName: string;
  newUrl: string;
  legacyHostHtml: string;
  countdownSeconds: number;
  icon: string;
  orgName: string;
  supportEmail: string;
  language: SupportedLanguage;
  logoUrl: string | null;
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

// Variant A — Minimalist horizontal strip
function variantA(ctx: VariantContext): string {
  return `
    <div class="banner__inner variant-a">
      <div class="banner__icon" aria-hidden="true">${ctx.icon}</div>
      <div class="banner__content">
        <div class="banner__row1">
          <strong id="banner-title">${escapeHtml(ctx.t.noticeHeading)}</strong>
          <span class="banner__sep">·</span>
          <span>${ctx.serviceName}</span>
        </div>
        <div class="banner__row2">
          <span class="muted">${escapeHtml(ctx.t.newUrlLabel)}:</span>
          <a class="url" id="new-url-link" href="${ctx.newUrl}">${ctx.newUrl}</a>
          <button class="btn-mini" type="button" id="copy-url" aria-label="${escapeHtml(ctx.t.copyLinkLabel)}" title="${escapeHtml(ctx.t.copyButton)}">${copySvg()}</button>
          <a class="btn-mini" id="bookmarklet" href="${ctx.newUrl}" title="${escapeHtml(ctx.t.bookmarkHeading)}: ${ctx.serviceName}">${bookmarkSvg()}</a>
        </div>
      </div>
      <div class="banner__actions">
        <span class="countdown" role="status" aria-live="polite">
          <span id="countdown">${ctx.countdownSeconds}</span><span class="muted">s</span>
        </span>
        <a class="btn btn--primary" id="go-now" href="${ctx.newUrl}">
          ${escapeHtml(ctx.t.goNowButton)} ${arrowSvg()}
        </a>
        ${controlsBlock(ctx)}
      </div>
    </div>
    ${dontShowAgainRow(ctx)}
  `;
}

// Variant B — Two-line detailed compact
function variantB(ctx: VariantContext): string {
  return `
    <div class="banner__inner variant-b">
      <div class="banner__icon" aria-hidden="true">${ctx.icon}</div>
      <div class="banner__content">
        <div class="banner__row1">
          <strong id="banner-title">${escapeHtml(ctx.t.noticeHeading)}</strong>
          <span class="banner__sep">·</span>
          <span>${ctx.serviceName}</span>
          <span class="banner__sep">·</span>
          <span class="muted small">${escapeHtml(ctx.t.legacyUrlLabel)}: <code>${ctx.legacyHostHtml}</code></span>
        </div>
        <div class="banner__row2">
          <span class="muted">${escapeHtml(ctx.t.newUrlLabel)}:</span>
          <a class="url" id="new-url-link" href="${ctx.newUrl}">${ctx.newUrl}</a>
          <button class="btn-mini" type="button" id="copy-url" aria-label="${escapeHtml(ctx.t.copyLinkLabel)}" title="${escapeHtml(ctx.t.copyButton)}">${copySvg()}</button>
          <a class="btn-mini" id="bookmarklet" href="${ctx.newUrl}" title="${escapeHtml(ctx.t.bookmarkHeading)}: ${ctx.serviceName}">${bookmarkSvg()}</a>
          <span class="muted small bookmark-hint">
            <kbd>${escapeHtml(ctx.t.shortcutKey)}</kbd> ${escapeHtml(ctx.t.shortcutHint)}
          </span>
        </div>
      </div>
      <div class="banner__actions">
        <span class="countdown" role="status" aria-live="polite">
          <span id="countdown">${ctx.countdownSeconds}</span><span class="muted">s</span>
        </span>
        <a class="btn btn--primary" id="go-now" href="${ctx.newUrl}">
          ${escapeHtml(ctx.t.goNowButton)} ${arrowSvg()}
        </a>
        ${controlsBlock(ctx)}
      </div>
    </div>
    ${dontShowAgainRow(ctx)}
  `;
}

// Variant C — Formal government-style with eyebrow + accent bar
function variantC(ctx: VariantContext): string {
  return `
    <div class="banner__inner variant-c">
      <div class="banner__accent" aria-hidden="true"></div>
      <div class="banner__icon" aria-hidden="true">${ctx.icon}</div>
      <div class="banner__content">
        <div class="banner__row1">
          <span class="eyebrow">${escapeHtml(ctx.t.noticeHeading).toUpperCase()}</span>
          <span class="banner__sep">·</span>
          <strong id="banner-title">${ctx.serviceName}</strong>
        </div>
        <div class="banner__row2">
          <span class="muted">${escapeHtml(ctx.t.newUrlLabel)}:</span>
          <a class="url" id="new-url-link" href="${ctx.newUrl}">${ctx.newUrl}</a>
          <button class="btn-mini" type="button" id="copy-url" aria-label="${escapeHtml(ctx.t.copyLinkLabel)}" title="${escapeHtml(ctx.t.copyButton)}">${copySvg()}</button>
          <a class="btn-mini" id="bookmarklet" href="${ctx.newUrl}" title="${escapeHtml(ctx.t.bookmarkHeading)}: ${ctx.serviceName}">${bookmarkSvg()}</a>
        </div>
      </div>
      <div class="banner__actions">
        <span class="countdown" role="status" aria-live="polite">
          <span id="countdown">${ctx.countdownSeconds}</span><span class="muted">s</span>
        </span>
        <a class="btn btn--primary" id="go-now" href="${ctx.newUrl}">
          ${escapeHtml(ctx.t.goNowButton)} ${arrowSvg()}
        </a>
        ${controlsBlock(ctx)}
      </div>
    </div>
    ${dontShowAgainRow(ctx)}
  `;
}

// ---------------------------------------------------------------------------
//  Shared fragments
// ---------------------------------------------------------------------------

function dontShowAgainRow(ctx: VariantContext): string {
  const brand = ctx.logoUrl
    ? `<img class="org-logo" src="${ctx.logoUrl}" alt="${ctx.orgName}" />`
    : `<span class="muted small org-badge">${ctx.orgName}</span>`;
  return `
    <div class="banner__footer">
      <label class="dsa">
        <input type="checkbox" id="hide-splash">
        <span>${escapeHtml(ctx.t.dontShowAgain)}</span>
      </label>
      ${brand}
    </div>
  `;
}

function controlsBlock(ctx: VariantContext): string {
  return `
    <div class="controls">
      ${languageSelector(ctx.language)}
      ${themeToggle(ctx.t)}
    </div>
  `;
}

function languageSelector(active: SupportedLanguage): string {
  const langs: Array<[SupportedLanguage, string]> = [
    ['en', 'EN'],
    ['es', 'ES'],
    ['fr', 'FR'],
    ['de', 'DE'],
    ['pt', 'PT'],
    ['ja', 'JA'],
  ];
  return `<select class="ctrl-select" id="lang-select" aria-label="Language">
    ${langs
      .map(
        ([code, label]) =>
          `<option value="${code}"${code === active ? ' selected' : ''}>${label}</option>`,
      )
      .join('')}
  </select>`;
}

function themeToggle(t: (typeof translations)[SupportedLanguage]): string {
  return `<select class="ctrl-select" id="theme-select" aria-label="${escapeHtml(t.themeToggle)}">
    <option value="auto">A</option>
    <option value="light">☀</option>
    <option value="dark">☾</option>
  </select>`;
}

// ---------------------------------------------------------------------------
//  Inline SVG icons
// ---------------------------------------------------------------------------

function iconSvg(name: 'people' | 'finance' | 'document' | 'generic'): string {
  switch (name) {
    case 'people':
      return `<svg viewBox="0 0 48 48" width="32" height="32" aria-hidden="true">
        <circle cx="24" cy="16" r="7" fill="none" stroke="currentColor" stroke-width="2.5"/>
        <path d="M10 40c0-7.732 6.268-14 14-14s14 6.268 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      </svg>`;
    case 'finance':
      return `<svg viewBox="0 0 48 48" width="32" height="32" aria-hidden="true">
        <rect x="6" y="18" width="36" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/>
        <path d="M6 14 L24 6 L42 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
        <line x1="14" y1="22" x2="14" y2="36" stroke="currentColor" stroke-width="2.5"/>
        <line x1="24" y1="22" x2="24" y2="36" stroke="currentColor" stroke-width="2.5"/>
        <line x1="34" y1="22" x2="34" y2="36" stroke="currentColor" stroke-width="2.5"/>
      </svg>`;
    case 'document':
      return `<svg viewBox="0 0 48 48" width="32" height="32" aria-hidden="true">
        <path d="M12 6 H30 L38 14 V42 H12 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M30 6 V14 H38" fill="none" stroke="currentColor" stroke-width="2.5"/>
      </svg>`;
    default:
      return `<svg viewBox="0 0 48 48" width="32" height="32" aria-hidden="true">
        <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" stroke-width="2.5"/>
        <path d="M24 14 V26 L32 30" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      </svg>`;
  }
}

function copySvg(): string {
  return `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
    <rect x="4" y="4" width="10" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M2 12 V3 a1 1 0 0 1 1 -1 H11" fill="none" stroke="currentColor" stroke-width="1.5"/>
  </svg>`;
}

function arrowSvg(): string {
  return `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
    <path d="M3 8 H13 M9 4 L13 8 L9 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function bookmarkSvg(): string {
  return `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
    <path d="M4 2 H12 V14 L8 11 L4 14 Z" fill="currentColor"/>
  </svg>`;
}

// ---------------------------------------------------------------------------
//  CSS — compact banner styling
// ---------------------------------------------------------------------------

function styles(): string {
  return `
    :root {
      --bg: #f4f5f7;
      --surface: #ffffff;
      --surface-2: #f9fafb;
      --text: #1a202c;
      --text-muted: #4a5568;
      --border: #e2e8f0;
      --border-strong: #cbd5e0;
      --primary: #1a365d;
      --primary-hover: #2c5282;
      --accent: #2b6cb0;
      --shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
      --radius: 4px;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
              "Helvetica Neue", Arial, sans-serif;
      --mono: "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
    }

    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --bg: #0f1419;
        --surface: #1a202c;
        --surface-2: #2d3748;
        --text: #e2e8f0;
        --text-muted: #a0aec0;
        --border: #2d3748;
        --border-strong: #4a5568;
        --primary: #63b3ed;
        --primary-hover: #90cdf4;
        --accent: #4299e1;
      }
    }
    [data-theme="dark"] {
      --bg: #0f1419;
      --surface: #1a202c;
      --surface-2: #2d3748;
      --text: #e2e8f0;
      --text-muted: #a0aec0;
      --border: #2d3748;
      --border-strong: #4a5568;
      --primary: #63b3ed;
      --primary-hover: #90cdf4;
      --accent: #4299e1;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: var(--font);
      font-size: 14px;
      line-height: 1.4;
      color: var(--text);
      background: var(--bg);
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* =================================================================
       Optional background image
       Activated when the body has class="has-bg" and CSS variable
       --bg-image is set on the body element. A translucent overlay
       maintains banner contrast against any photograph.
       ================================================================= */
    body.has-bg {
      background-image: var(--bg-image);
      background-size: cover;
      background-position: center center;
      background-repeat: no-repeat;
      background-attachment: fixed;
    }
    /* Subtle overlay so background never overpowers the banner. */
    body.has-bg::before {
      content: "";
      position: fixed;
      inset: 0;
      background: linear-gradient(
        180deg,
        rgba(244, 245, 247, 0.92) 0,
        rgba(244, 245, 247, 0.55) 240px,
        rgba(244, 245, 247, 0.20) 100%
      );
      pointer-events: none;
      z-index: 0;
    }
    body.has-bg .banner,
    body.has-bg .page-body,
    body.has-bg .toast { position: relative; z-index: 1; }

    @media (prefers-color-scheme: dark) {
      body.has-bg:not([data-theme="light"])::before {
        background: linear-gradient(
          180deg,
          rgba(15, 20, 25, 0.92) 0,
          rgba(15, 20, 25, 0.65) 240px,
          rgba(15, 20, 25, 0.35) 100%
        );
      }
    }
    body.has-bg[data-theme="dark"]::before {
      background: linear-gradient(
        180deg,
        rgba(15, 20, 25, 0.92) 0,
        rgba(15, 20, 25, 0.65) 240px,
        rgba(15, 20, 25, 0.35) 100%
      );
    }

    .skip-link {
      position: absolute; left: -9999px; top: 0;
      background: var(--primary); color: #fff;
      padding: 6px 12px; z-index: 100;
    }
    .skip-link:focus { left: 8px; top: 8px; }

    /* =================================================================
       Banner — pinned at top, professional and compact
       ================================================================= */
    .banner {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      box-shadow: var(--shadow);
    }

    .banner__inner {
      max-width: 1280px;
      margin: 0 auto;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      position: relative;
    }

    .banner__icon {
      flex-shrink: 0;
      color: var(--primary);
      display: flex;
      align-items: center;
    }

    .banner__content {
      flex: 1;
      min-width: 0;          /* allow the flex child to shrink so URLs wrap */
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .banner__row1,
    .banner__row2 {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      min-width: 0;
    }
    .banner__row1 { font-size: 0.95rem; }
    .banner__row2 { font-size: 0.85rem; }

    .banner__row1 strong { color: var(--text); font-weight: 600; }

    .banner__sep {
      color: var(--text-muted);
      opacity: 0.5;
      user-select: none;
    }

    .url {
      font-family: var(--mono);
      font-size: 0.85rem;
      color: var(--accent);
      text-decoration: none;
      word-break: break-all;
      max-width: 100%;
    }
    .url:hover { text-decoration: underline; }

    .banner__actions {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Variant C: left accent bar in the formal palette */
    .variant-c .banner__accent {
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 4px;
      background: var(--primary);
    }
    .variant-c .eyebrow {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: var(--text-muted);
    }

    .countdown {
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      color: var(--primary);
      font-size: 1.05rem;
      min-width: 2.5em;
      text-align: right;
    }
    .countdown .muted {
      font-weight: 400;
      font-size: 0.85rem;
      margin-left: 1px;
    }

    /* ---- Buttons ---------------------------------------------------- */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      border-radius: var(--radius);
      cursor: pointer;
      text-decoration: none;
      border: 1px solid transparent;
      white-space: nowrap;
      transition: background 0.12s;
    }
    .btn--primary {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
    }
    .btn--primary:hover {
      background: var(--primary-hover);
      border-color: var(--primary-hover);
    }
    .btn:focus { outline: 2px solid var(--accent); outline-offset: 2px; }

    .btn-mini {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      padding: 0;
      background: var(--surface-2);
      color: var(--text);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      cursor: pointer;
      text-decoration: none;
      transition: background 0.12s, border-color 0.12s;
    }
    .btn-mini:hover {
      background: var(--surface);
      border-color: var(--primary);
      color: var(--primary);
    }
    .btn-mini:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
    .btn-mini[id="bookmarklet"] { cursor: grab; }
    .btn-mini[id="bookmarklet"]:active { cursor: grabbing; }

    /* ---- Inline controls (lang / theme) ----------------------------- */
    .controls {
      display: flex;
      gap: 4px;
    }
    .ctrl-select {
      font-family: inherit;
      font-size: 0.75rem;
      padding: 4px 6px;
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      cursor: pointer;
      min-width: 38px;
    }
    .ctrl-select:focus { outline: 2px solid var(--accent); outline-offset: 1px; }

    /* ---- Footer row (don't-show-again + brand) ---------------------- */
    .banner__footer {
      max-width: 1280px;
      margin: 0 auto;
      padding: 4px 20px 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      font-size: 0.78rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
    }
    .dsa {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .dsa input { cursor: pointer; }
    .org-badge {
      letter-spacing: 0.05em;
      text-transform: uppercase;
      font-size: 0.7rem;
    }

    /* Customer-provided logo. Rendered at a fixed height so the banner
       footer keeps its compact dimensions regardless of source asset.
       Inverted in dark mode so monochrome logos stay readable. */
    .org-logo {
      height: 22px;
      width: auto;
      max-width: 180px;
      display: block;
      opacity: 0.92;
    }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) .org-logo {
        filter: brightness(0) invert(1);
        opacity: 0.85;
      }
    }
    [data-theme="dark"] .org-logo {
      filter: brightness(0) invert(1);
      opacity: 0.85;
    }

    /* ---- Inline bookmark / hint ------------------------------------- */
    .bookmark-hint kbd {
      display: inline-block;
      padding: 1px 5px;
      font-family: var(--mono);
      font-size: 0.7rem;
      background: var(--surface);
      border: 1px solid var(--border-strong);
      border-radius: 3px;
      box-shadow: 0 1px 0 var(--border-strong);
    }

    code {
      font-family: var(--mono);
      font-size: 0.8rem;
      padding: 1px 4px;
      background: var(--surface-2);
      border-radius: 3px;
    }

    /* ---- Page body below banner ------------------------------------- */
    .page-body {
      padding: 12px 20px;
      max-width: 1280px;
      margin: 0 auto;
    }

    .muted { color: var(--text-muted); }
    .small { font-size: 0.78rem; }
    .sep { margin: 0 6px; opacity: 0.6; }

    a {
      color: var(--accent);
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }

    /* =================================================================
       Toast
       ================================================================= */
    .toast {
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--primary);
      color: #fff;
      padding: 8px 14px;
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      z-index: 1000;
      opacity: 0;
      font-size: 0.85rem;
      transition: opacity 0.2s;
    }
    .toast.show { opacity: 1; }

    /* =================================================================
       Responsive — stack actions on narrow viewports
       ================================================================= */
    @media (max-width: 860px) {
      .banner__inner {
        flex-wrap: wrap;
        padding: 10px 14px;
      }
      .banner__icon { display: none; }
      .banner__actions {
        width: 100%;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 8px;
      }
      .controls { margin-left: auto; }
    }

    @media (max-width: 520px) {
      body { font-size: 13px; }
      .banner__row1 { font-size: 0.9rem; }
      .banner__row2 { font-size: 0.8rem; }
      .bookmark-hint { display: none; }
      .url { font-size: 0.78rem; }
      .btn { padding: 6px 10px; font-size: 0.8rem; }
    }

    @media (prefers-reduced-motion: reduce) {
      * { transition-duration: 0.01ms !important; }
    }

    @media print {
      .banner__actions, .toast, .controls { display: none; }
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

      try {
        if (window.localStorage && localStorage.getItem(STORAGE_KEY) === 'true') {
          recordBeacon('redirect_skipped');
          window.location.replace(NEW_URL);
          return;
        }
      } catch (e) { /* localStorage unavailable */ }

      recordBeacon('splash_shown');

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

      var copyBtn = document.getElementById('copy-url');
      if (copyBtn) {
        copyBtn.addEventListener('click', function() {
          copyToClipboard(NEW_URL).then(function() {
            showToast(COPIED_MSG);
            recordBeacon('bookmark_clicked');
          });
        });
      }

      var bookmarklet = document.getElementById('bookmarklet');
      if (bookmarklet) {
        bookmarklet.addEventListener('click', function() {
          recordBeacon('bookmark_clicked');
        });
      }

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

      var langSelect = document.getElementById('lang-select');
      if (langSelect) {
        langSelect.addEventListener('change', function(e) {
          recordBeacon('language_changed');
          var u = new URL(window.location.href);
          u.searchParams.set('lang', e.target.value);
          window.location.href = u.toString();
        });
      }

      var themeSelect = document.getElementById('theme-select');
      if (themeSelect) {
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

      function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(text);
        }
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
        } catch (e) { /* ignore */ }
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

/**
 * Escape a URL for safe inclusion inside a CSS `url('...')` literal.
 *
 * The URL is wrapped by the caller in single quotes inside `url()`,
 * which is itself inside a double-quoted HTML `style="..."` attribute.
 * That layered escaping means we only need to neutralise three things
 * in the URL itself:
 *
 *   - `\`        — would interpret the next char as a CSS escape
 *   - `'`        — would terminate the single-quoted string
 *   - newlines   — would terminate the CSS string and break the page
 *
 * The URL is already validated by index.ts::sanitizeImageUrl (it must
 * start with https:// or data:image/) so this is defense-in-depth.
 *
 * Note: we deliberately do NOT escape `;`, `)`, `>` or other characters
 * that some legitimate URLs contain (e.g. data:image/png;base64,...).
 */
function escapeCssUrlInner(url: string): string {
  return url
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '')
    .replace(/\r/g, '');
}
