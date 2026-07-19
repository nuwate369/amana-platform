import { supabase } from '@/lib/supabase';

/**
 * بيانات حساب الراكبة الحقيقية (بدل بيانات Stitch الوهمية): الملف الشخصي +
 * إحصاءاته، وسجلّ رحلاتها. كلّها من Supabase بصلاحية الراكبة نفسها (RLS).
 */

export interface MyProfile {
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  joinedAt: string | null;
  trips: number; // عدد الرحلات المكتملة
  rating: number | null; // متوسّط تقييم السائقات لها
}

export async function getMyProfile(): Promise<MyProfile | null> {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) return null;

  const [{ data: prof }, tripsRes, { data: ratings }] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url, created_at').eq('id', user.id).maybeSingle(),
    supabase
      .from('rides')
      .select('id', { count: 'exact', head: true })
      .eq('passenger_id', user.id)
      .eq('status', 'completed'),
    supabase.from('ratings').select('stars').eq('ratee_id', user.id),
  ]);

  const stars = (ratings ?? [])
    .map((r) => Number((r as { stars: number }).stars))
    .filter((n) => !Number.isNaN(n));
  const rating = stars.length
    ? Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 10) / 10
    : null;

  return {
    fullName:
      (prof?.full_name as string | null) ??
      ((user.user_metadata?.full_name as string | undefined) ?? null),
    email: user.email ?? null,
    avatarUrl: (prof?.avatar_url as string | null) ?? null,
    joinedAt: (prof?.created_at as string | null) ?? null,
    trips: tripsRes.count ?? 0,
    rating,
  };
}

export interface RideHistoryItem {
  id: string;
  status: string; // requested | matched | in_progress | completed | cancelled
  driverName: string | null;
  fare: number | null;
  from: string | null;
  to: string | null;
  at: string | null; // وقت الإنشاء/الإكمال
}

export async function listMyRides(): Promise<RideHistoryItem[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];

  const { data } = await supabase
    .from('rides')
    .select(
      'id, status, driver_name, price_estimate, fare_total, pickup_address, dropoff_address, requested_at, completed_at',
    )
    .eq('passenger_id', u.user.id)
    .order('requested_at', { ascending: false })
    .limit(50);

  return (data ?? []).map((r) => ({
    id: r.id as string,
    status: r.status as string,
    driverName: (r.driver_name as string | null) ?? null,
    fare: (r.fare_total as number | null) ?? (r.price_estimate as number | null) ?? null,
    from: (r.pickup_address as string | null) ?? null,
    to: (r.dropoff_address as string | null) ?? null,
    at: (r.completed_at as string | null) ?? (r.requested_at as string | null) ?? null,
  }));
}
