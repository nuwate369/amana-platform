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
    db.from('drivers').select('*', head).eq('status', 'pending'),
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

export interface DriverRow {
  id: string;
  fullName: string | null;
  phone: string | null;
  status: string;
  vehicle: string;
  plate: string | null;
}

export async function listDrivers(): Promise<DriverRow[]> {
  const db = getAdminSupabase();
  const { data } = await db
    .from('drivers')
    .select('id, status, vehicle_make, vehicle_model, vehicle_plate, profiles(full_name, phone)')
    .order('status');
  return (data ?? []).map((d) => {
    const profile = d.profiles as unknown as { full_name: string | null; phone: string | null } | null;
    return {
      id: d.id,
      fullName: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
      status: d.status,
      vehicle: [d.vehicle_make, d.vehicle_model].filter(Boolean).join(' ') || '—',
      plate: d.vehicle_plate,
    };
  });
}

export interface ProfileRow {
  id: string;
  fullName: string | null;
  phone: string | null;
  createdAt: string;
}

export async function listPassengers(): Promise<ProfileRow[]> {
  return listProfilesByType('passenger');
}

async function listProfilesByType(
  userType: 'passenger' | 'driver',
): Promise<ProfileRow[]> {
  const db = getAdminSupabase();
  const { data } = await db
    .from('profiles')
    .select('id, full_name, phone, created_at')
    .eq('user_type', userType)
    .order('created_at', { ascending: false });
  return (data ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    phone: p.phone,
    createdAt: p.created_at,
  }));
}
