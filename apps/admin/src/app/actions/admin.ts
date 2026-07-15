'use server';

import { getAdminSupabase } from '@/lib/supabase/admin';

/**
 * إجراءات خادمية للوحة الإدارة — تعمل بصلاحية service role (تتجاوز RLS).
 * تُستدعى فقط من الخادم؛ لا تُستورد في كود العميل.
 * الصلاحيات تُطبَّق في middleware وRoute Guards عبر can() من shared-types.
 */

export interface DashboardStats {
  passengers: number;
  drivers: number;
  activeDrivers: number;
  pendingKyc: number;
  totalRides: number;
  revenue: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = getAdminSupabase();
  const head = { count: 'exact' as const, head: true };

  const [passengers, drivers, activeDrivers, pendingKyc, totalRides, completed] = await Promise.all([
    db.from('profiles').select('*', head).eq('user_type', 'passenger'),
    db.from('profiles').select('*', head).eq('user_type', 'driver'),
    db.from('drivers').select('*', head).eq('status', 'approved'),
    // «قيد المراجعة» = أُرسِلت فعلاً للتدقيق فقط (لا المسودّات). قبل تطبيق هجرة
    // 0025 يكون العمود غير موجود فنسقط للعدّ القديم (كل pending) تفاديًا للخطأ.
    db
      .from('drivers')
      .select('*', head)
      .eq('status', 'pending')
      .not('kyc_submitted_at', 'is', null)
      .then((r) =>
        r.error && isMissingColumn(r.error)
          ? db.from('drivers').select('*', head).eq('status', 'pending')
          : r,
      ),
    db.from('rides').select('*', head),
    db.from('rides').select('price_final').eq('status', 'completed'),
  ]);

  const revenue = (completed.data ?? []).reduce((s, r) => s + Number(r.price_final ?? 0), 0);

  return {
    passengers: passengers.count ?? 0,
    drivers: drivers.count ?? 0,
    activeDrivers: activeDrivers.count ?? 0,
    pendingKyc: pendingKyc.count ?? 0,
    totalRides: totalRides.count ?? 0,
    revenue,
  };
}

/** حقول الإشراف المشتركة (حالة النشاط + سياق الحظر + الحماية). */
interface ModerationFields {
  isActive: boolean;
  isProtected: boolean;
  banReason: string | null;
  bannedAt: string | null;
}

const NO_MODERATION: ModerationFields = {
  isActive: true,
  isProtected: false,
  banReason: null,
  bannedAt: null,
};

function pickModeration(p: Record<string, unknown> | null | undefined): ModerationFields {
  if (!p) return NO_MODERATION;
  return {
    isActive: p.is_active === undefined ? true : !!p.is_active,
    isProtected: !!p.is_protected,
    banReason: (p.ban_reason as string | null) ?? null,
    bannedAt: (p.banned_at as string | null) ?? null,
  };
}

/** يُميّز خطأ «العمود غير موجود» (قبل تطبيق هجرة 0013). */
function isMissingColumn(error: { code?: string } | null): boolean {
  return error?.code === '42703';
}

export interface DriverRow {
  id: string;
  fullName: string | null;
  phone: string | null;
  status: string;
  /** أرسلت طلبها للتدقيق فعلاً؟ (status='pending' + submitted=false ⇒ مسودّة). */
  submitted: boolean;
  vehicle: string;
  plate: string | null;
  isActive: boolean;
  isProtected: boolean;
  banReason: string | null;
  bannedAt: string | null;
}

export async function listDrivers(): Promise<DriverRow[]> {
  const db = getAdminSupabase();
  const rich =
    'id, status, kyc_submitted_at, vehicle_make, vehicle_model, vehicle_plate, profiles(full_name, phone, is_active, is_protected, ban_reason, banned_at)';
  const basic = 'id, status, vehicle_make, vehicle_model, vehicle_plate, profiles(full_name, phone)';

  const first = await db.from('drivers').select(rich).order('status');
  const res = first.error && isMissingColumn(first.error)
    ? await db.from('drivers').select(basic).order('status')
    : first;
  const data = (res.data ?? []) as any[];

  return data.map((d) => {
    const profile = d.profiles as unknown as Record<string, unknown> | null;
    return {
      id: d.id,
      fullName: (profile?.full_name as string | null) ?? null,
      phone: (profile?.phone as string | null) ?? null,
      status: d.status,
      submitted: Boolean(d.kyc_submitted_at),
      vehicle: [d.vehicle_make, d.vehicle_model].filter(Boolean).join(' ') || '—',
      plate: d.vehicle_plate,
      ...pickModeration(profile),
    };
  });
}

export interface ProfileRow {
  id: string;
  fullName: string | null;
  phone: string | null;
  createdAt: string;
  isActive: boolean;
  isProtected: boolean;
  banReason: string | null;
  bannedAt: string | null;
}

export async function listPassengers(): Promise<ProfileRow[]> {
  return listProfilesByType('passenger');
}

async function listProfilesByType(
  userType: 'passenger' | 'driver',
): Promise<ProfileRow[]> {
  const db = getAdminSupabase();
  const rich = 'id, full_name, phone, created_at, is_active, is_protected, ban_reason, banned_at';
  const basic = 'id, full_name, phone, created_at';

  // قبل الهجرة: عمود user_type غير موجود؛ فلترة الراكبات تسقط للاعتماد على role.
  const first = await db
    .from('profiles')
    .select(rich)
    .eq('user_type', userType)
    .order('created_at', { ascending: false });

  const res = first.error && isMissingColumn(first.error)
    ? await db
        .from('profiles')
        .select(basic)
        .eq('role', userType)
        .order('created_at', { ascending: false })
    : first;
  const data = (res.data ?? []) as any[];

  return data.map((p) => ({
    id: p.id,
    fullName: p.full_name,
    phone: p.phone,
    createdAt: p.created_at,
    ...pickModeration(p as Record<string, unknown>),
  }));
}

/**
 * تغيير كلمة المرور باستخدام service_role — يتخطى قيد AAL2 للمستخدمين مع MFA.
 */
export async function resetUserPassword(
  userId: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminSupabase();
    const { error } = await db.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'حدث خطأ غير متوقع' };
  }
}
