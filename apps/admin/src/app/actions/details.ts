'use server';

import { STAFF_TYPES, type UserType } from '@amana/shared-types';
import { getAdminSupabase } from '@/lib/supabase/admin';

/**
 * تفاصيل مستخدم (راكبة/سائقة/موظف) للعرض في نافذة التفاصيل الموحّدة:
 * - راكبة/سائقة: الملف + البريد + بيانات السائقة + إحصاءات الرحلات + آخر
 *   الرحلات + آخر التقييمات المستلمة + سياق الحظر.
 * - موظف: الملف + البريد + آخر دخول + حركاته في سجل النظام (audit_logs).
 * قراءة فقط — بلا أي تعديل.
 */

export interface RideSummary {
  id: string;
  pickup: string | null;
  dropoff: string | null;
  status: string;
  price: number | null;
  requestedAt: string;
}

export interface RatingSummary {
  id: string;
  stars: number;
  comment: string | null;
  raterName: string | null;
  createdAt: string;
}

export interface AuditSummary {
  id: string;
  action: string;
  targetName: string | null;
  reason: string | null;
  createdAt: string;
}

export interface UserDetails {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  userType: UserType | null;
  avatarUrl: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  // الحظر/التعطيل
  isActive: boolean;
  isProtected: boolean;
  banReason: string | null;
  bannedAt: string | null;
  bannedByName: string | null;
  // السائقة (null لغيرها)
  driver: {
    status: string;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleYear: number | null;
    vehiclePlate: string | null;
    vehicleRegistrationNumber: string | null;
    nationalIdNumber: string | null;
    rejectionReason: string | null;
    licenseUrl: string | null;
    nationalIdUrl: string | null;
    vehicleRegistrationUrl: string | null;
    carPhotoUrl: string | null;
  } | null;
  // إحصاءات
  stats: {
    ridesTotal: number;
    ridesCompleted: number;
    amountTotal: number;
    avgRating: number | null;
    ratingsCount: number;
    auditTotal: number;
  };
  recentRides: RideSummary[];
  recentRatings: RatingSummary[];
  recentAudit: AuditSummary[];
}

export async function getUserDetails(userId: string): Promise<UserDetails | null> {
  const db = getAdminSupabase();

  const { data: profile, error: pErr } = await db
    .from('profiles')
    .select(
      'id, full_name, phone, user_type, avatar_url, created_at, is_active, is_protected, ban_reason, banned_by, banned_at',
    )
    .eq('id', userId)
    .maybeSingle();

  if (pErr || !profile) {
    if (pErr) console.error('[getUserDetails] profile error:', pErr.code, pErr.message);
    return null;
  }

  const userType = (profile.user_type as UserType | null) ?? null;
  const isDriver = userType === 'driver';
  const isStaffUser = !!userType && STAFF_TYPES.includes(userType);
  const rideCol = isDriver ? 'driver_id' : 'passenger_id';

  const [
    authRes,
    driverRes,
    ridesCountRes,
    completedRes,
    recentRes,
    ratingsRes,
    auditRes,
    auditCountRes,
    bannedByRes,
  ] = await Promise.all([
    db.auth.admin.getUserById(userId),
    isDriver
      ? db
          .from('drivers')
          .select(
            'status, vehicle_make, vehicle_model, vehicle_year, vehicle_plate, vehicle_registration_number, national_id_number, rejection_reason, license_url, national_id_url, vehicle_registration_url, car_photo_url',
          )
          .eq('id', userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    isStaffUser
      ? Promise.resolve({ count: 0 })
      : db.from('rides').select('*', { count: 'exact', head: true }).eq(rideCol, userId),
    isStaffUser
      ? Promise.resolve({ data: [] })
      : db.from('rides').select('price_final').eq(rideCol, userId).eq('status', 'completed'),
    isStaffUser
      ? Promise.resolve({ data: [] })
      : db
          .from('rides')
          .select('id, pickup_address, dropoff_address, status, price_final, price_estimate, requested_at')
          .eq(rideCol, userId)
          .order('requested_at', { ascending: false })
          .limit(5),
    isStaffUser
      ? Promise.resolve({ data: [] })
      : db
          .from('ratings')
          .select('id, stars, comment, rater_id, created_at')
          .eq('ratee_id', userId)
          .order('created_at', { ascending: false }),
    isStaffUser
      ? db
          .from('audit_logs')
          .select('id, action, target_name, reason, created_at')
          .eq('actor_id', userId)
          .order('created_at', { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] }),
    isStaffUser
      ? db.from('audit_logs').select('*', { count: 'exact', head: true }).eq('actor_id', userId)
      : Promise.resolve({ count: 0 }),
    profile.banned_by
      ? db.from('profiles').select('full_name').eq('id', profile.banned_by).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const completedRows = (completedRes.data ?? []) as { price_final: number | null }[];
  const amountTotal = completedRows.reduce((s, r) => s + Number(r.price_final ?? 0), 0);

  const ratingRows = (ratingsRes.data ?? []) as {
    id: string; stars: number; comment: string | null; rater_id: string; created_at: string;
  }[];
  const avgRating = ratingRows.length
    ? Math.round((ratingRows.reduce((s, r) => s + r.stars, 0) / ratingRows.length) * 10) / 10
    : null;

  // أسماء المقيِّمين لآخر التقييمات (استعلام ثانٍ لتفادي التباس FK المزدوج)
  const recentRatingRows = ratingRows.slice(0, 4);
  const raterNames = new Map<string, string | null>();
  if (recentRatingRows.length) {
    const raterIds = [...new Set(recentRatingRows.map((r) => r.rater_id))];
    const { data: raters } = await db.from('profiles').select('id, full_name').in('id', raterIds);
    for (const p of raters ?? []) raterNames.set(p.id, p.full_name);
  }

  const d = driverRes.data as {
    status: string;
    vehicle_make: string | null;
    vehicle_model: string | null;
    vehicle_year: number | null;
    vehicle_plate: string | null;
    vehicle_registration_number: string | null;
    national_id_number: string | null;
    rejection_reason: string | null;
    license_url: string | null;
    national_id_url: string | null;
    vehicle_registration_url: string | null;
    car_photo_url: string | null;
  } | null;

  const authUser = authRes.data?.user;

  // مستندات KYC مخزّنة في bucket خاص (kyc-documents) كمسارات — نولّد روابط
  // موقّعة مؤقتة (ساعة) ليتمكّن الموظف من معاينتها في نافذة التفاصيل.
  async function toSignedUrl(path: string | null): Promise<string | null> {
    if (!path) return null;
    if (path.startsWith('http')) return path; // بيانات قديمة برابط كامل
    const { data } = await db.storage.from('kyc-documents').createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
  }
  const [nationalIdSigned, licenseSigned, vehicleRegSigned, carPhotoSigned] = d
    ? await Promise.all([
        toSignedUrl(d.national_id_url),
        toSignedUrl(d.license_url),
        toSignedUrl(d.vehicle_registration_url),
        toSignedUrl(d.car_photo_url),
      ])
    : [null, null, null, null];

  return {
    id: profile.id,
    fullName: profile.full_name,
    email: authUser?.email ?? null,
    phone: profile.phone,
    userType,
    avatarUrl: profile.avatar_url,
    createdAt: profile.created_at,
    lastSignInAt: (authUser?.last_sign_in_at as string | undefined) ?? null,
    isActive: profile.is_active !== false,
    isProtected: !!profile.is_protected,
    banReason: profile.ban_reason,
    bannedAt: profile.banned_at,
    bannedByName: (bannedByRes.data?.full_name as string | null) ?? null,
    driver: d
      ? {
          status: d.status,
          vehicleMake: d.vehicle_make,
          vehicleModel: d.vehicle_model,
          vehicleYear: d.vehicle_year,
          vehiclePlate: d.vehicle_plate,
          vehicleRegistrationNumber: d.vehicle_registration_number,
          nationalIdNumber: d.national_id_number,
          rejectionReason: d.rejection_reason,
          licenseUrl: licenseSigned,
          nationalIdUrl: nationalIdSigned,
          vehicleRegistrationUrl: vehicleRegSigned,
          carPhotoUrl: carPhotoSigned,
        }
      : null,
    stats: {
      ridesTotal: ridesCountRes.count ?? 0,
      ridesCompleted: completedRows.length,
      amountTotal,
      avgRating,
      ratingsCount: ratingRows.length,
      auditTotal: auditCountRes.count ?? 0,
    },
    recentRides: ((recentRes.data ?? []) as any[]).map((r) => ({
      id: r.id,
      pickup: r.pickup_address,
      dropoff: r.dropoff_address,
      status: r.status,
      price: r.price_final ?? r.price_estimate ?? null,
      requestedAt: r.requested_at,
    })),
    recentRatings: recentRatingRows.map((r) => ({
      id: r.id,
      stars: r.stars,
      comment: r.comment,
      raterName: raterNames.get(r.rater_id) ?? null,
      createdAt: r.created_at,
    })),
    recentAudit: ((auditRes.data ?? []) as any[]).map((a) => ({
      id: a.id,
      action: a.action,
      targetName: a.target_name,
      reason: a.reason,
      createdAt: a.created_at,
    })),
  };
}
