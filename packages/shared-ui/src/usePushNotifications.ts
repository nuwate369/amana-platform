import { useEffect, useRef } from 'react';
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
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;

  if (!granted && existing.canAskAgain) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) return null;

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
        await supabase.rpc('register_push_token', { p_token: t, p_app: app });
      } catch {
        // رفض الإذن أو تعذّر الاتصال — التطبيق يعمل بلا إشعارات فورية.
      }
    })();

    return () => {
      alive = false;
    };
  }, [enabled, app, supabase]);

  // الضغط على الإشعار — يفتح الشاشة المعنيّة.
  useEffect(() => {
    if (!onOpen) return;

    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      onOpen((res.notification.request.content.data ?? {}) as Record<string, unknown>);
    });

    // الإشعار الذي فتح التطبيق من حالة الإغلاق الكامل.
    void Notifications.getLastNotificationResponseAsync().then((res) => {
      if (res) onOpen((res.notification.request.content.data ?? {}) as Record<string, unknown>);
    });

    return () => sub.remove();
  }, [onOpen]);
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
