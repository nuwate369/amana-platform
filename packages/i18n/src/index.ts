/**
 * إعداد i18n مشترك لمنصة أمانة عبر react-i18next.
 * العربية هي الافتراضية. كل تطبيق يستدعي createI18n() مرة واحدة عند الإقلاع.
 */
import i18n, { type i18n as I18nType } from 'i18next';
import { initReactI18next } from 'react-i18next';

import arCommon from './locales/ar/common.json';
import enCommon from './locales/en/common.json';

export type AppLocale = 'ar' | 'en';

export const SUPPORTED_LOCALES: readonly AppLocale[] = ['ar', 'en'] as const;
export const DEFAULT_LOCALE: AppLocale = 'ar';

export const resources = {
  ar: { common: arCommon },
  en: { common: enCommon },
} as const;

/** هل اللغة تُكتب من اليمين لليسار؟ */
export function isRTL(locale: string): boolean {
  return locale.startsWith('ar');
}

/** اتجاه الكتابة المناسب للغة. */
export function dirFor(locale: string): 'rtl' | 'ltr' {
  return isRTL(locale) ? 'rtl' : 'ltr';
}

export interface CreateI18nOptions {
  /** اللغة الابتدائية (افتراضيًا العربية). */
  locale?: AppLocale;
}

/**
 * ينشئ نسخة i18n مهيّأة. يعيد النسخة نفسها لاستخدامها مع I18nextProvider.
 */
export function createI18n(options: CreateI18nOptions = {}): I18nType {
  const { locale = DEFAULT_LOCALE } = options;

  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: locale,
      fallbackLng: DEFAULT_LOCALE,
      defaultNS: 'common',
      ns: ['common'],
      supportedLngs: SUPPORTED_LOCALES as unknown as string[],
      interpolation: { escapeValue: false },
      returnNull: false,
      // بيئة React Native (Hermes) قد تفتقر لـ Intl.PluralRules — الصيغة v3
      // تعتمد قواعد جمع بسيطة فتُلغي تحذير pluralResolver على الجهاز.
      compatibilityJSON: 'v3',
    });
  }

  return i18n;
}

export { i18n };
export { useTranslation, Trans, I18nextProvider } from 'react-i18next';
