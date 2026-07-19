import { supabase } from '@/lib/supabase';

/**
 * سجلّ رحلات السائقة — الرحلات التي قادتها (driver_id = المستخدمة الحالية).
 * لقطة اسم الراكبة والمسار والأجرة والتاريخ والحالة.
 */
export interface DriverRideHistoryItem {
  id: string;
  status: string; // requested | matched | in_progress | completed | cancelled
  passengerName: string | null;
  fare: number | null;
  from: string | null;
  to: string | null;
  at: string | null;
}

export async function listMyDriverRides(): Promise<DriverRideHistoryItem[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];

  const { data } = await supabase
    .from('rides')
    .select(
      'id, status, passenger_name, price_estimate, fare_total, pickup_address, dropoff_address, requested_at, completed_at',
    )
    .eq('driver_id', u.user.id)
    .order('requested_at', { ascending: false })
    .limit(50);

  return (data ?? []).map((r) => ({
    id: r.id as string,
    status: r.status as string,
    passengerName: (r.passenger_name as string | null) ?? null,
    fare: (r.fare_total as number | null) ?? (r.price_estimate as number | null) ?? null,
    from: (r.pickup_address as string | null) ?? null,
    to: (r.dropoff_address as string | null) ?? null,
    at: (r.completed_at as string | null) ?? (r.requested_at as string | null) ?? null,
  }));
}
