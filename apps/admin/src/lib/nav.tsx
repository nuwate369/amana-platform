import {
  LayoutDashboard,
  Car,
  Users,
  Navigation,
  BadgePercent,
  BarChart3,
  UsersRound,
  Bell,
  Radio,
  UserCog,
  ScrollText,
  Star,
  Settings,
  Headphones,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import type { AdminAction } from '@amana/shared-types';

export interface NavItem {
  href: string;
  label: string;
  /** وصف مختصر يظهر تحت العنوان في القائمة الجانبية (اختياري). */
  description?: string;
  icon: LucideIcon;
  /** الصلاحية المطلوبة لعرض العنصر والوصول للشاشة. بلا قيمة = متاح لكل الموظفين. */
  permission?: AdminAction;
}

/** عناصر التنقّل في القائمة الجانبية للوحة الإدارة. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',           label: 'لوحة المعلومات',                icon: LayoutDashboard, permission: 'view_dashboard' },
  { href: '/drivers',             label: 'السائقات',                      icon: Car,             permission: 'view_drivers'   },
  { href: '/passengers',          label: 'الركاب',                        icon: Users,           permission: 'view_riders'    },
  { href: '/rides',               label: 'الرحلات الحية',                icon: Navigation,      permission: 'view_rides'     },
  { href: '/pricing',             label: 'التسعير',                      icon: BadgePercent,    permission: 'view_pricing'   },
  { href: '/reports',             label: 'التقارير',                     icon: BarChart3,       permission: 'view_reports'   },
  { href: '/ratings',             label: 'التقييمات',                    icon: Star,           permission: 'view_ratings',   description: 'إدارة أسئلة التقييم ومتابعة التقييمات الواردة من التطبيقات' },
  { href: '/support',             label: 'الدعم الفني',                   icon: Headphones,     permission: 'view_support',   description: 'تذاكر الدعم الفني — استقبال الأسئلة والشكاوى من الركاب والسائقين' },
  { href: '/groups',              label: 'مجموعات النقل المشتركة',      icon: UsersRound,     permission: 'view_groups',    description: 'مجموعات تنسيق الرحلات بين الراكبات — للمراقبة والإشراف فقط' },
  { href: '/notifications',       label: 'الإعلانات والتنبيهات العامة',  icon: Radio,          permission: 'view_notifications', description: 'إرسال رسائل تظهر داخل تطبيقي الراكبة والسائقة' },
  { href: '/releases',            label: 'إصدارات التطبيقات',            icon: Smartphone,     permission: 'manage_releases', description: 'رفع ملفّات APK وإدارة نافذة «تحديث متاح» داخل التطبيقين' },
  { href: '/staff',               label: 'فريق العمل',                 icon: UserCog,        permission: 'view_staff'     },
  { href: '/audit-log',           label: 'سجل الحركات',                  icon: ScrollText,     permission: 'view_audit_log', description: 'سجلّ زمني لكل إجراء حسّاس على النظام — للمدير العام فقط' },
  { href: '/notification-settings', label: 'إعدادات التنبيهات',           icon: Settings,       permission: 'manage_notification_settings', description: 'تخصيص كيفية وصول الإشعارات للموظفين' },
  { href: '/system-notifications',label: 'الإشعارات',                     icon: Bell            },
];

/**
 * يعيد الصلاحية المطلوبة لمسار معيّن (أو null إن كان متاحًا لكل الموظفين).
 * يطابق أطول عنصر قائمة يبدأ به المسار (يدعم المسارات الفرعية مثل /staff/123).
 */
export function permissionForPath(pathname: string): AdminAction | null {
  const match = NAV_ITEMS
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.permission ?? null;
}
