import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * تفاصيل رحلة واحدة — مصدر واحد يخدم تطبيقَي الراكبة والسائقة.
 *
 * كانت كل شاشة تقرأ ما تحتاجه وحدها، فاختلفت الحقول بين الطرفين وظهرت رحلة
 * بمعلومات عند طرف وناقصة عند الآخر. الرحلة عقد بين اثنين: يجب أن يريا الوقائع
 * نفسها، ويختلف العرض لا البيانات.
 */

export interface RideTimelineStep {
  key: 'requested' | 'accepted' | 'arrived' | 'started' | 'completed' | 'cancelled' | 'paid';
  label: string;
  at: string | null;
  /** الفارق عن الخطوة السابقة بالدقائق — يكشف أين ضاع الوقت. */
  gapMinutes: number | null;
}

export interface RideDetail {
  id: string;
  status: string;

  passengerId: string | null;
  passengerName: string | null;
  driverId: string | null;
  driverName: string | null;
  driverVehicle: string | null;
  driverPlate: string | null;

  pickupAddress: string | null;
  dropoffAddress: string | null;
  pickup: { latitude: number; longitude: number } | null;
  dropoff: { latitude: number; longitude: number } | null;

  requestedClass: string | null;
  priceEstimate: number | null;
  fareTotal: number | null;

  paymentMethod: string | null;
  cashReceived: number | null;
  walletApplied: number | null;
  settlementDiff: number | null;

  cancelReason: string | null;
  timeline: RideTimelineStep[];
  /** مدّة الرحلة الفعلية بالدقائق (من البدء إلى الإنهاء). */
  durationMinutes: number | null;
}

const SELECT = [
  'id', 'status', 'passenger_id', 'passenger_name',
  'driver_id', 'driver_name', 'driver_vehicle', 'driver_plate',
  'pickup_lat', 'pickup_lng', 'pickup_address',
  'dropoff_lat', 'dropoff_lng', 'dropoff_address',
  'requested_class', 'price_estimate', 'fare_total',
  'payment_method', 'cash_received', 'wallet_applied', 'settlement_diff',
  'requested_at', 'accepted_at', 'driver_arrived_at', 'started_at',
  'completed_at', 'cancelled_at', 'cancel_reason', 'paid_at',
].join(', ');

const STEP_LABELS: Record<RideTimelineStep['key'], string> = {
  requested: 'طُلبت الرحلة',
  accepted: 'قبلتها السائقة',
  arrived: 'وصلت السائقة',
  started: 'بدأت الرحلة',
  completed: 'انتهت الرحلة',
  cancelled: 'أُلغيت الرحلة',
  paid: 'تمّ الدفع',
};

const minutesBetween = (a: string | null, b: string | null): number | null =>
  a && b ? Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)) : null;

const coord = (lat: unknown, lng: unknown) =>
  typeof lat === 'number' && typeof lng === 'number' ? { latitude: lat, longitude: lng } : null;

export async function getRideDetail(
  supabase: SupabaseClient,
  rideId: string,
): Promise<RideDetail | null> {
  const { data, error } = await supabase.from('rides').select(SELECT).eq('id', rideId).maybeSingle();
  if (error || !data) return null;

  const r = data as unknown as Record<string, unknown>;
  const at = (k: string) => (r[k] as string | null) ?? null;

  // الخطوات بالترتيب الزمني، وتُحذف ما لم يقع منها — فلا يرى المستخدم
  // «وصلت السائقة» في رحلة أُلغيت قبل وصولها.
  const raw: Array<{ key: RideTimelineStep['key']; at: string | null }> = [
    { key: 'requested', at: at('requested_at') },
    { key: 'accepted', at: at('accepted_at') },
    { key: 'arrived', at: at('driver_arrived_at') },
    { key: 'started', at: at('started_at') },
    { key: 'completed', at: at('completed_at') },
    { key: 'cancelled', at: at('cancelled_at') },
    { key: 'paid', at: at('paid_at') },
  ];

  let previous: string | null = null;
  const timeline: RideTimelineStep[] = raw
    .filter((s) => s.at != null)
    .sort((a, b) => new Date(a.at!).getTime() - new Date(b.at!).getTime())
    .map((s) => {
      const gap = minutesBetween(previous, s.at);
      previous = s.at;
      return { key: s.key, label: STEP_LABELS[s.key], at: s.at, gapMinutes: gap };
    });

  return {
    id: r.id as string,
    status: r.status as string,
    passengerId: at('passenger_id'),
    passengerName: at('passenger_name'),
    driverId: at('driver_id'),
    driverName: at('driver_name'),
    driverVehicle: at('driver_vehicle'),
    driverPlate: at('driver_plate'),
    pickupAddress: at('pickup_address'),
    dropoffAddress: at('dropoff_address'),
    pickup: coord(r.pickup_lat, r.pickup_lng),
    dropoff: coord(r.dropoff_lat, r.dropoff_lng),
    requestedClass: at('requested_class'),
    priceEstimate: (r.price_estimate as number | null) ?? null,
    fareTotal: (r.fare_total as number | null) ?? null,
    paymentMethod: at('payment_method'),
    cashReceived: (r.cash_received as number | null) ?? null,
    walletApplied: (r.wallet_applied as number | null) ?? null,
    settlementDiff: (r.settlement_diff as number | null) ?? null,
    cancelReason: at('cancel_reason'),
    timeline,
    durationMinutes: minutesBetween(at('started_at'), at('completed_at')),
  };
}
