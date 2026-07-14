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
 * دعوة موظف إداري جديد — الاسم + البريد + الجوال (اختياري) + نوع المستخدم
 * المقيّد بثلاث قيم فقط. القائمة المنسدلة تعرض هذه القيم ولا تقبل نصًا حرًا.
 */
export const inviteStaffSchema = z.object({
  fullName: z.string().min(1, 'validation.required'),
  email: z.string().min(1, 'validation.required').email('validation.invalidEmail'),
  phone: z
    .string()
    .regex(/^0?\d{9,14}$/, 'validation.invalidPhone')
    .optional()
    .or(z.literal('')),
  userType: z.enum(['super_admin', 'admin', 'support'], {
    message: 'validation.required',
  }),
});
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

/** نوع مستخدم الموظف (للاستخدام في القائمة المنسدلة). */
export const STAFF_USER_TYPE_OPTIONS = [
  { value: 'super_admin', label: 'مدير النظام' },
  { value: 'admin',       label: 'مدير العمليات' },
  { value: 'support',     label: 'مسؤول الدعم الفني' },
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
 * إنشاء تذكرة دعم فني.
 */
export const createTicketSchema = z.object({
  subject: z.string().min(1, 'validation.required').max(200, 'validation.maxLength'),
  description: z.string().min(1, 'validation.required').max(5000, 'validation.maxLength'),
  category: z.enum(['complaint', 'question', 'suggestion', 'technical'], {
    message: 'validation.required',
  }),
  priority: z.enum(['high', 'medium', 'low'], {
    message: 'validation.required',
  }),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

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
