import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * الرحلة الجارية للراكبة — على مستوى التطبيق لا على مستوى شاشة.
 *
 * كانت متابعة الرحلة محصورة في شاشتَي «المطابقة» و«التتبّع»: تخرج الراكبة منهما
 * فلا تعلم شيئًا — لا أنّ سائقة قبلت، ولا أنّها وصلت، بل وتستطيع طلب رحلة ثانية
 * فوق الأولى. هذا المزوّد يبقي الحالة حاضرة في كل شاشة، ويغذّي شريط «رحلة جارية»
 * في الرئيسية.
 */

export type ActiveStatus = 'requested' | 'matched' | 'arrived' | 'in_progress' | 'completed';

export interface ActiveRide {
  id: string;
  status: ActiveStatus;
  driverName: string | null;
  driverId: string | null;
  priceEstimate: number | null;
  fareTotal: number | null;
  arrivedAt: string | null;
  requestedAt: string;
  /** رحلة انتهت ولم تُدفع — عمل معلّق لا رحلة منتهية. */
  needsPayment: boolean;
}

interface Value {
  ride: ActiveRide | null;
  loading: boolean;
  refresh: () => void;
}

const Ctx = createContext<Value | undefined>(undefined);

/** نصّ حالة الرحلة كما تقرؤه الراكبة. */
export function activeStatusLabel(r: ActiveRide): string {
  switch (r.status) {
    case 'requested':
      return 'جارٍ البحث عن سائقة…';
    case 'matched':
      return `${r.driverName ?? 'سائقتك'} في طريقها إليك`;
    case 'arrived':
      return `${r.driverName ?? 'سائقتك'} بانتظارك في نقطة الالتقاء`;
    case 'in_progress':
      return 'رحلتك جارية';
    case 'completed':
      return 'انتهت رحلتك — بقي تأكيد الدفع';
  }
}

export function ActiveRideProvider({ children }: { children: ReactNode }) {
  const [ride, setRide] = useState<ActiveRide | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('my_active_ride');
    if (error) {
      setLoading(false);
      return;
    }
    const row = (Array.isArray(data) ? data[0] : data) as
      | {
          id: string;
          status: ActiveStatus;
          driver_name: string | null;
          driver_id: string | null;
          price_estimate: number | null;
          fare_total: number | null;
          arrived_at: string | null;
          requested_at: string;
          paid_at: string | null;
          needs_payment: boolean;
        }
      | undefined;

    setRide(
      row
        ? {
            id: row.id,
            status: row.status,
            driverName: row.driver_name,
            driverId: row.driver_id,
            priceEstimate: row.price_estimate,
            fareTotal: row.fare_total,
            arrivedAt: row.arrived_at,
            requestedAt: row.requested_at,
            needsPayment: Boolean(row.needs_payment),
          }
        : null,
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();

    // اشتراك واحد على مستوى التطبيق — يعمل مهما كانت الشاشة المعروضة.
    const channel = supabase
      .channel(`active-ride-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => {
        void load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return <Ctx.Provider value={{ ride, loading, refresh: load }}>{children}</Ctx.Provider>;
}

export function useActiveRide(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error('useActiveRide يجب أن يُستخدم داخل <ActiveRideProvider>.');
  return v;
}
