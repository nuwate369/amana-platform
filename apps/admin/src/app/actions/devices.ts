'use server';

import { getAdminSupabase } from '@/lib/supabase/admin';

export interface TrustedDevice {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  lastSeenAt: string;
  isCurrent: boolean;
}

/**
 * جلب الأجهزة الموثوقة لمستخدم معين.
 */
export async function listTrustedDevices(userId: string): Promise<TrustedDevice[]> {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('trusted_devices')
    .select('*')
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false });

  if (error) {
    console.error('[listTrustedDevices]', error.message);
    return [];
  }

  return (data ?? []).map((d: any) => ({
    id: d.id,
    deviceName: d.device_name || 'جهاز غير معروف',
    browser: d.browser || 'غير معروف',
    os: d.os || 'غير معروف',
    ipAddress: d.ip_address || '—',
    lastSeenAt: d.last_seen_at,
    isCurrent: false,
  }));
}

/**
 * تسجيل جهاز جديد أو تحديث آخر ظهور.
 */
export async function registerDevice(
  userId: string,
  deviceInfo: { deviceName: string; browser: string; os: string; ipAddress: string },
): Promise<void> {
  const supabase = getAdminSupabase();

  // البحث عن جهاز بنفس الاسم والمتصفح
  const { data: existing } = await supabase
    .from('trusted_devices')
    .select('id')
    .eq('user_id', userId)
    .eq('device_name', deviceInfo.deviceName)
    .eq('browser', deviceInfo.browser)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('trusted_devices')
      .update({ last_seen_at: new Date().toISOString(), ip_address: deviceInfo.ipAddress })
      .eq('id', existing.id);
  } else {
    await supabase.from('trusted_devices').insert({
      user_id: userId,
      device_name: deviceInfo.deviceName,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      ip_address: deviceInfo.ipAddress,
    });
  }
}

/**
 * حذف جهاز واحد (إلغاء الموثوقية).
 */
export async function removeTrustedDevice(deviceId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminSupabase();
  const { error } = await supabase.from('trusted_devices').delete().eq('id', deviceId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * حذف كل الأجهزة (تسجيل خروج من كل الأجهزة).
 */
export async function logoutAllDevices(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminSupabase();
  const { error } = await supabase.from('trusted_devices').delete().eq('user_id', userId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
