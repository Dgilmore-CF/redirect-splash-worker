/**
 * Shared TypeScript types for the redirect-splash worker.
 */

/**
 * Cloudflare Worker environment bindings.
 * These come from wrangler.jsonc `vars` and binding declarations.
 */
export interface Env {
  // Vars
  COUNTDOWN_SECONDS: string;
  ENABLE_AB_TESTING: string;
  DEFAULT_LANGUAGE: string;
  ORG_NAME: string;
  SUPPORT_EMAIL: string;
  ENVIRONMENT: string;

  // Bindings
  ANALYTICS: AnalyticsEngineDataset;
}

/**
 * Per-hostname redirect configuration.
 * The Worker uses the request hostname to look up which destination
 * to redirect to and what service name to display on the splash page.
 */
export interface RedirectConfig {
  /** The new destination URL (full https://) */
  newUrl: string;
  /** Human-readable service name shown to users */
  serviceName: string;
  /** Short description shown on the splash page */
  description: string;
  /** Icon name (rendered as SVG inline) */
  icon: 'people' | 'finance' | 'document' | 'generic';
}

/**
 * The mapping of legacy hostname -> redirect configuration.
 * This is the single source of truth for what URLs the worker handles.
 */
export type RedirectMap = Record<string, RedirectConfig>;

/**
 * Supported languages for the splash page.
 * Add new locales by extending the translations object in i18n.ts.
 */
export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ja';

/**
 * A/B test variant identifier.
 * Each variant has a different layout/style for the splash page.
 */
export type SplashVariant = 'A' | 'B' | 'C';

/**
 * Resolved options used when rendering a splash page.
 * Built by the Worker from env vars + request inspection.
 */
export interface SplashOptions {
  config: RedirectConfig;
  legacyHost: string;
  countdownSeconds: number;
  language: SupportedLanguage;
  variant: SplashVariant;
  orgName: string;
  supportEmail: string;
  theme: 'light' | 'dark' | 'auto';
}

/**
 * Analytics event types tracked by the worker.
 */
export type AnalyticsEventType =
  | 'splash_shown'
  | 'redirect_executed'
  | 'redirect_skipped'
  | 'bookmark_clicked'
  | 'dont_show_again'
  | 'manual_redirect'
  | 'language_changed'
  | 'theme_changed';

/**
 * Analytics event payload sent to Analytics Engine.
 * Cloudflare Analytics Engine takes blobs (strings) and doubles (numbers).
 */
export interface AnalyticsEvent {
  type: AnalyticsEventType;
  legacyHost: string;
  newHost: string;
  variant: SplashVariant;
  language: SupportedLanguage;
  userAgent: string;
  country: string;
  colo: string;
  countdownSeconds: number;
  hadSkipFlag: boolean;
}
