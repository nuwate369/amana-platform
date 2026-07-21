import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePushStatus } from '@amana/shared-ui/usePushNotifications';
import { passengerPurple } from '@amana/shared-ui/tokens';
import {
  listNotifications,
  markAllSeen,
  markRead,
  useNotifications,
  type AppNotification,
} from '@/lib/notifications';

/** شاشة التنبيهات — تنبيهات الراكبة الحقيقية (تحديثات الرحلة، ردود الدعم مستقبلًا). */

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'الآن';
  const m = Math.floor(s / 60);
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24);
  return `منذ ${d} يوم`;
}

function iconFor(type: string): keyof typeof MaterialIcons.glyphMap {
  if (type === 'ticket_reply') return 'support-agent';
  if (type.startsWith('ticket')) return 'confirmation-number';
  if (type.includes('ride')) return 'local-taxi';
  return 'notifications';
}

export default function NotificationsScreen() {
  const pushStatus = usePushStatus();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const { refresh, unread } = useNotifications();

  const load = useCallback(async () => {
    setItems(await listNotifications());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, unread]);

  // فتح الشاشة = اطّلاع: نعلّم الكلّ مقروءًا ونصفّر عدّاد الجرس (مرّة واحدة).
  useEffect(() => {
    markAllSeen().then(refresh);
  }, [refresh]);

  async function onTap(n: AppNotification) {
    if (!n.isRead) {
      await markRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      refresh();
    }
  }

  async function onMarkAll() {
    await markAllSeen();
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    refresh();
  }

  const hasUnread = items.some((n) => !n.isRead);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      <View className="h-14 flex-row items-center justify-between px-5">
        <View className="w-10" />
        <Text className="font-plex-bold text-xl text-brand-700 dark:text-brand-200">التنبيهات</Text>
        {hasUnread ? (
          <Pressable onPress={onMarkAll} className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800">
            <MaterialIcons name="done-all" size={22} color={passengerPurple[700]} />
          </Pressable>
        ) : (
          <View className="w-10" />
        )}
      </View>


      {/* سبب صمت الإشعارات — بدل أن يبقى المستخدم يظنّ أنّ لا أحد راسله */}
      {pushStatus.status !== 'registered' && pushStatus.status !== 'idle' && (
        <View className="mx-4 mb-3 flex-row items-start gap-3 rounded-xl bg-amber-50 p-3 dark:bg-amber-900/20">
          <MaterialIcons name="notifications-off" size={20} color="#B45309" />
          <View className="flex-1">
            <Text className="font-plex-semibold text-sm text-amber-800 dark:text-amber-200">
              الإشعارات الفورية غير مفعّلة
            </Text>
            <Text className="mt-0.5 font-plex text-xs leading-5 text-amber-700 dark:text-amber-300">
              {pushStatus.status === 'denied'
                ? 'أذني للتطبيق بالإشعارات من إعدادات الجهاز كي تصلك الرسائل وتحديثات الرحلة.'
                : pushStatus.status === 'unsupported'
                  ? 'الإشعارات الفورية لا تعمل على المحاكي — جرّبيها على جهاز حقيقي.'
                  : 'تعذّر تسجيل الجهاز. ستصلك الإشعارات داخل التطبيق فقط.'}
            </Text>
          </View>
        </View>
      )}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={passengerPurple[600]} />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <MaterialIcons name="notifications-none" size={56} color={passengerPurple[300]} />
          <Text className="text-center font-plex-medium text-base text-neutral-500 dark:text-neutral-400">
            لا توجد تنبيهات بعد
          </Text>
        </View>
      ) : (

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 10 }}>
          {items.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => onTap(n)}
              className={`flex-row gap-3 rounded-2xl border p-4 active:scale-[0.99] ${
                n.isRead
                  ? 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800'
                  : 'border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/30'
              }`}
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50">
                <MaterialIcons name={iconFor(n.type)} size={20} color={passengerPurple[600]} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-start justify-between gap-2">
                  <Text
                    className={`flex-1 font-plex-semibold text-sm leading-6 ${
                      n.isRead ? 'text-neutral-700 dark:text-neutral-200' : 'text-neutral-900 dark:text-neutral-50'
                    }`}
                  >
                    {n.titleAr}
                  </Text>
                  {!n.isRead ? <View className="mt-1.5 h-2 w-2 rounded-full bg-brand-600" /> : null}
                </View>
                {n.bodyAr ? (
                  <Text className="mt-0.5 font-plex text-xs leading-5 text-neutral-500 dark:text-neutral-400" numberOfLines={2}>
                    {n.bodyAr}
                  </Text>
                ) : null}
                <Text className="mt-1 font-plex text-[11px] text-neutral-400">{timeAgo(n.createdAt)}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
