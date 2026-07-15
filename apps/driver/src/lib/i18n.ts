import { createI18n, DEFAULT_LOCALE } from '@amana/i18n';

// ملاحظة: التحكّم بالاتجاه (RTL/LTR) انتقل إلى طبقة التفضيلات (preferences.tsx)
// لأنها تقرأ اللغة المحفوظة عند الإقلاع وتوفّق الاتجاه معها بإعادة تشغيل واحدة
// عند اللزوم — فرضُ RTL هنا كان يقلب اتجاه مستخدم الإنجليزية كل إقلاع.
export const i18n = createI18n({ locale: DEFAULT_LOCALE });
