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

/** حالة التذكرة (5): جديد · قيد العمل · بانتظار الرد · منتهية · ملغاة. */
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled';

/** نوع التذكرة. */
export type TicketCategory = 'complaint' | 'question' | 'suggestion' | 'technical';

/** أولوية التذكرة. */
export type TicketPriority = 'high' | 'medium' | 'low';

/** تسميات عربية لحالات التذكرة. */
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'جديد',
  in_progress: 'قيد العمل',
  resolved: 'بانتظار رد العميل',
  closed: 'منتهية',
  cancelled: 'ملغاة',
};

/** ألوان badges لحالات التذكرة. */
export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  resolved: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  closed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

/** تسميات إنجليزية لحالات التذكرة. */
export const TICKET_STATUS_LABELS_EN: Record<TicketStatus, string> = {
  open: 'New',
  in_progress: 'In Progress',
  resolved: 'Awaiting Customer Reply',
  closed: 'Closed',
  cancelled: 'Cancelled',
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

/** الحد الأقصى للتذاكر غير المُغلقة لكل مستخدم. */
export const MAX_OPEN_TICKETS = 5;

/**
 * انتقالات الحالة اليدوية المسموح بها (من ⇐ إلى) — آلة حالات منظّمة:
 *  - «جديد» (open): لا انتقال يدويّ. الردّ فقط ينقلها تلقائيًّا إلى «قيد العمل».
 *  - «قيد العمل» (in_progress): إلى «بانتظار رد العميل» فقط (لا إغلاق مباشر).
 *  - «بانتظار رد العميل» (resolved): إغلاق، أو إعادة فتح إلى «قيد العمل».
 *  - «منتهية» (closed): إعادة فتح إلى «قيد العمل».
 *  - «ملغاة» (cancelled): نهائية (يضبطها العميل فقط).
 * لا يُعاد أبدًا إلى «جديد».
 */
export const TICKET_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: [],
  in_progress: ['resolved'],
  resolved: ['closed', 'in_progress'],
  closed: [], // نهائية — لا إعادة فتح («منتهية خلاص منتهية»)
  cancelled: [],
};

/** هل الانتقال بين حالتين مسموح؟ */
export function canTransitionTicket(from: TicketStatus, to: TicketStatus): boolean {
  return TICKET_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
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
  | 'manage_support'    // إدارة التذاكر وتخصيصها (مدير النظام + مسؤول الدعم فقط)
  | 'manage_releases';  // رفع إصدارات التطبيقات (مدير النظام فقط)

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
    case 'manage_releases':
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

// =============================================================================
// لوحة المركبة السعودية — الحروف المعتمدة ومقابلها اللاتيني + التنسيق
// =============================================================================

/**
 * الحروف العربية الـ17 المعتمدة في لوحات السعودية ومقابلها اللاتيني الرسمي
 * (كما يظهر على اللوحة نفسها — اختيار بصري متماثل، لا صوتي). مصدر واحد يستخدمه
 * تطبيق السائقة (عرض تحت الإدخال) ولوحة الإدارة (عرض التفاصيل).
 */
export const PLATE_LETTER_LATIN: Record<string, string> = {
  ا: 'A', أ: 'A', ب: 'B', ح: 'J', د: 'D', ر: 'R', س: 'S', ص: 'X',
  ط: 'T', ع: 'E', ق: 'G', ك: 'K', ل: 'L', م: 'Z', ن: 'N', ه: 'H',
  ة: 'H', و: 'U', ى: 'V', ي: 'V',
};

/** حروف اللوحة المسموح بها (للتحقّق/القوائم). */
export const PLATE_ARABIC_LETTERS: string[] = ['ا', 'ب', 'ح', 'د', 'ر', 'س', 'ص', 'ط', 'ع', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ى'];

/** المقابل اللاتيني لسلسلة أحرف عربية (يتجاهل غير المعروف). */
export function plateLettersToLatin(letters: string): string {
  return [...letters.replace(/\s/g, '')]
    .map((ch) => PLATE_LETTER_LATIN[ch] ?? '')
    .join(' ')
    .trim();
}

/** يفكّك لوحة مخزّنة «أحرف أرقام» إلى جزأيها. */
export function parsePlate(plate: string | null | undefined): { letters: string; digits: string } {
  const src = (plate ?? '').trim();
  const letters = src.match(/[ء-ي]+/)?.[0] ?? '';
  const digits = src.match(/\d+/)?.[0] ?? '';
  return { letters, digits };
}

/**
 * تنسيق اللوحة للعرض: أحرف عربية مفصولة بمسافات + المقابل اللاتيني + الأرقام.
 * مثال: "أبت5560" → "أ ب ت · ABT · 5560". يعيد "—" إن فرغت.
 */
export function formatPlate(plate: string | null | undefined): string {
  const { letters, digits } = parsePlate(plate);
  if (!letters && !digits) return '—';
  const arabicSpaced = [...letters].join(' ');
  const latin = plateLettersToLatin(letters).replace(/\s/g, '');
  const parts = [arabicSpaced, latin, digits].filter(Boolean);
  return parts.join(' · ');
}

// =============================================================================
// فئات المركبة/الرحلة — مصدر واحد تستهلكه الراكبة (اختيار الفئة + التسعير)
// والسائقة (تحديد فئة مركبتها في التوثيق) والإدارة. مخزّنة في:
//   drivers.vehicle_class   (فئة مركبة السائقة)
//   rides.requested_class   (الفئة التي طلبتها الراكبة)
// =============================================================================

/** معرّف فئة المركبة الثابت (يُخزَّن في قاعدة البيانات — لا يُترجم). */
export type RideClassId = 'standard' | 'premium' | 'group';

/** وصف فئة مركبة/رحلة. `multiplier` مُعامل تقدير السعر (تستخدمه الراكبة فقط). */
export interface RideClass {
  id: RideClassId;
  labelAr: string;
  labelEn: string;
  subtitleAr: string;
  subtitleEn: string;
  /** مُعامل ضرب السعر التقديري بالنسبة للفئة الأساسية. */
  multiplier: number;
}

/** الفئات المعتمدة — مصدر الحقيقة الوحيد لكلا التطبيقين. */
export const RIDE_CLASSES: RideClass[] = [
  {
    id: 'standard',
    labelAr: 'أمانة أساسية',
    labelEn: 'Amana Basic',
    subtitleAr: 'سيارة مريحة وحديثة',
    subtitleEn: 'A comfortable, modern car',
    multiplier: 1,
  },
  {
    id: 'premium',
    labelAr: 'أمانة فخمة',
    labelEn: 'Amana Premium',
    subtitleAr: 'خدمة راقية وسيارات فارهة',
    subtitleEn: 'Premium service, luxury cars',
    multiplier: 1.8,
  },
  {
    id: 'group',
    labelAr: 'مجموعة نقل',
    labelEn: 'Group ride',
    subtitleAr: 'تتسع حتى ٦ أشخاص',
    subtitleEn: 'Seats up to 6 people',
    multiplier: 1.5,
  },
];

/** الفئة الافتراضية عند غياب اختيار. */
export const DEFAULT_RIDE_CLASS: RideClassId = 'standard';

/** بحث عن فئة بمعرّفها (يعيد الأساسية عند غياب المطابقة). */
export function getRideClass(id: string | null | undefined): RideClass {
  return RIDE_CLASSES.find((c) => c.id === id) ?? RIDE_CLASSES[0]!;
}

/** تسمية الفئة حسب اللغة (يعيد "—" إن فرغت). */
export function rideClassLabel(id: string | null | undefined, locale: AppLocale = 'ar'): string {
  if (!id) return '—';
  const cls = RIDE_CLASSES.find((c) => c.id === id);
  if (!cls) return '—';
  return locale === 'en' ? cls.labelEn : cls.labelAr;
}
