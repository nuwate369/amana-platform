/**
 * مخططات التحقّق المشتركة (zod) لمنصة أمانة.
 * رسائل الأخطاء هي **مفاتيح i18n** (وليست نصوصًا إنجليزية) — يترجمها النموذج
 * عبر translateError(t, message) لتظهر بلغة المستخدم الحالية.
 * إطار-محايد: يُستخدم في الويب (admin) وReact Native (passenger/driver) معًا،
 * وككطبقة تحقّق ثانية على الخادم.
 */
import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().min(1, 'validation.required').email('validation.invalidEmail'),
  password: z.string().min(1, 'validation.required'),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    fullName: z.string().min(1, 'validation.required'),
    email: z.string().min(1, 'validation.required').email('validation.invalidEmail'),
    password: z.string().min(6, 'validation.passwordMin'),
    confirmPassword: z.string().min(1, 'validation.required'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'validation.passwordMatch',
    path: ['confirmPassword'],
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

/** إنشاء/تعديل مستخدم إداري من لوحة الإدارة. */
export const adminUserSchema = z.object({
  fullName: z.string().min(1, 'validation.required'),
  email: z.string().min(1, 'validation.required').email('validation.invalidEmail'),
  password: z.string().min(6, 'validation.passwordMin'),
});
export type AdminUserInput = z.infer<typeof adminUserSchema>;

/** بريد فقط (نسيت كلمة المرور). */
export const emailOnlySchema = z.object({
  email: z.string().min(1, 'validation.required').email('validation.invalidEmail'),
});

/**
 * دعوة موظف إداري جديد — بريد + نوع المستخدم المقيّد بثلاث قيم فقط.
 * القائمة المنسدلة في الواجهة تعرض هذه القيم فقط ولا تقبل أي نص حر.
 */
export const inviteStaffSchema = z.object({
  email: z.string().min(1, 'validation.required').email('validation.invalidEmail'),
  userType: z.enum(['super_admin', 'admin', 'support'], {
    message: 'validation.required',
  }),
});
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

/** نوع مستخدم الموظف (للاستخدام في القائمة المنسدلة). */
export const STAFF_USER_TYPE_OPTIONS = [
  { value: 'super_admin', label: 'مدير عام' },
  { value: 'admin',       label: 'مدير' },
  { value: 'support',     label: 'دعم فني' },
] as const;

/**
 * قبول دعوة — تعيين كلمة المرور للمستخدم الجديد.
 */
export const acceptInviteSchema = z
  .object({
    password: z.string().min(6, 'validation.passwordMin'),
    confirmPassword: z.string().min(1, 'validation.required'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'validation.passwordMatch',
    path: ['confirmPassword'],
  });
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

/**
 * رمز التحقق بخطوتين — 6 أرقام.
 */
export const mfaCodeSchema = z.object({
  code: z.string().length(6, 'validation.mfaCodeLength').regex(/^\d{6}$/, 'validation.mfaCodeDigits'),
});
export type MfaCodeInput = z.infer<typeof mfaCodeSchema>;

/**
 * يترجم رسالة خطأ zod (مفتاح i18n) إلى نص بلغة المستخدم.
 * إن لم تكن مفتاحًا معروفًا تُعاد كما هي.
 */
export function translateError(
  t: (key: string) => string,
  message?: string,
): string | undefined {
  if (!message) return undefined;
  return message.startsWith('validation.') || message.startsWith('common.') ? t(message) : message;
}
