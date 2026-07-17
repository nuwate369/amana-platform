import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';

/**
 * منطق الرحلات (جهة السائقة) — استقبال الطلبات المعلّقة لحظيًّا، قبولها (مطالبة +
 * لقطة بيانات السائقة على الرحلة)، ودورة حياة الرحلة النشطة (بدء/إنهاء) مع بثّ
 * موقع السائقة إلى صفّ الرحلة أثناءها (لتتبّع الراكبة).
 */

export interface Coord {
  latitude: number;
  longitude: number;
}

export interface DriverRide {
  id: string;
  status: string;
  passengerName: string | null;
  pickup: Coord | null;
  dropoff: Coord | null;
  priceEstimate: number | null;
}

interface DriverRidesValue {
  incoming: DriverRide[];
  active: DriverRide | null;
  busyId: string | null;
  accept: (ride: DriverRide) => Promise<void>;
  dismiss: (rideId: string) => void;
  startRide: () => Promise<void>;
  completeRide: () => Promise<void>;
}

const Ctx = createContext<DriverRidesValue | undefined>(undefined);

const coord = (lat: number | null, lng: number | null): Coord | null =>
  lat != null && lng != null ? { latitude: lat, longitude: lng } : null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRide(r: any): DriverRide {
  return {
    id: r.id,
    status: r.status,
    passengerName: r.passenger_name ?? null,
    pickup: coord(r.pickup_lat, r.pickup_lng),
    dropoff: coord(r.dropoff_lat, r.dropoff_lng),
    priceEstimate: r.price_estimate ?? null,
  };
}

const SELECT =
  'id, status, passenger_name, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, price_estimate, driver_id';

export function DriverRidesProvider({ children }: { children: ReactNode }) {
  const [incoming, setIncoming] = useState<DriverRide[]>([]);
  const [active, setActive] = useState<DriverRide | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const dismissed = useRef<Set<string>>(new Set());
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locSub = useRef<Location.LocationSubscription | null>(null);

  const uid = useCallback(async () => (await supabase.auth.getUser()).data.user?.id ?? null, []);

  const loadIncoming = useCallback(async () => {
    const { data } = await supabase
      .from('rides')
      .select(SELECT)
      .eq('status', 'requested')
      .is('driver_id', null)
      .order('requested_at', { ascending: false })
      .limit(10);
    setIncoming((data ?? []).map(toRide).filter((r) => !dismissed.current.has(r.id)));
  }, []);

  const loadActive = useCallback(async () => {
    const id = await uid();
    if (!id) {
      setActive(null);
      return;
    }
    const { data } = await supabase
      .from('rides')
      .select(SELECT)
      .eq('driver_id', id)
      .in('status', ['matched', 'in_progress'])
      .order('requested_at', { ascending: false })
      .limit(1);
    setActive(data && data.length ? toRide(data[0]) : null);
  }, [uid]);

  const refresh = useCallback(() => {
    void loadIncoming();
    void loadActive();
  }, [loadIncoming, loadActive]);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`driver-rides-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => {
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(refresh, 350);
      })
      .subscribe();
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  // أثناء رحلة نشطة: بثّ موقع السائقة إلى صفّ الرحلة (لتتبّع الراكبة).
  useEffect(() => {
    if (!active) return;
    let alive = true;
    (async () => {
      const granted = (await Location.getForegroundPermissionsAsync()).status === 'granted';
      if (!granted || !alive) return;
      locSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10_000, distanceInterval: 25 },
        (pos) => {
          void supabase
            .from('rides')
            .update({
              driver_lat: pos.coords.latitude,
              driver_lng: pos.coords.longitude,
              driver_location_at: new Date().toISOString(),
            })
            .eq('id', active.id);
        },
      );
    })();
    return () => {
      alive = false;
      locSub.current?.remove();
      locSub.current = null;
    };
  }, [active]);

  const accept = useCallback(
    async (ride: DriverRide) => {
      const id = await uid();
      if (!id || busyId) return;
      setBusyId(ride.id);
      try {
        const [{ data: prof }, { data: drv }] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('id', id).single(),
          supabase.from('drivers').select('vehicle_make, vehicle_model, vehicle_plate').eq('id', id).single(),
        ]);
        const vehicle = drv
          ? [drv.vehicle_make, drv.vehicle_model].filter(Boolean).join(' ') || null
          : null;
        // مطالبة مشروطة: فقط إن كانت لا تزال معلّقة (يتفادى التسابق بين السائقات).
        const { data, error } = await supabase
          .from('rides')
          .update({
            driver_id: id,
            status: 'matched',
            driver_name: (prof?.full_name as string | null) ?? null,
            driver_vehicle: vehicle,
            driver_plate: (drv?.vehicle_plate as string | null) ?? null,
          })
          .eq('id', ride.id)
          .eq('status', 'requested')
          .is('driver_id', null)
          .select('id');
        if (error) {
          Alert.alert('تعذّر قبول الطلب', error.message);
          return;
        }
        if (!data || data.length === 0) {
          Alert.alert('انتهى الطلب', 'قبلته سائقة أخرى أو أُلغي.');
        }
        refresh();
      } finally {
        setBusyId(null);
      }
    },
    [uid, busyId, refresh],
  );

  const dismiss = useCallback((rideId: string) => {
    dismissed.current.add(rideId);
    setIncoming((prev) => prev.filter((r) => r.id !== rideId));
  }, []);

  const setActiveStatus = useCallback(
    async (status: 'in_progress' | 'completed') => {
      if (!active || busyId) return;
      setBusyId(active.id);
      try {
        const patch: Record<string, unknown> = { status };
        if (status === 'completed') patch.completed_at = new Date().toISOString();
        await supabase.from('rides').update(patch).eq('id', active.id);
        refresh();
      } finally {
        setBusyId(null);
      }
    },
    [active, busyId, refresh],
  );

  const startRide = useCallback(() => setActiveStatus('in_progress'), [setActiveStatus]);
  const completeRide = useCallback(() => setActiveStatus('completed'), [setActiveStatus]);

  return (
    <Ctx.Provider value={{ incoming, active, busyId, accept, dismiss, startRide, completeRide }}>
      {children}
    </Ctx.Provider>
  );
}

export function useDriverRides(): DriverRidesValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDriverRides يجب أن يُستخدم داخل <DriverRidesProvider>.');
  return v;
}
