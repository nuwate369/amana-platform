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
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** علامة مميزة اختيارية (مثل عدد الإشعارات غير المقروءة). */
  badge?: number;
}

/** عناصر التنقّل في القائمة الجانبية للوحة الإدارة. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',           label: 'لوحة المعلومات',              icon: LayoutDashboard },
  { href: '/drivers',             label: 'السائقات',                    icon: Car             },
  { href: '/passengers',          label: 'الركاب',                      icon: Users           },
  { href: '/rides',               label: 'الرحلات الحية',              icon: Navigation      },
  { href: '/pricing',             label: 'التسعير',                    icon: BadgePercent    },
  { href: '/reports',             label: 'التقارير',                   icon: BarChart3       },
  { href: '/groups',              label: 'مجموعات المستخدمين',        icon: UsersRound      },
  { href: '/system-notifications',label: 'إشعارات النظام',             icon: Bell            },
  { href: '/notifications',       label: 'بث الإشعارات للمستخدمين',   icon: Radio           },
  { href: '/staff',               label: 'فريق العمل',                 icon: UserCog         },
  // ملاحظة: لا يوجد عنصر /roles — تم حذف شاشة الصلاحيات نهائياً
];
