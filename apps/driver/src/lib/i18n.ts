import { I18nManager } from 'react-native';
import { createI18n, DEFAULT_LOCALE, isRTL } from '@amana/i18n';

// العربية افتراضية → نفعّل RTL على مستوى النظام.
if (isRTL(DEFAULT_LOCALE) && !I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  // ملاحظة: تغيير الاتجاه فعليًا يتطلب إعادة تحميل التطبيق (Updates.reloadAsync).
}

export const i18n = createI18n({ locale: DEFAULT_LOCALE });
