'use server';

import { getAdminSupabase } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

/**
 * إجراءات خادمية لنظام الإشعارات الداخلي — تعمل بصلاحية service role.
 * الإدراج يتم عبر Triggers التلقائية في قاعدة البيانات فقط.
 */

export interface SystemNotification {
  id: string;
  type: string;
  title_ar: string;
  title_en: string;
  body_ar: string | null;
  body_en: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  target_user_id: string | null;
  is_read: boolean;
  created_at: string;
}

/**
 * جلب الإشعارات للموظف الحالي (عبر anon client في الواجهة).
 * هنا نستخدم service role لأننا في Server Action.
 */
export async function listSystemNotifications(
  userId: string,
  filters?: {
    isRead?: boolean;
    type?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ data: SystemNotification[]; total: number }> {
  const db = getAdminSupabase();

  let query = db
    .from('system_notifications')
    .select('*', { count: 'exact' })
    .or(`target_user_id.eq.${userId},target_user_id.is.null`)
    .order('created_at', { ascending: false });

  if (filters?.isRead !== undefined) {
    query = query.eq('is_read', filters.isRead);
  }
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, count } = await query;
  return { data: (data ?? []) as SystemNotification[], total: count ?? 0 };
}

/**
 * جلب آخر الإشعارات للجرس (أقل عدد مطلوب).
 */
export async function getRecentNotifications(
  userId: string,
  limit = 10
): Promise<SystemNotification[]> {
  const db = getAdminSupabase();
  const { data } = await db
    .from('system_notifications')
    .select('*')
    .or(`target_user_id.eq.${userId},target_user_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []) as SystemNotification[];
}

/**
 * عدد الإشعارات غير المقروءة للموظف.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const db = getAdminSupabase();
  const { count } = await db
    .from('system_notifications')
    .select('*', { count: 'exact', head: true })
    .or(`target_user_id.eq.${userId},target_user_id.is.null`)
    .eq('is_read', false);

  return count ?? 0;
}

/**
 * تحديد إشعار واحد كمقروء.
 */
export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const db = getAdminSupabase();
  const { error } = await db
    .from('system_notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .or(`target_user_id.eq.${userId},target_user_id.is.null`);

  return { ok: !error, error: error?.message };
}

/**
 * تحديد كل الإشعارات كمقروءة للموظف.
 */
export async function markAllAsRead(
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const db = getAdminSupabase();
  const { error } = await db
    .from('system_notifications')
    .update({ is_read: true })
    .or(`target_user_id.eq.${userId},target_user_id.is.null`)
    .eq('is_read', false);

  return { ok: !error, error: error?.message };
}

/**
 * حذف إشعار محدد.
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const db = getAdminSupabase();
  const { error } = await db
    .from('system_notifications')
    .delete()
    .eq('id', notificationId)
    .or(`target_user_id.eq.${userId},target_user_id.is.null`);

  return { ok: !error, error: error?.message };
}

// =============================================================================
// إعدادات التنبيهات
// =============================================================================

export interface NotificationSetting {
  id: string;
  notification_type: string;
  label_ar: string;
  label_en: string;
  description_ar: string | null;
  description_en: string | null;
  is_enabled: boolean;
  show_in_app: boolean;
  send_email: boolean;
  target_roles: string[];
  updated_at: string;
}

/**
 * جلب جميع إعدادات التنبيهات.
 */
export async function listNotificationSettings(): Promise<NotificationSetting[]> {
  const db = getAdminSupabase();
  const { data, error } = await db
    .from('notification_settings')
    .select('*')
    .order('notification_type');

  if (error) {
    console.error('[listNotificationSettings] error:', error.message);
    return [];
  }

  return (data ?? []) as NotificationSetting[];
}

/**
 * تحديث إعداد تنبيه محدد.
 */
export async function updateNotificationSetting(
  settingId: string,
  updates: Partial<Pick<NotificationSetting, 'is_enabled' | 'show_in_app' | 'send_email' | 'target_roles'>>
): Promise<{ ok: boolean; error?: string }> {
  const db = getAdminSupabase();
  const { error } = await db
    .from('notification_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', settingId);

  if (error) {
    console.error('[updateNotificationSetting] error:', error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath('/notification-settings');
  return { ok: true };
}
