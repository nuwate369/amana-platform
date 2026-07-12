import {
  LayoutDashboard,
  Car,
  Users,
  Navigation,
  BadgePercent,
  BarChart3,
  UsersRound,
  Bell,
  Shield,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** عناصر التنقّل في القائمة الجانبية للوحة الإدارة. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'لوحة المعلومات', icon: LayoutDashboard },
  { href: '/drivers', label: 'السائقات', icon: Car },
  { href: '/passengers', label: 'الراكبات', icon: Users },
  { href: '/rides', label: 'الرحلات الحية', icon: Navigation },
  { href: '/pricing', label: 'التسعير', icon: BadgePercent },
  { href: '/reports', label: 'التقارير', icon: BarChart3 },
  { href: '/groups', label: 'المجموعات', icon: UsersRound },
  { href: '/notifications', label: 'الإشعارات', icon: Bell },
  { href: '/users', label: 'المستخدمون والصلاحيات', icon: Shield },
];
