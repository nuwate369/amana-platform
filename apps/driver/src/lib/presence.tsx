import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';

/**
 * حضور السائقة وتتبّع النشاط — يكتب حالة السائقة الآنية في جدول `presence`
 * ويسجّل أحداث الانتقال في `presence_events` (لحساب مدد الفتح/الاتصال في اللوحة).
 *
 * الحالات: offline (مغلق) · foreground (مفتوح غير متاحة) · online (متصلة/متاحة).
 * أثناء الاتصال يُبثّ الموقع (expo-location) ونبضة كل 10 ثوانٍ؛ عند دخول الخلفية
 * يتوقّف البثّ فتظهر «غير متصلة» في اللوحة بعد مهلة الانقطاع.
 *
 * الخصوصية: الموقع يُكتب بصلاحية السائقة نفسها (RLS)؛ لا يقرؤه إلا الموظفون.
 */

const HEARTBEAT_MS = 10_000;

type PresencePatch = Partial<{
  status: 'offline' | 'foreground' | 'online';
  available: boolean;
  lat: number;
  lng: number;
  location_at: string;
  app_opened_at: string;
  online_since: string;
}>;

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function upsertPresence(patch: PresencePatch): Promise<void> {
  const id = await currentUserId();
  if (!id) return;
  await supabase
    .from('presence')
    .upsert(
      { user_id: id, role: 'driver', last_seen_at: new Date().toISOString(), ...patch },
      { onConflict: 'user_id' },
    );
}

async function logEvent(event: string): Promise<void> {
  const id = await currentUserId();
  if (!id) return;
  await supabase.from('presence_events').insert({ user_id: id, event });
}

interface PresenceValue {
  online: boolean;
  busy: boolean;
  setOnline: (v: boolean) => Promise<void>;
}

const PresenceContext = createContext<PresenceValue | undefined>(undefined);

export function PresenceProvider({ children }: { children: ReactNode }) {
  const [online, setOnlineState] = useState(false);
  const [busy, setBusy] = useState(false);
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const locSub = useRef<Location.LocationSubscription | null>(null);
  const onlineRef = useRef(false);

  const startHeartbeat = () => {
    if (heartbeat.current) return;
    heartbeat.current = setInterval(() => {
      void upsertPresence({});
    }, HEARTBEAT_MS);
  };
  const stopHeartbeat = () => {
    if (heartbeat.current) {
      clearInterval(heartbeat.current);
      heartbeat.current = null;
    }
  };
  const stopLocation = () => {
    if (locSub.current) {
      locSub.current.remove();
      locSub.current = null;
    }
  };
  const startLocation = async () => {
    if (locSub.current) return;
    let granted = (await Location.getForegroundPermissionsAsync()).status === 'granted';
    if (!granted) {
      granted = (await Location.requestForegroundPermissionsAsync()).status === 'granted';
    }
    if (!granted || locSub.current) return;
    locSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: HEARTBEAT_MS, distanceInterval: 20 },
      (pos) => {
        void upsertPresence({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          location_at: new Date().toISOString(),
        });
      },
    );
  };

  const setOnline = async (v: boolean) => {
    setBusy(true);
    try {
      if (v) {
        onlineRef.current = true;
        setOnlineState(true);
        await upsertPresence({
          status: 'online',
          available: true,
          online_since: new Date().toISOString(),
        });
        await logEvent('go_online');
        await startLocation();
      } else {
        onlineRef.current = false;
        setOnlineState(false);
        stopLocation();
        await upsertPresence({ status: 'foreground', available: false });
        await logEvent('go_offline');
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await upsertPresence({
        status: 'foreground',
        available: false,
        app_opened_at: new Date().toISOString(),
      });
      await logEvent('app_open');
      startHeartbeat();
    })();

    const onAppState = (s: AppStateStatus) => {
      if (s === 'active') {
        startHeartbeat();
        void upsertPresence({ status: onlineRef.current ? 'online' : 'foreground' });
        if (onlineRef.current) void startLocation();
      } else {
        stopHeartbeat();
        stopLocation();
      }
    };
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      sub.remove();
      stopHeartbeat();
      stopLocation();
      void (async () => {
        await upsertPresence({ status: 'offline', available: false });
        await logEvent('app_close');
      })();
    };
  }, []);

  return (
    <PresenceContext.Provider value={{ online, busy, setOnline }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence(): PresenceValue {
  const v = useContext(PresenceContext);
  if (!v) throw new Error('usePresence يجب أن يُستخدم داخل <PresenceProvider>.');
  return v;
}
