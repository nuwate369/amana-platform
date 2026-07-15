import type { TFunction } from 'i18next';

/**
 * تعريب أخطاء Supabase Auth في تطبيق السائقة (تصل بالإنجليزية دائمًا).
 * نطابق النمط ونُعيد المفتاح المناسب من ملفات i18n، وإلا نُعيد النص الأصلي.
 */
const PATTERNS: [RegExp, string][] = [
  [/invalid login credentials/i, 'auth.errInvalidCredentials'],
  [/email not confirmed/i, 'auth.errEmailNotConfirmed'],
  [/already registered|already been registered|already exists|user already/i, 'auth.errUserExists'],
  [/password should be at least|weak password|password.*too short/i, 'auth.errWeakPassword'],
  [/rate limit|too many requests|for security purposes|after \d+ seconds/i, 'auth.errRateLimit'],
  [/token has expired|expired or is invalid|otp.*expired|invalid.*token/i, 'auth.errExpiredToken'],
  [/failed to fetch|network|networkerror|fetch failed/i, 'auth.errNetwork'],
];

/** يترجم رسالة خطأ Supabase إلى نص بلغة المستخدمة الحالية. */
export function translateAuthError(message: string | undefined | null, t: TFunction): string {
  if (!message) return t('auth.errGeneric');
  for (const [pattern, key] of PATTERNS) {
    if (pattern.test(message)) return t(key, { defaultValue: message });
  }
  return message;
}

/** هل الخطأ سببه أن البريد لم يُفعّل بعد؟ (نوجّه عندها لشاشة الرمز). */
export function isEmailNotConfirmed(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message ?? '');
}
