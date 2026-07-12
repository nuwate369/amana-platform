/**
 * أنواع مشتركة بين تطبيقات منصة أمانة (راكبة / سائقة / إدارة).
 * لا يوجد منطق أعمال هنا — تعريفات فقط.
 */

/** الدور داخل المنصة. */
export type UserRole = 'passenger' | 'driver' | 'admin';

/** اللغة المدعومة في الواجهات. */
export type AppLocale = 'ar' | 'en';

/** سِمة العرض (فاتح/داكن/تلقائي). */
export type ThemeMode = 'light' | 'dark' | 'system';

/** ملف المستخدم الأساسي (يقابل جدول profiles في Supabase). */
export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: UserRole;
  locale: AppLocale;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** مستخدم Supabase المختصر كما نستخدمه في الواجهة. */
export interface AuthUser {
  id: string;
  email: string | null;
  emailConfirmedAt: string | null;
}

/** حالة المصادقة العامة المشتركة بين الشاشات. */
export interface AuthState {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
}

/** شكل موحّد لنتائج عمليات المصادقة لتسهيل عرض الأخطاء. */
export interface AuthResult<T = unknown> {
  data: T | null;
  error: { message: string; code?: string } | null;
}
