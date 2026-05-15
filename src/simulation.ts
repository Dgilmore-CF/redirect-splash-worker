/**
 * Simulation Worker
 * -----------------
 * A separate Worker that hosts the *destination* pages so you can do
 * full end-to-end testing in the lab without needing real backend
 * applications. It serves:
 *
 *   - hcmx.gmis.dtg-lab.net  → fake "HR Portal" login page
 *   - fscmx.gmis.dtg-lab.net → fake "Financial Services" login page
 *
 * Pages are intentionally simple but professional-looking so QA can
 * verify the user journey end-to-end: legacy URL → splash → new portal.
 */

interface SimEnv {
  ENVIRONMENT: string;
}

interface PortalConfig {
  title: string;
  description: string;
  appId: string;
  brandColor: string;
  realm: string;
}

const PORTALS: Record<string, PortalConfig> = {
  'hcmx.gmis.dtg-lab.net': {
    title: 'Human Resources Portal',
    description: 'HCM Enterprise · Production',
    appId: 'hrprd',
    brandColor: '#1a365d',
    realm: 'HR',
  },
  'fscmx.gmis.dtg-lab.net': {
    title: 'Financial Services Portal',
    description: 'Financial Systems · Production',
    appId: 'fsprd',
    brandColor: '#234e52',
    realm: 'FS',
  },
};

export default {
  async fetch(request: Request, env: SimEnv): Promise<Response> {
    const url = new URL(request.url);
    const host = (request.headers.get('host') ?? url.host).toLowerCase().split(':')[0];

    if (url.pathname === '/__health') {
      return new Response(JSON.stringify({ status: 'ok', env: env.ENVIRONMENT, host }), {
        headers: { 'content-type': 'application/json' },
      });
    }

    const portal = PORTALS[host];
    if (!portal) {
      return new Response('Portal not found for host: ' + host, { status: 404 });
    }

    // Check expected path. Real portal lives at /psp/<appId>?cmd=login
    const expectedPath = `/psp/${portal.appId}`;
    if (!url.pathname.startsWith(expectedPath)) {
      return Response.redirect(
        `https://${host}${expectedPath}?cmd=login`,
        302,
      );
    }

    return new Response(renderPortal(portal, host), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  },
};

function renderPortal(p: PortalConfig, host: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(p.title)} — Sign In</title>
  <style>
    * { box-sizing: border-box; }
    :root {
      --brand: ${p.brandColor};
      --brand-hover: color-mix(in srgb, ${p.brandColor} 80%, black);
      --bg: #f4f5f7;
      --surface: #ffffff;
      --text: #1a202c;
      --muted: #4a5568;
      --border: #e2e8f0;
      --radius: 6px;
    }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .topbar {
      background: var(--brand);
      color: white;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.95rem;
      font-weight: 600;
    }
    .topbar__realm {
      margin-left: auto;
      font-size: 0.75rem;
      font-weight: 400;
      opacity: 0.85;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
    }
    .card {
      background: var(--surface);
      width: 100%;
      max-width: 440px;
      padding: 36px 32px;
      border-radius: var(--radius);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
      border: 1px solid var(--border);
    }
    h1 {
      margin: 0 0 4px;
      font-size: 1.6rem;
      color: var(--brand);
      letter-spacing: -0.01em;
    }
    .subtitle {
      color: var(--muted);
      margin: 0 0 28px;
      font-size: 0.9rem;
    }
    label {
      display: block;
      margin-top: 16px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text);
    }
    input {
      width: 100%;
      padding: 10px 12px;
      margin-top: 6px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 1rem;
      font-family: inherit;
    }
    input:focus {
      outline: 2px solid var(--brand);
      outline-offset: 1px;
      border-color: var(--brand);
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 20px 0;
      font-size: 0.85rem;
    }
    .row label { margin: 0; font-weight: 400; color: var(--muted); }
    .row a { color: var(--brand); text-decoration: none; }
    .row a:hover { text-decoration: underline; }
    button {
      width: 100%;
      padding: 12px;
      background: var(--brand);
      color: white;
      border: none;
      border-radius: var(--radius);
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    button:hover { background: var(--brand-hover); }
    button:focus { outline: 2px solid var(--brand-hover); outline-offset: 2px; }
    .sim-banner {
      background: #fef3c7;
      color: #78350f;
      padding: 10px 16px;
      border-radius: var(--radius);
      font-size: 0.8rem;
      margin-bottom: 20px;
      border: 1px solid #f59e0b;
    }
    .sim-banner strong { font-weight: 700; }
    footer {
      text-align: center;
      padding: 20px;
      color: var(--muted);
      font-size: 0.8rem;
      border-top: 1px solid var(--border);
      background: var(--surface);
    }
    .footer-host {
      font-family: "SF Mono", Menlo, Consolas, monospace;
      font-size: 0.75rem;
      opacity: 0.7;
    }
  </style>
</head>
<body>
  <div class="topbar">
    <span>${escapeHtml(p.title)}</span>
    <span class="topbar__realm">${escapeHtml(p.realm)}</span>
  </div>
  <div class="container">
    <div class="card">
      <div class="sim-banner">
        <strong>⚠ Simulation Environment</strong> — This is a lab simulation. No credentials are validated and no data is stored.
      </div>
      <h1>Sign In</h1>
      <p class="subtitle">${escapeHtml(p.description)}</p>
      <form onsubmit="event.preventDefault(); alert('This is a simulated portal. Login submission is not processed.');">
        <label>
          User ID
          <input type="text" required autocomplete="username" placeholder="Enter your User ID">
        </label>
        <label>
          Password
          <input type="password" required autocomplete="current-password" placeholder="Enter your password">
        </label>
        <div class="row">
          <label><input type="checkbox"> Remember me</label>
          <a href="#">Forgot password?</a>
        </div>
        <button type="submit">Sign In</button>
      </form>
    </div>
  </div>
  <footer>
    <div>This portal is a lab simulation operated for testing purposes only.</div>
    <div class="footer-host">${escapeHtml(host)}</div>
  </footer>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
