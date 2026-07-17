import { supabase } from '@/lib/supabase';

/**
 * منطق الرحلة (جهة الراكبة) — إنشاء طلب رحلة حقيقيّ في جدول `rides` وحساب تقدير
 * السعر من المسافة. الحالة الابتدائية `requested`؛ تلتقطها السائقات المتصلات.
 */

export interface Coord {
  latitude: number;
  longitude: number;
}

export interface RideDraft {
  pickup: Coord;
  pickupAddress?: string | null;
  dropoff: Coord;
  dropoffAddress?: string | null;
  priceEstimate: number;
}

/** تسعير مبسّط: أجرة أساس + سعر لكل كيلومتر (قابل للضبط لاحقًا من إعدادات المنصّة). */
const BASE_FARE = 10; // ر.س
const PER_KM = 2.5; // ر.س/كم

/** المسافة بين نقطتين بالكيلومترات (Haversine). */
export function haversineKm(a: Coord, b: Coord): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** تقدير السعر لمسافة (كم) مع معامل نوع الرحلة. */
export function estimatePrice(km: number, multiplier = 1): number {
  return Math.max(BASE_FARE, Math.round((BASE_FARE + PER_KM * km) * multiplier));
}

export type CreateRideResult = { id: string } | { error: string };

/** ينشئ طلب رحلة جديدًا (status=requested) للراكبة الحاليّة. */
export async function createRide(d: RideDraft): Promise<CreateRideResult> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { error: 'يجب تسجيل الدخول أولًا.' };

  // لقطة اسم الراكبة على الرحلة (السائقة محجوبة عن قراءة profiles).
  const { data: me } = await supabase.from('profiles').select('full_name').eq('id', u.user.id).single();

  const { data, error } = await supabase
    .from('rides')
    .insert({
      passenger_id: u.user.id,
      passenger_name: (me?.full_name as string | null) ?? null,
      status: 'requested',
      pickup_lat: d.pickup.latitude,
      pickup_lng: d.pickup.longitude,
      pickup_address: d.pickupAddress ?? null,
      dropoff_lat: d.dropoff.latitude,
      dropoff_lng: d.dropoff.longitude,
      dropoff_address: d.dropoffAddress ?? null,
      price_estimate: d.priceEstimate,
    })
    .select('id')
    .single();

  if (error || !data) return { error: error?.message ?? 'تعذّر إنشاء طلب الرحلة.' };
  return { id: data.id as string };
}

/** إلغاء طلب رحلة (من الراكبة) — يضبط الحالة إلى cancelled. */
export async function cancelRide(rideId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('rides').update({ status: 'cancelled' }).eq('id', rideId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export interface RideDetails {
  id: string;
  status: string;
  driverId: string | null;
  pickup: Coord | null;
  dropoff: Coord | null;
  /** موقع السائقة الحيّ (من صفّ الرحلة). */
  driver: Coord | null;
  driverName: string | null;
  vehicle: string | null;
  plate: string | null;
  priceEstimate: number | null;
}

/** تفاصيل الرحلة — تُقرأ كلّها من صفّ الرحلة (بيانات السائقة لقطة، بلا انتهاك RLS). */
export async function getRide(rideId: string): Promise<RideDetails | null> {
  const { data, error } = await supabase
    .from('rides')
    .select(
      'id, status, driver_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, driver_lat, driver_lng, driver_name, driver_vehicle, driver_plate, price_estimate',
    )
    .eq('id', rideId)
    .single();
  if (error || !data) return null;
  const coord = (lat: number | null, lng: number | null): Coord | null =>
    lat != null && lng != null ? { latitude: lat, longitude: lng } : null;
  return {
    id: data.id,
    status: data.status,
    driverId: data.driver_id ?? null,
    pickup: coord(data.pickup_lat, data.pickup_lng),
    dropoff: coord(data.dropoff_lat, data.dropoff_lng),
    driver: coord(data.driver_lat, data.driver_lng),
    driverName: data.driver_name ?? null,
    vehicle: data.driver_vehicle ?? null,
    plate: data.driver_plate ?? null,
    priceEstimate: data.price_estimate ?? null,
  };
}

/** الراكبة تؤكّد الوصول — تُنهي الرحلة. */
export async function completeRide(rideId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('rides')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', rideId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** تقييم السائقة بعد الرحلة. */
export async function submitRating(
  rideId: string,
  rateeId: string,
  stars: number,
  comment: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, error: 'يجب تسجيل الدخول.' };
  const { error } = await supabase.from('ratings').insert({
    ride_id: rideId,
    rater_id: u.user.id,
    ratee_id: rateeId,
    stars,
    comment: comment.trim() || null,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}
