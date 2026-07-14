import NotificationSettingsClient from './NotificationSettingsClient';
import { listNotificationSettings } from '@/app/actions/notifications';

/**
 * صفحة إعدادات التنبيهات — تتحكم في كيفية وصول الإشعارات للموظفين.
 */
export default async function NotificationSettingsPage() {
  const settings = await listNotificationSettings();
  return <NotificationSettingsClient initialSettings={settings} />;
}
