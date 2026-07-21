import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/** حالة اعتماد السائقة كما في enum `driver_status` بقاعدة البيانات. */
export type DriverStatus = 'pending' | 'approved' | 'rejected';

/** صف السائقة من جدول `public.drivers` (الحقول التي يهمّنا قراءتها). */
export interface DriverRecord {
  id: string;
  status: DriverStatus;
  national_id_url: string | null;
  license_url: string | null;
  vehicle_registration_url: string | null;
  car_photo_url: string | null;
  // الحقول النصية — تُستخدم لإعادة تعبئة النموذج بعد رفض سابق.
  national_id_number: string | null;
  vehicle_class: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_plate: string | null;
  vehicle_registration_number: string | null;
  // سبب الرفض (يظهر للسائقة عند status='rejected').
  rejection_reason: string | null;
  // وقت إرسال الطلب للتدقيق. NULL = مسودّة لم تُرسَل بعد (تُكمِل بياناتها).
  kyc_submitted_at: string | null;
}

/** هل رُفعت المستندات الثلاثة كلها؟ */
export function docsComplete(driver: DriverRecord | null): boolean {
  return Boolean(
    driver?.national_id_url && driver?.license_url && driver?.vehicle_registration_url,
  );
}

/** هل أرسلت السائقة طلبها للتدقيق فعلاً؟ (مصدر الحقيقة لطابور المراجعة). */
export function isSubmitted(driver: DriverRecord | null): boolean {
  return Boolean(driver?.kyc_submitted_at);
}

/** قيمة سياق المصادقة المشتركة عبر شاشات تطبيق السائقة. */
interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** صف السائقة الحالي (null إن لم يُجلب بعد أو لا جلسة). */
  driver: DriverRecord | null;
  /** يُحمّل أثناء قراءة الجلسة أو صف السائقة لأول مرة. */
  isLoading: boolean;
  /** يعيد جلب صف السائقة من القاعدة (بعد رفع مستندات مثلًا) ويُعيد أحدث صف. */
  refreshDriver: () => Promise<DriverRecord | null>;
  /** تسجيل الخروج. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DRIVER_COLUMNS =
  'id, status, national_id_url, license_url, vehicle_registration_url, car_photo_url, ' +
  'national_id_number, vehicle_class, vehicle_make, vehicle_model, vehicle_year, vehicle_plate, vehicle_registration_number, ' +
  'rejection_reason, kyc_submitted_at';

/**
 * مزوّد المصادقة: يقرأ الجلسة الحالية عند التركيب ثم يستمع لتغيّرات الحالة،
 * ويجلب صف السائقة المرتبط (الحالة + روابط المستندات) لتقرّره بوابة التوجيه.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [driver, setDriver] = useState<DriverRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useRef(true);

  /** يجلب صف السائقة لمعرّف مستخدم معيّن. */
  const fetchDriver = useCallback(async (userId: string): Promise<DriverRecord | null> => {
    try {
      // مهلة صريحة: طلب الشبكة قد لا يستقرّ أبدًا على اتصال ضعيف، وبقاؤه
      // معلّقًا يُبقي `isLoading` مرفوعًا فتتجمّد شاشة البدء بلا مخرج.
      const query = supabase
        .from('drivers')
        .select(DRIVER_COLUMNS)
        .eq('id', userId)
        .maybeSingle();

      const result = await Promise.race([
        query,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 12_000),
        ),
      ]);

      const { data, error } = result as { data: unknown; error: { message: string } | null };
      if (error) {
        // لا نُسقط التطبيق: نُعيد null فتوجّه البوابة للسائقة إلى شاشة رفع المستندات.
        console.warn('[driver] تعذّر جلب صف السائقة:', error.message);
        return null;
      }
      return (data as DriverRecord | null) ?? null;
    } catch (e) {
      console.warn('[driver] تعذّر جلب صف السائقة:', e);
      return null;
    }
  }, []);

  /** يعيد جلب صف السائقة الحالية (يُستدعى بعد الرفع/الإرسال). */
  const refreshDriver = useCallback(async () => {
    const uid = session?.user?.id;
    if (!uid) {
      setDriver(null);
      return null;
    }
    const next = await fetchDriver(uid);
    if (mounted.current) setDriver(next);
    return next;
  }, [session?.user?.id, fetchDriver]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    if (mounted.current) setDriver(null);
  }, []);

  // 1) قراءة الجلسة الأولى + الاشتراك في تغيّراتها.
  useEffect(() => {
    mounted.current = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted.current) return;
      setSession(data.session);
      if (!data.session) setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted.current) return;
      setSession(nextSession);
      if (!nextSession) {
        setDriver(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  // 2) عند توفّر جلسة نجلب صف السائقة المرتبط بها.
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    let active = true;
    setIsLoading(true);
    // `finally` لا `then` وحدها: أيّ رفض كان يترك `isLoading` مرفوعًا للأبد،
    // فيعود حارس المسارات مبكّرًا ولا يغادر المستخدم شاشة البدء إطلاقًا.
    fetchDriver(uid)
      .then((rec) => {
        if (!active || !mounted.current) return;
        setDriver(rec);
      })
      .finally(() => {
        if (active && mounted.current) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session?.user?.id, fetchDriver]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        driver,
        isLoading,
        refreshDriver,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** خطّاف المصادقة — يرمي خطأً إن استُخدم خارج AuthProvider. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth يجب أن يُستخدم داخل <AuthProvider>.');
  }
  return ctx;
}
