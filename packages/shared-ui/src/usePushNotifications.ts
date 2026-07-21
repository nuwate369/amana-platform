import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * تسجيل الجهاز لاستقبال الإشعارات الفورية، والتصرّف عند وصولها.
 *
 * الإشعار الفوري هو الفرق بين «تعرف أنّ سائقتك وصلت» و«تكتشف ذلك حين تفتح
 * التطبيق». مسار الوصول: الجهاز يطلب رمزًا من Expo ⇒ يُسجَّل في قاعدة
 * البيانات ⇒ مُشغّل قاعدة البيانات يُرسل إليه عند كل إشعار جديد.
 *
 * الأذونات: لا نطلب الإذن عند أوّل فتح للتطبيق — بل بعد تسجيل الدخول، حين
 * يكون للإشعار معنى مفهوم للمستخدمة. الرفض ليس عطلًا: التطبيق يعمل كاملًا
 * وتبقى الإشعارات داخله في الجرس.
 */

// السلوك حين يصل الإشعار والتطبيق مفتوح: نعرضه فوق الشاشة كما لو كان قادمًا
// من النظام — فلا تفوت الراكبة تنبيه وصول سائقتها لأنّها كانت داخل التطبيق.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface PushOptions {
  supabase: SupabaseClient;
  app: 'passenger' | 'driver';
  /** مُفعَّل فقط بعد تسجيل الدخول. */
  enabled: boolean;
  /** يُستدعى عند ضغط المستخدمة على الإشعار. */
  onOpen?: (data: Record<string, unknown>) => void;
}

/** مُعرّف مشروع EAS — تحتاجه Expo لإصدار رمز الجهاز. */
function projectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

async function requestToken(): Promise<string | null> {
  // المحاكي لا يملك جهازًا حقيقيًّا يستقبل الإشعارات.
  if (!Device.isDevice) {
    setPushStatus('unsupported');
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;

  if (!granted && existing.canAskAgain) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) {
    setPushStatus('denied');
    return null;
  }

  if (Platform.OS === 'android') {
    // أندرويد يحتاج قناة معرَّفة، وإلّا وصل الإشعار صامتًا بلا اهتزاز.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'تنبيهات أمانة',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  const id = projectId();
  const { data } = await Notifications.getExpoPushTokenAsync(id ? { projectId: id } : undefined);
  return data ?? null;
}

/**
 * حالة تسجيل الجهاز للإشعارات الفورية.
 *
 * لماذا حالة معلنة لا `catch {}` صامت؟ لأنّ الفشل هنا غير مرئي تمامًا: لا
 * إشعارات تصل، ولا رسالة خطأ، ولا سجلّ. كنّا نخمّن السبب بدل أن نقرأه.
 * `denied` إذن مرفوض · `unsupported` محاكٍ · `failed` تعذّر إصدار الرمز
 * (غالبًا إعداد FCM أو مُعرّف المشروع) · `registered` يعمل.
 */
export type PushStatus = 'idle' | 'registered' | 'denied' | 'unsupported' | 'failed';

let pushStatus: PushStatus = 'idle';
let pushError: string | null = null;
const listeners = new Set<() => void>();

function setPushStatus(status: PushStatus, error: string | null = null): void {
  pushStatus = status;
  pushError = error;
  listeners.forEach((l) => l());
}

/** يُقرأ في شاشة الإشعارات لعرض سبب عدم وصول الإشعارات بدل الصمت. */
export function usePushStatus(): { status: PushStatus; error: string | null } {
  const status = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => pushStatus,
    () => pushStatus,
  );
  return { status, error: pushError };
}

export function usePushNotifications({ supabase, app, enabled, onOpen }: PushOptions): void {
  const token = useRef<string | null>(null);

  // التسجيل — يعمل مرّة عند توفّر جلسة.
  useEffect(() => {
    if (!enabled) return;
    let alive = true;

    (async () => {
      try {
        const t = await requestToken();
        if (!alive || !t) return;
        token.current = t;
        const { error } = await supabase.rpc('register_push_token', { p_token: t, p_app: app });
        if (error) {
          setPushStatus('failed', error.message);
          return;
        }
        setPushStatus('registered');
      } catch (error) {
        // الفشل هنا لا يُعطّل التطبيق، لكنّه يُسجَّل: بدونه تختفي الإشعارات
        // بلا أثر ولا نعرف أهو الإذن أم إعداد FCM أم انقطاع الشبكة.
        setPushStatus('failed', error instanceof Error ? error.message : String(error));
      }
    })();

    return () => {
      alive = false;
    };
  }, [enabled, app, supabase]);

  // مرجع للمعالِج بدل الاعتماد عليه في مصفوفة الاعتماديات: `onOpen` يُمرَّر
  // كدالّة سهمية داخل الشاشة، فتتغيّر هويّتها مع كل إعادة رسم. ربطُ الأثر بها
  // كان يُعيد تشغيله في كل رسم، فيُقرأ آخر إشعار مضغوط ويُفتح مجددًا —
  // فيعلق التطبيق على شاشة الإشعارات ولا يعمل زرّ الرجوع.
  const openRef = useRef(onOpen);
  openRef.current = onOpen;

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      openRef.current?.((res.notification.request.content.data ?? {}) as Record<string, unknown>);
    });

    // الإشعار الذي فتح التطبيق من حالة الإغلاق الكامل. يُعالَج مرّة واحدة فقط،
    // وبشرط أن يكون حديثًا: هذه الواجهة تحتفظ بآخر استجابة إلى ما لا نهاية،
    // فبدون شرط الحداثة يخطف إشعارٌ من الأمس كلَّ إقلاع للتطبيق.
    let handled = false;
    void Notifications.getLastNotificationResponseAsync().then((res) => {
      if (!res || handled) return;
      handled = true;
      const age = Date.now() - (res.notification.date ?? 0);
      if (age > 60_000) return;
      openRef.current?.((res.notification.request.content.data ?? {}) as Record<string, unknown>);
    });

    return () => sub.remove();
  }, []);
}

/** يُستدعى قبل تسجيل الخروج كي لا تصل إشعارات المستخدمة السابقة للجهاز. */
export async function unregisterPushToken(supabase: SupabaseClient): Promise<void> {
  try {
    if (!Device.isDevice) return;
    const id = projectId();
    const { data } = await Notifications.getExpoPushTokenAsync(id ? { projectId: id } : undefined);
    if (data) await supabase.rpc('unregister_push_token', { p_token: data });
  } catch {
    // لا يمنع تسجيل الخروج.
  }
}
