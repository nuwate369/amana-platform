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
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  /** وصف مختصر يظهر تحت العنوان في القائمة الجانبية (اختياري). */
  description?: string;
  icon: LucideIcon;
}

/** عناصر التنقّل في القائمة الجانبية للوحة الإدارة. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',           label: 'لوحة المعلومات',                icon: LayoutDashboard },
  { href: '/drivers',             label: 'السائقات',                      icon: Car             },
  { href: '/passengers',          label: 'الركاب',                        icon: Users           },
  { href: '/rides',               label: 'الرحلات الحية',                icon: Navigation      },
  { href: '/pricing',             label: 'التسعير',                      icon: BadgePercent    },
  { href: '/reports',             label: 'التقارير',                     icon: BarChart3       },
  { href: '/ratings',             label: 'التقييمات',                    icon: Star,           description: 'إدارة أسئلة التقييم ومتابعة التقييمات الواردة من التطبيقات' },
  { href: '/groups',              label: 'مجموعات النقل المشتركة',      icon: UsersRound,     description: 'مجموعات تنسيق الرحلات بين الراكبات — للمراقبة والإشراف فقط' },
  { href: '/notifications',       label: 'الإعلانات والتنبيهات العامة',  icon: Radio,          description: 'إرسال رسائل تظهر داخل تطبيقي الراكبة والسائقة' },
  { href: '/staff',               label: 'فريق العمل',                   icon: UserCog         },
  { href: '/audit-log',           label: 'سجل الحركات',                  icon: ScrollText,     description: 'سجلّ زمني لكل إجراء حسّاس على النظام — للمدير العام والمدير' },
  { href: '/notification-settings', label: 'إعدادات التنبيهات',           icon: Settings,       description: 'تخصيص كيفية وصول الإشعارات للموظفين' },
  { href: '/system-notifications',label: 'الإشعارات',                     icon: Bell            },
];
