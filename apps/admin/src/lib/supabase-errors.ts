/**
 * تعريب أخطاء Supabase Auth حسب اللغة الحالية.
 *
 * رسائل Supabase تصل بالإنجليزية دائماً (مثل "Invalid login credentials").
 * هذه الدالة تطابق النص المعروف وتُعيد الترجمة المناسبة عبر i18n (عربي/إنجليزي)،
 * وإن كان الخطأ غير معروف تُعيد النص الأصلي كما هو.
 *
 * الاستخدام:
 *   notify.error(translateSupabaseError(error.message, t));
 */

import type { TFunction } from 'i18next';

/** أزواج (نمط في رسالة Supabase → مفتاح i18n). أول تطابق يفوز. */
const PATTERNS: [RegExp, string][] = [
  [/invalid login credentials/i, 'errors.auth.invalidCredentials'],
  [/email not confirmed/i, 'errors.auth.emailNotConfirmed'],
  [/already registered|already been registered|already exists|user already/i, 'errors.auth.userAlreadyExists'],
  [/password should be at least|weak password|password.*too short/i, 'errors.auth.weakPassword'],
  [/should be different from the old password|new password.*different/i, 'errors.auth.samePassword'],
  [/unable to validate email|invalid format|invalid email/i, 'errors.auth.invalidEmail'],
  [/rate limit|too many requests|for security purposes|after \d+ seconds/i, 'errors.auth.rateLimit'],
  [/token has expired|expired or is invalid|otp.*expired|link.*expired|invalid.*token/i, 'errors.auth.expiredToken'],
  [/user not found|no user found/i, 'errors.auth.userNotFound'],
  [/failed to fetch|network|networkerror|fetch failed/i, 'errors.auth.networkError'],
];

/**
 * يترجم رسالة خطأ Supabase إلى نص بلغة المستخدم الحالية.
 * @param message رسالة الخطأ الخام من Supabase.
 * @param t دالة الترجمة من useTranslation().
 */
export function translateSupabaseError(message: string | undefined | null, t: TFunction): string {
  if (!message) return t('errors.auth.generic', 'حدث خطأ غير متوقع. حاول مرة أخرى.');
  for (const [pattern, key] of PATTERNS) {
    // defaultValue = النص الأصلي: إن لم يُحمّل مفتاح الترجمة بعد يظهر النص بدل المفتاح.
    if (pattern.test(message)) return t(key, { defaultValue: message });
  }
  // خطأ غير معروف: نعرض النص الأصلي بدل إخفائه.
  return message;
}
