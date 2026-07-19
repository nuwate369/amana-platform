'use server';

import { getAdminSupabase } from '@/lib/supabase/admin';

/**
 * إجراءات خادمية لصفحة الإعلانات — تُنشئ/تقرأ إعلانات موجّهة للمستخدمين النهائيين
 * (جدول announcements) بصلاحية service role. الجمهور: all/passengers/drivers/specific.
 * recipient_count يُحسب وقت الإرسال لإحصاء «إجمالي المستلمين».
 */

export type AnnouncementType = 'announcement' | 'maintenance' | 'update';
export type AnnouncementAudience = 'all' | 'passengers' | 'drivers' | 'specific';

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string | null;
  type: AnnouncementType;
  audience: AnnouncementAudience;
  targetUserId: string | null;
  targetName: string | null;
  status: 'sent' | 'scheduled';
  recipientCount: number;
  createdAt: string;
  expiresAt: string;
}

export interface AnnouncementInput {
  title: string;
  body: string;
  type: AnnouncementType;
  audience: AnnouncementAudience;
  targetUserId?: string | null;
  createdBy?: string | null;
  expiresAt: string;
}

export interface AnnouncementStats {
  totalSent: number;      // عدد الإعلانات المُرسَلة
  totalRecipients: number; // إجمالي المستلمين (مجموع recipient_count)
}

export interface RecipientOption {
  id: string;
  name: string;
  role: 'passenger' | 'driver';
  phone: string | null;
}

/** عدّ المستخدمين حسب النوع (راكبة/سائقة). */
async function countUsers(
  db: ReturnType<typeof getAdminSupabase>,
  userType: 'passenger' | 'driver',
): Promise<number> {
  const { count } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('user_type', userType);
  return count ?? 0;
}

/** عدد المستلمين المتوقّع حسب الجمهور (لحظة الإرسال). */
async function resolveRecipientCount(
  db: ReturnType<typeof getAdminSupabase>,
  audience: AnnouncementAudience,
): Promise<number> {
  if (audience === 'specific') return 1;
  if (audience === 'passengers') return countUsers(db, 'passenger');
  if (audience === 'drivers') return countUsers(db, 'driver');
  // all
  const [p, d] = await Promise.all([countUsers(db, 'passenger'), countUsers(db, 'driver')]);
  return p + d;
}

/** قائمة المستخدمين (راكبات + سائقات) لاختيار مستلم محدّد. */
export async function listRecipientsForPicker(): Promise<RecipientOption[]> {
  const db = getAdminSupabase();
  const { data } = await db
    .from('profiles')
    .select('id, full_name, phone, user_type')
    .in('user_type', ['passenger', 'driver'])
    .order('full_name', { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: (r.full_name as string | null) ?? '—',
    role: (r.user_type as 'passenger' | 'driver') ?? 'passenger',
    phone: (r.phone as string | null) ?? null,
  }));
}

/** إحصاءات الإعلانات ضمن نطاق تاريخ اختياري (ISO). */
export async function getAnnouncementStats(
  fromISO?: string | null,
  toISO?: string | null,
): Promise<AnnouncementStats> {
  const db = getAdminSupabase();
  let q = db.from('announcements').select('recipient_count', { count: 'exact' });
  if (fromISO) q = q.gte('created_at', fromISO);
  if (toISO) q = q.lte('created_at', toISO);
  const { data, count } = await q;
  const totalRecipients = (data ?? []).reduce((s, r) => s + Number(r.recipient_count ?? 0), 0);
  return { totalSent: count ?? 0, totalRecipients };
}

/** قائمة الإعلانات (الأحدث أولًا) ضمن نطاق تاريخ اختياري، مع اسم المستلم المحدّد. */
export async function listAnnouncements(
  fromISO?: string | null,
  toISO?: string | null,
): Promise<AnnouncementRow[]> {
  const db = getAdminSupabase();
  let q = db
    .from('announcements')
    .select('id, title, body, type, audience, target_user_id, status, recipient_count, created_at, expires_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (fromISO) q = q.gte('created_at', fromISO);
  if (toISO) q = q.lte('created_at', toISO);
  const { data } = await q;
  const rows = data ?? [];

  // أسماء المستلمين المحدّدين (استعلام واحد).
  const targetIds = rows.map((r) => r.target_user_id).filter(Boolean) as string[];
  const names = new Map<string, string>();
  if (targetIds.length) {
    const { data: profs } = await db.from('profiles').select('id, full_name').in('id', targetIds);
    (profs ?? []).forEach((p) => names.set(p.id as string, (p.full_name as string | null) ?? '—'));
  }

  return rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    body: (r.body as string | null) ?? null,
    type: r.type as AnnouncementType,
    audience: r.audience as AnnouncementAudience,
    targetUserId: (r.target_user_id as string | null) ?? null,
    targetName: r.target_user_id ? (names.get(r.target_user_id as string) ?? null) : null,
    status: r.status as 'sent' | 'scheduled',
    recipientCount: Number(r.recipient_count ?? 0),
    createdAt: r.created_at as string,
    expiresAt: r.expires_at as string,
  }));
}

/** إنشاء (إرسال) إعلان جديد. يعيد نتيجة موصوفة (لا يرمي). */
export async function createAnnouncement(
  input: AnnouncementInput,
): Promise<{ ok: boolean; error?: string }> {
  const title = input.title.trim();
  if (title.length < 3) return { ok: false, error: 'العنوان قصير جدًا.' };
  if (input.audience === 'specific' && !input.targetUserId) {
    return { ok: false, error: 'اختر المستخدم المستهدف.' };
  }

  const db = getAdminSupabase();
  const recipientCount = await resolveRecipientCount(db, input.audience);

  const { error } = await db.from('announcements').insert({
    title,
    body: input.body.trim() || null,
    type: input.type,
    audience: input.audience,
    target_user_id: input.audience === 'specific' ? input.targetUserId : null,
    status: 'sent',
    recipient_count: recipientCount,
    created_by: input.createdBy ?? null,
    sent_at: new Date().toISOString(),
    expires_at: input.expiresAt,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
