/**
 * Internationalization (i18n) for the splash page.
 *
 * Language is selected based on:
 *   1. Explicit `?lang=` query param
 *   2. `Accept-Language` request header
 *   3. The DEFAULT_LANGUAGE env var
 *
 * To add a new language, add a new key to `translations` and update
 * the SupportedLanguage type in types.ts.
 */

import type { SupportedLanguage } from './types.js';

export interface Translation {
  pageTitle: string;
  noticeHeading: string;
  noticeSubheading: string;
  redirectingIn: string;
  seconds: string;
  newUrlLabel: string;
  goNowButton: string;
  bookmarkHeading: string;
  bookmarkInstructions: string;
  bookmarkInstructionsDetail: string;
  bookmarkletDragHint: string;
  copyButton: string;
  copyLinkLabel: string;
  copied: string;
  shortcutKey: string;
  shortcutHint: string;
  dontShowAgain: string;
  dontShowAgainHint: string;
  helpHeading: string;
  helpBody: string;
  supportContact: string;
  themeToggle: string;
  themeLight: string;
  themeDark: string;
  themeAuto: string;
  languageSelector: string;
  poweredBy: string;
  legacyUrlLabel: string;
}

const en: Translation = {
  pageTitle: 'Service Notice — {serviceName}',
  noticeHeading: 'Service Relocation Notice',
  noticeSubheading: 'The {serviceName} has moved to a new web address.',
  redirectingIn: 'You will be automatically redirected in',
  seconds: 'seconds',
  newUrlLabel: 'New URL',
  goNowButton: 'Continue to New Site',
  bookmarkHeading: 'Update Your Bookmark',
  bookmarkInstructions: 'Please update any saved bookmarks or shortcuts to use the new address above.',
  bookmarkInstructionsDetail:
    'To bookmark this page in your browser, press the keyboard shortcut shown below after you arrive at the new site.',
  bookmarkletDragHint: 'Drag this link to your bookmarks bar to save it:',
  copyButton: 'Copy New URL',
  copyLinkLabel: 'Copy to clipboard',
  copied: 'Copied to clipboard',
  shortcutKey: 'Ctrl + D',
  shortcutHint: '(⌘ + D on Mac)',
  dontShowAgain: "Don't show this notice again on this device",
  dontShowAgainHint: 'Your preference is saved locally in your browser.',
  helpHeading: 'Need Help?',
  helpBody:
    'If you have questions about this change or are unable to access the new site, please contact your IT support team.',
  supportContact: 'Contact: {email}',
  themeToggle: 'Theme',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeAuto: 'Auto',
  languageSelector: 'Language',
  poweredBy: '{org} — Service Migration Notice',
  legacyUrlLabel: 'You requested',
};

const es: Translation = {
  pageTitle: 'Aviso de servicio — {serviceName}',
  noticeHeading: 'Aviso de Reubicación de Servicio',
  noticeSubheading: 'El {serviceName} se ha trasladado a una nueva dirección web.',
  redirectingIn: 'Será redirigido automáticamente en',
  seconds: 'segundos',
  newUrlLabel: 'Nueva URL',
  goNowButton: 'Continuar al nuevo sitio',
  bookmarkHeading: 'Actualice su marcador',
  bookmarkInstructions:
    'Por favor actualice cualquier marcador o acceso directo guardado para usar la nueva dirección.',
  bookmarkInstructionsDetail:
    'Para marcar esta página, presione el atajo de teclado mostrado abajo después de llegar al nuevo sitio.',
  bookmarkletDragHint: 'Arrastre este enlace a su barra de marcadores para guardarlo:',
  copyButton: 'Copiar URL',
  copyLinkLabel: 'Copiar al portapapeles',
  copied: 'Copiado al portapapeles',
  shortcutKey: 'Ctrl + D',
  shortcutHint: '(⌘ + D en Mac)',
  dontShowAgain: 'No mostrar este aviso de nuevo en este dispositivo',
  dontShowAgainHint: 'Su preferencia se guarda localmente en su navegador.',
  helpHeading: '¿Necesita ayuda?',
  helpBody:
    'Si tiene preguntas sobre este cambio o no puede acceder al nuevo sitio, contacte a su equipo de soporte de TI.',
  supportContact: 'Contacto: {email}',
  themeToggle: 'Tema',
  themeLight: 'Claro',
  themeDark: 'Oscuro',
  themeAuto: 'Auto',
  languageSelector: 'Idioma',
  poweredBy: '{org} — Aviso de migración de servicio',
  legacyUrlLabel: 'Usted solicitó',
};

const fr: Translation = {
  pageTitle: 'Avis de service — {serviceName}',
  noticeHeading: 'Avis de relocalisation de service',
  noticeSubheading: 'Le {serviceName} a été déplacé vers une nouvelle adresse web.',
  redirectingIn: 'Vous serez automatiquement redirigé dans',
  seconds: 'secondes',
  newUrlLabel: 'Nouvelle URL',
  goNowButton: 'Continuer vers le nouveau site',
  bookmarkHeading: 'Mettre à jour votre signet',
  bookmarkInstructions:
    "Veuillez mettre à jour vos signets ou raccourcis enregistrés pour utiliser la nouvelle adresse ci-dessus.",
  bookmarkInstructionsDetail:
    'Pour ajouter cette page aux signets, appuyez sur le raccourci clavier ci-dessous après être arrivé sur le nouveau site.',
  bookmarkletDragHint: 'Faites glisser ce lien dans votre barre de signets pour l’enregistrer :',
  copyButton: 'Copier l’URL',
  copyLinkLabel: 'Copier dans le presse-papiers',
  copied: 'Copié dans le presse-papiers',
  shortcutKey: 'Ctrl + D',
  shortcutHint: '(⌘ + D sur Mac)',
  dontShowAgain: 'Ne plus afficher cet avis sur cet appareil',
  dontShowAgainHint: 'Votre préférence est enregistrée localement dans votre navigateur.',
  helpHeading: 'Besoin d’aide ?',
  helpBody:
    'Si vous avez des questions ou ne pouvez pas accéder au nouveau site, contactez votre équipe de support informatique.',
  supportContact: 'Contact : {email}',
  themeToggle: 'Thème',
  themeLight: 'Clair',
  themeDark: 'Sombre',
  themeAuto: 'Auto',
  languageSelector: 'Langue',
  poweredBy: '{org} — Avis de migration de service',
  legacyUrlLabel: 'Vous avez demandé',
};

const de: Translation = {
  pageTitle: 'Servicehinweis — {serviceName}',
  noticeHeading: 'Hinweis zur Service-Umzug',
  noticeSubheading: 'Das {serviceName} wurde auf eine neue Webadresse verschoben.',
  redirectingIn: 'Sie werden automatisch weitergeleitet in',
  seconds: 'Sekunden',
  newUrlLabel: 'Neue URL',
  goNowButton: 'Zur neuen Seite weiter',
  bookmarkHeading: 'Aktualisieren Sie Ihr Lesezeichen',
  bookmarkInstructions:
    'Bitte aktualisieren Sie gespeicherte Lesezeichen oder Verknüpfungen, um die neue Adresse zu verwenden.',
  bookmarkInstructionsDetail:
    'Um diese Seite mit einem Lesezeichen zu versehen, drücken Sie die unten angezeigte Tastenkombination nach Erreichen der neuen Seite.',
  bookmarkletDragHint: 'Ziehen Sie diesen Link in Ihre Lesezeichenleiste, um ihn zu speichern:',
  copyButton: 'URL kopieren',
  copyLinkLabel: 'In Zwischenablage kopieren',
  copied: 'In Zwischenablage kopiert',
  shortcutKey: 'Strg + D',
  shortcutHint: '(⌘ + D auf Mac)',
  dontShowAgain: 'Diesen Hinweis auf diesem Gerät nicht mehr anzeigen',
  dontShowAgainHint: 'Ihre Einstellung wird lokal in Ihrem Browser gespeichert.',
  helpHeading: 'Hilfe benötigt?',
  helpBody:
    'Wenn Sie Fragen haben oder die neue Seite nicht erreichen können, wenden Sie sich an Ihr IT-Support-Team.',
  supportContact: 'Kontakt: {email}',
  themeToggle: 'Design',
  themeLight: 'Hell',
  themeDark: 'Dunkel',
  themeAuto: 'Auto',
  languageSelector: 'Sprache',
  poweredBy: '{org} — Service-Migrationshinweis',
  legacyUrlLabel: 'Sie haben angefordert',
};

const pt: Translation = {
  pageTitle: 'Aviso de serviço — {serviceName}',
  noticeHeading: 'Aviso de Relocação de Serviço',
  noticeSubheading: 'O {serviceName} mudou para um novo endereço web.',
  redirectingIn: 'Você será redirecionado automaticamente em',
  seconds: 'segundos',
  newUrlLabel: 'Nova URL',
  goNowButton: 'Continuar para o novo site',
  bookmarkHeading: 'Atualize seu favorito',
  bookmarkInstructions:
    'Por favor, atualize quaisquer favoritos ou atalhos salvos para usar o novo endereço acima.',
  bookmarkInstructionsDetail:
    'Para adicionar esta página aos favoritos, pressione o atalho de teclado abaixo após chegar ao novo site.',
  bookmarkletDragHint: 'Arraste este link para sua barra de favoritos para salvá-lo:',
  copyButton: 'Copiar URL',
  copyLinkLabel: 'Copiar para área de transferência',
  copied: 'Copiado para área de transferência',
  shortcutKey: 'Ctrl + D',
  shortcutHint: '(⌘ + D no Mac)',
  dontShowAgain: 'Não mostrar este aviso novamente neste dispositivo',
  dontShowAgainHint: 'Sua preferência é salva localmente no seu navegador.',
  helpHeading: 'Precisa de ajuda?',
  helpBody:
    'Se tiver dúvidas ou não conseguir acessar o novo site, entre em contato com sua equipe de suporte de TI.',
  supportContact: 'Contato: {email}',
  themeToggle: 'Tema',
  themeLight: 'Claro',
  themeDark: 'Escuro',
  themeAuto: 'Auto',
  languageSelector: 'Idioma',
  poweredBy: '{org} — Aviso de migração de serviço',
  legacyUrlLabel: 'Você solicitou',
};

const ja: Translation = {
  pageTitle: 'サービスのお知らせ — {serviceName}',
  noticeHeading: 'サービス移行のお知らせ',
  noticeSubheading: '{serviceName}は新しいWebアドレスに移行しました。',
  redirectingIn: '自動的にリダイレクトします — 残り',
  seconds: '秒',
  newUrlLabel: '新しいURL',
  goNowButton: '新しいサイトへ進む',
  bookmarkHeading: 'ブックマークを更新してください',
  bookmarkInstructions: '保存されたブックマークやショートカットを上記の新しいアドレスに更新してください。',
  bookmarkInstructionsDetail: '新しいサイトに到達した後、下記のキーボードショートカットでブックマークできます。',
  bookmarkletDragHint: 'このリンクをブックマークバーにドラッグして保存してください：',
  copyButton: 'URLをコピー',
  copyLinkLabel: 'クリップボードにコピー',
  copied: 'クリップボードにコピーしました',
  shortcutKey: 'Ctrl + D',
  shortcutHint: '（Mac は ⌘ + D）',
  dontShowAgain: 'このデバイスではこの通知を再表示しない',
  dontShowAgainHint: '設定はお使いのブラウザにローカル保存されます。',
  helpHeading: 'ヘルプが必要ですか？',
  helpBody:
    'この変更についての質問や新しいサイトにアクセスできない場合は、ITサポートチームにご連絡ください。',
  supportContact: '連絡先: {email}',
  themeToggle: 'テーマ',
  themeLight: 'ライト',
  themeDark: 'ダーク',
  themeAuto: '自動',
  languageSelector: '言語',
  poweredBy: '{org} — サービス移行のお知らせ',
  legacyUrlLabel: 'リクエスト先',
};

export const translations: Record<SupportedLanguage, Translation> = {
  en,
  es,
  fr,
  de,
  pt,
  ja,
};

/**
 * Resolve the best language for a request given the
 *   ?lang=  query parameter (highest priority)
 *   Accept-Language header
 *   the configured fallback
 */
export function resolveLanguage(
  url: URL,
  acceptLanguage: string | null,
  fallback: string,
): SupportedLanguage {
  // 1. Explicit query parameter
  const qp = url.searchParams.get('lang');
  if (qp && isSupported(qp)) return qp;

  // 2. Accept-Language header
  if (acceptLanguage) {
    const langs = parseAcceptLanguage(acceptLanguage);
    for (const lang of langs) {
      const base = lang.split('-')[0];
      if (isSupported(base)) return base;
    }
  }

  // 3. Fallback
  if (isSupported(fallback)) return fallback;
  return 'en';
}

function isSupported(lang: string): lang is SupportedLanguage {
  return lang in translations;
}

/**
 * Parse an Accept-Language header into a priority-ordered list of language codes.
 * Example input: "en-US,en;q=0.9,fr;q=0.8"
 * Example output: ["en-US", "en", "fr"]
 */
function parseAcceptLanguage(header: string): string[] {
  return header
    .split(',')
    .map((part) => {
      const [lang, q] = part.trim().split(';');
      const quality = q ? parseFloat(q.replace('q=', '')) : 1.0;
      return { lang: lang.trim(), quality };
    })
    .sort((a, b) => b.quality - a.quality)
    .map((entry) => entry.lang);
}

/**
 * Tiny template helper that substitutes `{key}` tokens in a string.
 */
export function format(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}
