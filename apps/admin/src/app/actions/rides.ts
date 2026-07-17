'use server';

import { getAdminSupabase } from '@/lib/supabase/admin';

/**
 * إجراءات خادمية لمراقبة الرحلات الحيّة — تعمل بصلاحية service role (تتجاوز RLS).
 * تُستدعى فقط من الخادم؛ لا تُستورد في كود العميل.
 *
 * «حيّة» = الرحلات غير المكتملة وغير الملغاة: طلب جديد (requested) أو مقبولة
 * (matched) أو جارية (in_progress). تُرسم مواقع الالتقاط/الوجهة على الخريطة.
 */

export type ActiveRideStatus = 'requested' | 'matched' | 'in_progress';

const ACTIVE_STATUSES: ActiveRideStatus[] = ['requested', 'matched', 'in_progress'];

export interface ActiveRide {
  id: string;
  status: ActiveRideStatus;
  passengerName: string | null;
  driverName: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  pickupAddress: string | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  dropoffAddress: string | null;
  requestedAt: string;
}

export interface RidesSnapshot {
  rides: ActiveRide[];
  /** جارية = matched + in_progress. */
  ongoing: number;
  /** معلّقة = requested (بانتظار قبول سائقة). */
  pending: number;
  /** سائقات في رحلة نشطة الآن (متمايزة). */
  activeDrivers: number;
}

const EMPTY: RidesSnapshot = { rides: [], ongoing: 0, pending: 0, activeDrivers: 0 };

/** يجلب لقطة الرحلات الحيّة مع أسماء الراكبة/السائقة والعدّادات. */
export async function listActiveRides(): Promise<RidesSnapshot> {
  const db = getAdminSupabase();

  const { data: rows, error } = await db
    .from('rides')
    .select(
      'id, status, passenger_id, driver_id, pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, dropoff_address, requested_at',
    )
    .in('status', ACTIVE_STATUSES)
    .order('requested_at', { ascending: false });

  if (error || !rows) return EMPTY;

  // أسماء المشاركات — استعلام واحد لكل المعرّفات (يتفادى هشاشة تسمية المفاتيح الأجنبية).
  const ids = Array.from(
    new Set(rows.flatMap((r) => [r.passenger_id, r.driver_id]).filter(Boolean) as string[]),
  );
  const names = new Map<string, string | null>();
  if (ids.length) {
    const { data: profs } = await db.from('profiles').select('id, full_name').in('id', ids);
    (profs ?? []).forEach((p) => names.set(p.id, (p.full_name as string | null) ?? null));
  }

  const rides: ActiveRide[] = rows.map((r) => ({
    id: r.id,
    status: r.status as ActiveRideStatus,
    passengerName: r.passenger_id ? names.get(r.passenger_id) ?? null : null,
    driverName: r.driver_id ? names.get(r.driver_id) ?? null : null,
    pickupLat: r.pickup_lat,
    pickupLng: r.pickup_lng,
    pickupAddress: r.pickup_address,
    dropoffLat: r.dropoff_lat,
    dropoffLng: r.dropoff_lng,
    dropoffAddress: r.dropoff_address,
    requestedAt: r.requested_at,
  }));

  const ongoing = rides.filter((r) => r.status === 'matched' || r.status === 'in_progress').length;
  const pending = rides.filter((r) => r.status === 'requested').length;
  const activeDrivers = new Set(
    rows
      .filter((r) => (r.status === 'matched' || r.status === 'in_progress') && r.driver_id)
      .map((r) => r.driver_id as string),
  ).size;

  return { rides, ongoing, pending, activeDrivers };
}
