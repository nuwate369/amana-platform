/**
 * أنواع مشتركة بين تطبيقات منصة أمانة (راكبة / سائقة / إدارة).
 * لا يوجد منطق أعمال هنا — تعريفات وقواعد صلاحيات ثابتة فقط.
 */

// =============================================================================
// أنواع المستخدم
// =============================================================================

/**
 * نوع المستخدم الثابت في المنصة — يُحدَّد عند إنشاء الحساب ولا يتغيّر أبداً.
 * القيمة مخزّنة في profiles.role ومحمية بـ DB trigger.
 *
 * - 'passenger'  : راكبة تستخدم تطبيق الراكبة
 * - 'driver'     : سائقة تستخدم تطبيق السائقة
 * - 'super_admin': مدير النظام — صلاحيات كاملة على كل شيء
 * - 'admin'      : مدير العمليات — متابعة وتحليل دون تعديل الإعدادات الحساسة
 * - 'support'    : مسؤول الدعم الفني — مساعدة المستخدمين وحل المشكلات
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
  super_admin: 'مدير النظام',
  admin: 'مدير العمليات',
  support: 'مسؤول الدعم الفني',
};

/** تسميات إنجليزية لأنواع الموظفين. */
export const STAFF_TYPE_LABELS_EN: Record<string, string> = {
  super_admin: 'System Admin',
  admin: 'Operations Manager',
  support: 'Support Agent',
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
// حالة المستخدم
// =============================================================================

/**
 * حالة الحساب في المنصة — تُحدَّد عند التسجيل وتتغيّر بقرارات الإدارة.
 * ENUM في قاعدة البيانات: user_status
 */
export type UserStatus =
  | 'pending_approval'   // راكب/سائق سجل، بانتظار موافقة الإدارة
  | 'pending_invite'     // موظف دُعي، بانتظار قبول الدعوة
  | 'active'             // حساب نشط
  | 'suspended'          // حساب موقّف مؤقتاً
  | 'disabled';          // حساب معطّل

/** تسميات عربية لحالات المستخدم. */
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  pending_approval: 'بانتظار الموافقة',
  pending_invite: 'بانتظار قبول الدعوة',
  active: 'نشط',
  suspended: 'موقّف',
  disabled: 'معطّل',
};

/** ألوان badges لحالات المستخدم (Tailwind CSS classes). */
export const USER_STATUS_COLORS: Record<UserStatus, string> = {
  pending_approval: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  pending_invite: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  suspended: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  disabled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

// =============================================================================
// نظام التذاكر والدعم الفني
// =============================================================================

/** حالة التذكرة. */
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

/** نوع التذكرة. */
export type TicketCategory = 'complaint' | 'question' | 'suggestion' | 'technical';

/** أولوية التذكرة. */
export type TicketPriority = 'high' | 'medium' | 'low';

/** تسميات عربية لحالات التذكرة. */
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'جديد',
  in_progress: 'قيد المعالجة',
  resolved: 'تم الحل',
  closed: 'مغلق',
};

/** ألوان badges لحالات التذكرة. */
export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

/** تسميات إنجليزية لحالات التذكرة. */
export const TICKET_STATUS_LABELS_EN: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

/** تسميات عربية لأنواع التذكرة. */
export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  complaint: 'شكوى',
  question: 'سؤال',
  suggestion: 'اقتراح',
  technical: 'مشكلة تقنية',
};

/** تسميات إنجليزية لأنواع التذكرة. */
export const TICKET_CATEGORY_LABELS_EN: Record<TicketCategory, string> = {
  complaint: 'Complaint',
  question: 'Question',
  suggestion: 'Suggestion',
  technical: 'Technical Issue',
};

/** أيقونات لأنواع التذكرة (اسم Lucide icon). */
export const TICKET_CATEGORY_ICONS: Record<TicketCategory, string> = {
  complaint: 'AlertTriangle',
  question: 'HelpCircle',
  suggestion: 'Lightbulb',
  technical: 'Wrench',
};

/** تسميات عربية للأولويات. */
export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  high: 'عالية',
  medium: 'متوسطة',
  low: 'منخفضة',
};

/** تسميات إنجليزية للأولويات. */
export const TICKET_PRIORITY_LABELS_EN: Record<TicketPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** ألوان badges للأولويات. */
export const TICKET_PRIORITY_COLORS: Record<TicketPriority, string> = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

/** الحد الأقصى للتذاكر المفتوحة لكل مستخدم. */
export const MAX_OPEN_TICKETS = 10;

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
  | 'manage_users'      // حظر/رفع حظر الراكبات والسائقات (مدير النظام فقط)
  | 'view_rides'        // عرض الرحلات الحية
  | 'view_pricing'      // عرض صفحة التسعير
  | 'manage_pricing'    // تعديل التسعير
  | 'view_reports'      // عرض التقارير والإحصائيات
  | 'view_groups'       // عرض مجموعات المستخدمين
  | 'view_notifications'// عرض الإشعارات
  | 'manage_notifications'// إرسال الإشعارات والإعلانات
  | 'manage_notification_settings'// إدارة إعدادات الإشعارات (مدير النظام فقط)
  | 'view_staff'        // عرض قائمة الموظفين (/staff) — مدير النظام فقط
  | 'invite_staff'      // دعوة/إدارة الموظفين (مدير النظام فقط)
  | 'view_audit_log'    // عرض سجل الحركات — مدير النظام فقط
  | 'view_ratings'      // عرض التقييمات وأسئلتها
  | 'manage_ratings'    // إدارة أسئلة التقييم (مدير النظام فقط)
  | 'view_support'      // عرض تذاكر الدعم الفني (جميع الموظفين)
  | 'manage_support';   // إدارة التذاكر وتخصيصها (مدير النظام + مسؤول الدعم فقط)

/**
 * الدالة المركزية للتحقق من الصلاحيات.
 *
 * @param userType - نوع المستخدم من profiles.role
 * @param action   - الإجراء المطلوب التحقق منه
 * @returns true إذا كان مسموحاً بالإجراء، false إذا لم يكن مسموحاً
 *
 * @example
 *   if (!can(profile.role, 'invite_staff')) redirect('/dashboard');
 */
export function can(userType: UserType, action: AdminAction): boolean {
  // الزوار وغير الإداريين: لا صلاحيات على لوحة الإدارة
  if (userType === 'passenger' || userType === 'driver') return false;

  // مدير النظام: صلاحيات كاملة على كل شيء بلا استثناء
  if (userType === 'super_admin') return true;

  switch (action) {
    // -----------------------------------------------------------------------
    // إجراءات التعديل والإدارة: مدير النظام فقط
    // -----------------------------------------------------------------------
    case 'manage_drivers':
    case 'manage_users':
    case 'manage_pricing':
    case 'manage_notifications':
    case 'manage_notification_settings':
    case 'manage_ratings':
    case 'invite_staff':
      return false;

    // -----------------------------------------------------------------------
    // إدارة التذاكر: مدير النظام + مسؤول الدعم فقط
    // -----------------------------------------------------------------------
    case 'manage_support':
      return userType === 'support';

    // -----------------------------------------------------------------------
    // العرض — الصلاحيات تختلف حسب الدور
    // -----------------------------------------------------------------------
    case 'view_staff':
    case 'view_audit_log':
      // مدير النظام فقط
      return false;

    case 'view_dashboard':
    case 'view_riders':
    case 'view_drivers':
    case 'view_rides':
    case 'view_reports':
    case 'view_support':
      // مدير العمليات + مسؤول الدعم
      return userType === 'admin' || userType === 'support';

    case 'view_pricing':
    case 'view_groups':
    case 'view_notifications':
    case 'view_ratings':
      // مدير العمليات فقط
      return userType === 'admin';

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
