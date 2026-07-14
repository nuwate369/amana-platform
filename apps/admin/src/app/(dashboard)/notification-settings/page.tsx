import NotificationSettingsClient from './NotificationSettingsClient';
import { listNotificationSettings } from '@/app/actions/notifications';

// شاشة محمية ببيانات حيّة — تُعرض ديناميكياً (لا تُولَّد ساكنة وقت البناء).
export const dynamic = 'force-dynamic';

/**
 * صفحة إعدادات التنبيهات — تتحكم في كيفية وصول الإشعارات للموظفين.
 */
export default async function NotificationSettingsPage() {
  const settings = await listNotificationSettings();
  return <NotificationSettingsClient initialSettings={settings} />;
}
