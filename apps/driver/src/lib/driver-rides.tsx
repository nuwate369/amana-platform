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
  passengerId: string | null;
  passengerName: string | null;
  pickup: Coord | null;
  dropoff: Coord | null;
  priceEstimate: number | null;
  /** الفئة التي طلبتها الراكبة (standard | premium | group) — للعرض فقط. */
  requestedClass: string | null;
  /** وقت وصول السائقة لنقطة الالتقاط (null ⇒ لم تصل بعد). */
  arrivedAt: string | null;
}

/**
 * أسباب اعتذار السائقة — محصورة لا نصّ حرّ.
 *
 * النصّ الحرّ لا يُحصى ولا يُحاسَب عليه. القائمة تطابق
 * `driver_cancel_reasons()` في قاعدة البيانات؛ أيّ سبب خارجها يُرفض هناك.
 */
export const DRIVER_CANCEL_REASONS = [
  { code: 'vehicle_issue', label: 'عطل في المركبة' },
  { code: 'emergency', label: 'ظرف طارئ' },
  { code: 'passenger_no_show', label: 'الراكبة لم تحضر' },
  { code: 'unsafe_situation', label: 'دواعي سلامة' },
  { code: 'wrong_location', label: 'تعذّر الوصول لنقطة الالتقاء' },
] as const;

export type DriverCancelReason = (typeof DRIVER_CANCEL_REASONS)[number]['code'];

interface DriverRidesValue {
  incoming: DriverRide[];
  active: DriverRide | null;
  busyId: string | null;
  accept: (ride: DriverRide) => Promise<void>;
  dismiss: (rideId: string) => void;
  markArrived: () => Promise<void>;
  /** اعتذار السائقة عن رحلة قبلتها — بسبب مُصرَّح لا غير. */
  cancelActive: (reasonCode: DriverCancelReason) => Promise<{ ok: boolean; error?: string }>;
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
    passengerId: r.passenger_id ?? null,
    passengerName: r.passenger_name ?? null,
    pickup: coord(r.pickup_lat, r.pickup_lng),
    dropoff: coord(r.dropoff_lat, r.dropoff_lng),
    priceEstimate: r.price_estimate ?? null,
    requestedClass: r.requested_class ?? null,
    arrivedAt: r.driver_arrived_at ?? null,
  };
}

const SELECT =
  'id, status, passenger_id, passenger_name, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, price_estimate, requested_class, driver_id, driver_arrived_at';

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
      .in('status', ['matched', 'arrived', 'in_progress'])
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

  // السائقة وصلت لنقطة الالتقاط.
  //
  // الوصول حالة صريحة (`arrived`) لا طابعًا زمنيًّا صامتًا: الراكبة تحتاج أن
  // تعرف أنّ سائقتها بالأسفل، وإشعارات تغيّر الحالة مبنيّة على عمود `status`
  // — فتسجيل الوصول في عمود جانبي كان يعني ألّا يصلها شيء إطلاقًا.
  const markArrived = useCallback(async () => {
    if (!active || busyId) return;
    setBusyId(active.id);
    try {
      await supabase
        .from('rides')
        .update({ status: 'arrived', driver_arrived_at: new Date().toISOString() })
        .eq('id', active.id);
      refresh();
    } finally {
      setBusyId(null);
    }
  }, [active, busyId, refresh]);

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

  /**
   * الاعتذار عن رحلة مقبولة.
   *
   * يمرّ عبر دالّة في قاعدة البيانات لا بتحديث مباشر: انسحاب السائقة يترك
   * الراكبة في الشارع، فلا يكون بلا سبب مُصرَّح ولا بلا أثر على معدّل السائقة.
   */
  const cancelActive = useCallback(
    async (reasonCode: DriverCancelReason) => {
      if (!active || busyId) return { ok: false, error: 'busy' };
      setBusyId(active.id);
      try {
        const { error } = await supabase.rpc('cancel_ride_by_driver', {
          p_ride_id: active.id,
          p_reason_code: reasonCode,
        });
        if (error) return { ok: false, error: error.message };
        setActive(null);
        return { ok: true };
      } finally {
        setBusyId(null);
        refresh();
      }
    },
    [active, busyId, refresh],
  );

  const startRide = useCallback(() => setActiveStatus('in_progress'), [setActiveStatus]);
  const completeRide = useCallback(() => setActiveStatus('completed'), [setActiveStatus]);

  return (
    <Ctx.Provider value={{ incoming, active, busyId, accept, dismiss, markArrived, cancelActive, startRide, completeRide }}>
      {children}
    </Ctx.Provider>
  );
}

export function useDriverRides(): DriverRidesValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDriverRides يجب أن يُستخدم داخل <DriverRidesProvider>.');
  return v;
}

/**
 * تقييم السائقة للراكبة بعد إنهاء الرحلة (الاتجاه المعاكس للتقييم).
 * يكتب صفًّا في جدول `ratings` المتماثل: rater=السائقة، ratee=الراكبة.
 * سياسة RLS تسمح بالإدراج ما دام rater_id = المستخدم الحالي.
 */
export async function ratePassenger(
  rideId: string,
  passengerId: string,
  stars: number,
  comment: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, error: 'يجب تسجيل الدخول.' };
  const { error } = await supabase.from('ratings').insert({
    ride_id: rideId,
    rater_id: u.user.id,
    ratee_id: passengerId,
    stars,
    comment: comment.trim() || null,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}
