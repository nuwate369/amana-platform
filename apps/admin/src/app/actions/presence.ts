'use server';

import { getAdminSupabase } from '@/lib/supabase/admin';

/**
 * إجراءات خادمية لحضور المستخدمين — service role (تتجاوز RLS).
 *
 * الحالة الفعّالة: إن مرّ على آخر نبضة أكثر من STALE_MS نعدّها «غير متصلة»
 * (التطبيق أُغلق دون إشعار). خلاف ذلك: online إن كانت متاحة، وإلا idle (مفتوح).
 */

const STALE_MS = 45_000;

export type DriverLiveStatus = 'online' | 'idle' | 'offline';

export interface DriverPresence {
  userId: string;
  status: DriverLiveStatus;
  lastSeen: string | null;
}

export interface OnlineDriver {
  id: string;
  name: string | null;
  lat: number;
  lng: number;
  lastSeen: string | null;
}

interface PresenceRow {
  user_id: string;
  status: string | null;
  available: boolean | null;
  lat?: number | null;
  lng?: number | null;
  last_seen_at: string | null;
}

function effectiveStatus(r: PresenceRow): DriverLiveStatus {
  const last = r.last_seen_at ? new Date(r.last_seen_at).getTime() : 0;
  if (!last || Date.now() - last > STALE_MS) return 'offline';
  if (r.status === 'online' || r.available) return 'online';
  return 'idle';
}

/** حالة حضور كل السائقات (لعمود الحالة في شاشة السائقات). */
export async function listDriverPresence(): Promise<DriverPresence[]> {
  const db = getAdminSupabase();
  const { data, error } = await db
    .from('presence')
    .select('user_id, status, available, last_seen_at')
    .eq('role', 'driver');
  if (error || !data) return [];
  return data.map((r) => ({
    userId: r.user_id,
    status: effectiveStatus(r as PresenceRow),
    lastSeen: r.last_seen_at,
  }));
}

/** السائقات المتصلات الآن بإحداثيات حيّة (لعلامات خريطة المراقبة). */
export async function listOnlineDrivers(): Promise<OnlineDriver[]> {
  const db = getAdminSupabase();
  const { data, error } = await db
    .from('presence')
    .select('user_id, status, available, lat, lng, last_seen_at')
    .eq('role', 'driver')
    .eq('status', 'online');
  if (error || !data) return [];

  const fresh = (data as PresenceRow[]).filter(
    (r) => effectiveStatus(r) === 'online' && r.lat != null && r.lng != null,
  );
  if (fresh.length === 0) return [];

  const ids = fresh.map((r) => r.user_id);
  const names = new Map<string, string | null>();
  const { data: profs } = await db.from('profiles').select('id, full_name').in('id', ids);
  (profs ?? []).forEach((p) => names.set(p.id, (p.full_name as string | null) ?? null));

  return fresh.map((r) => ({
    id: r.user_id,
    name: names.get(r.user_id) ?? null,
    lat: r.lat as number,
    lng: r.lng as number,
    lastSeen: r.last_seen_at,
  }));
}
