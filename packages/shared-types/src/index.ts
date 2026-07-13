/**
 * أنواع مشتركة بين تطبيقات منصة أمانة (راكبة / سائقة / إدارة).
 * لا يوجد منطق أعمال هنا — تعريفات وقواعد صلاحيات ثابتة فقط.
 */

// =============================================================================
// أنواع المستخدم
// =============================================================================

/**
 * نوع المستخدم الثابت في المنصة — يُحدَّد عند إنشاء الحساب ولا يتغيّر أبداً.
 * القيمة مخزّنة في profiles.user_type ومحمية بـ DB trigger.
 *
 * - 'passenger'  : راكبة تستخدم تطبيق الراكبة
 * - 'driver'     : سائقة تستخدم تطبيق السائقة
 * - 'super_admin': المدير العام — صلاحيات كاملة على كل شيء
 * - 'admin'      : مدير — صلاحيات واسعة لكن لا يصل لإدارة الموظفين
 * - 'support'    : دعم فني — صلاحيات قراءة فقط في معظم الأقسام
 */
export type UserType =
  | 'passenger'
  | 'driver'
  | 'super_admin'
  | 'admin'
  | 'support';

/** أنواع موظفي الإدارة (تُستخدم في /staff وفلترة القوائم). */
export const STAFF_TYPES: UserType[] = ['super_admin', 'admin', 'support'];

/** تسميات عربية لأنواع الموظفين (للعرض في الواجهة). */
export const STAFF_TYPE_LABELS: Record<string, string> = {
  super_admin: 'مدير عام',
  admin: 'مدير',
  support: 'دعم فني',
};

/** ألوان badges لأنواع الموظفين (Tailwind CSS classes). */
export const STAFF_TYPE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  support: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
};

/** تحقّق: هل هذا النوع ينتمي لموظفي الإدارة؟ */
export function isStaff(userType: UserType): boolean {
  return STAFF_TYPES.includes(userType);
}

// =============================================================================
// نظام الصلاحيات المركزي — can(userType, action)
//
// جميع قواعد الصلاحيات في مكان واحد؛ يُستدعى من middleware وRoute Guards
// وأي مكان آخر في admin. لا تكرار للقواعد في الملفات الفردية.
// =============================================================================

/**
 * الإجراءات المتاحة في لوحة الإدارة.
 * لإضافة إجراء جديد: أضفه هنا وعدّل دالة can() أدناه.
 */
export type AdminAction =
  | 'view_dashboard'    // عرض لوحة المعلومات الرئيسية
  | 'view_riders'       // عرض قائمة الراكبات
  | 'view_drivers'      // عرض قائمة السائقات
  | 'manage_drivers'    // تغيير حالة السائقة (قبول/رفض KYC)
  | 'manage_users'      // حظر/رفع حظر الراكبات والسائقات (super_admin فقط)
  | 'view_rides'        // عرض الرحلات الحية
  | 'view_pricing'      // عرض صفحة التسعير
  | 'manage_pricing'    // تعديل التسعير
  | 'view_reports'      // عرض التقارير والإحصائيات
  | 'view_groups'       // عرض مجموعات المستخدمين
  | 'view_notifications'// عرض الإشعارات
  | 'manage_notifications'// إرسال الإشعارات والإعلانات
  | 'view_staff'        // عرض قائمة الموظفين (/staff)
  | 'invite_staff'      // دعوة/إدارة الموظفين (super_admin فقط)
  | 'view_audit_log'    // عرض سجل الحركات (super_admin + admin)
  | 'view_ratings'      // عرض التقييمات وأسئلتها (super_admin + admin)
  | 'manage_ratings';   // إدارة أسئلة التقييم (super_admin فقط)

/**
 * الدالة المركزية للتحقق من الصلاحيات.
 *
 * @param userType - نوع المستخدم من profiles.user_type
 * @param action   - الإجراء المطلوب التحقق منه
 * @returns true إذا كان مسموحاً بالإجراء، false إذا لم يكن مسموحاً
 *
 * @example
 *   if (!can(profile.user_type, 'invite_staff')) redirect('/dashboard');
 */
export function can(userType: UserType, action: AdminAction): boolean {
  // الزوار وغير الإداريين: لا صلاحيات على لوحة الإدارة
  if (userType === 'passenger' || userType === 'driver') return false;

  // super_admin: صلاحيات كاملة على كل شيء بلا استثناء
  if (userType === 'super_admin') return true;

  switch (action) {
    // -----------------------------------------------------------------------
    // كل إجراءات الإدارة/التعديل + إدارة الموظفين: super_admin فقط
    // (عولجت أعلاه) — لذا هنا الرفض للمدير والدعم
    // -----------------------------------------------------------------------
    case 'invite_staff':
    case 'manage_drivers':
    case 'manage_users':
    case 'manage_pricing':
    case 'manage_notifications':
    case 'manage_ratings':
      return false;

    // -----------------------------------------------------------------------
    // المدير (admin): مشاهدة كل الأقسام فقط (بلا أي تعديل)
    // -----------------------------------------------------------------------
    case 'view_dashboard':
    case 'view_riders':
    case 'view_drivers':
    case 'view_rides':
    case 'view_pricing':
    case 'view_reports':
    case 'view_groups':
    case 'view_notifications':
    case 'view_staff':
    case 'view_audit_log':
    case 'view_ratings':
      if (userType === 'admin') return true;
      // -------------------------------------------------------------------
      // الدعم الفني (support): مجموعة شاشات محددة فقط
      // -------------------------------------------------------------------
      return (
        action === 'view_dashboard' ||
        action === 'view_drivers' ||
        action === 'view_riders' ||
        action === 'view_rides' ||
        action === 'view_reports'
      );

    default:
      // قاعدة آمنة: الرفض الافتراضي لأي إجراء غير معرَّف
      return false;
  }
}

// =============================================================================
// الأنواع الأخرى المشتركة
// =============================================================================

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
  userType: UserType;
  isProtected: boolean;
  preferredLanguage: AppLocale;
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
