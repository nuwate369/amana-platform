import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';
import { useNotifications } from '@/lib/notifications';

/**
 * شاشة «الرئيسية (الخريطة)» — تحويل مطابق لتصميم Stitch
 * (Passenger Home Screen, مشروع Amanah Mobility Platform).
 * الألوان مطابقة للوحة الراكبة الأرجوانية والخط IBM Plex Sans Arabic.
 * منطقة الخريطة عنصر نائب (placeholder) — بلا مكتبات خرائط.
 * البيانات ثابتة (mock) مطابقة للتصميم — بلا منطق أعمال.
 */

// بطاقة وجهة سريعة في الشريط السفلي.
function QuickDestination({
  icon,
  label,
  time,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  time: string;
}) {
  return (
    <Pressable
      onPress={() => router.push('/request-ride')}
      className="min-w-[150px] flex-row items-center gap-3 rounded-xl border border-neutral-200/60 bg-white/90 p-3 active:scale-[0.99] dark:border-neutral-700 dark:bg-neutral-800/90"
    >
      <View className="rounded-lg bg-neutral-100 p-2 dark:bg-neutral-700">
        <MaterialIcons name={icon} size={20} color={passengerPurple[600]} />
      </View>
      <View>
        <Text className="font-plex-medium text-xs text-neutral-900 dark:text-neutral-100">{label}</Text>
        <Text className="font-plex text-[10px] text-neutral-500 dark:text-neutral-400">{time}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { unread } = useNotifications();
  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-14 flex-row items-center justify-between px-5">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800">
          <MaterialIcons name="menu" size={26} color={passengerPurple[700]} />
        </Pressable>
        <Text className="font-plex-bold text-2xl text-brand-700 dark:text-brand-200">Amana</Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => router.push('/notifications')}
            className="relative h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
          >
            <MaterialIcons name="notifications" size={24} color={passengerPurple[700]} />
            {unread > 0 ? (
              <View className="absolute right-1.5 top-1.5 h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1">
                <Text className="font-plex-bold text-[9px] text-white">{unread > 9 ? '9+' : unread}</Text>
              </View>
            ) : null}
          </Pressable>
          <View className="h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-neutral-300 bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-700">
            <MaterialIcons name="person" size={20} color="#9ca3af" />
          </View>
        </View>
      </View>

      {/* منطقة الخريطة (عنصر نائب) مع طبقات المحتوى فوقها */}
      <View className="relative flex-1">
        <View className="absolute inset-0 items-center justify-center bg-neutral-100 dark:bg-neutral-800">
          <MaterialIcons name="map" size={64} color="#9ca3af" />
          <Text className="mt-2 font-plex-medium text-sm text-neutral-400">الخريطة</Text>
        </View>

        {/* زر الطوارئ العائم */}
        <View className="absolute left-5 top-6 z-30 items-center">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-red-600 shadow-lg">
            <MaterialIcons name="sos" size={24} color="#ffffff" />
          </View>
          <Text className="mt-1 font-plex-bold text-[10px] text-red-600">SOS</Text>
        </View>

        {/* رمز سيارة متحرّك (زخرفي) */}
        <View className="absolute right-[30%] top-[38%] z-10">
          <MaterialIcons name="directions-car" size={28} color={passengerPurple[300]} />
        </View>

        {/* طبقة المحتوى السفلية */}
        <View className="absolute bottom-4 left-0 right-0 z-20 gap-4 px-5">
          {/* شريط البحث */}
          <Pressable
            onPress={() => router.push('/request-ride')}
            className="flex-row items-center gap-3 rounded-xl border border-neutral-200/60 bg-white/95 p-3 shadow-lg active:scale-[0.99] dark:border-neutral-700 dark:bg-neutral-800/95"
          >
            <MaterialIcons name="search" size={22} color={passengerPurple[600]} />
            <Text className="flex-1 font-plex-medium text-lg text-neutral-400">إلى أين؟</Text>
            <View className="h-6 w-px bg-neutral-300 dark:bg-neutral-600" />
            <View className="flex-row items-center gap-1">
              <MaterialIcons name="schedule" size={18} color={passengerPurple[700]} />
              <Text className="font-plex-medium text-xs text-brand-700 dark:text-brand-200">الآن</Text>
            </View>
          </Pressable>

          {/* بطاقة المخطط الذكي */}
          <View className="overflow-hidden rounded-xl border border-brand-100/40 bg-white/95 p-5 shadow-lg dark:border-neutral-700 dark:bg-neutral-800/95">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pl-3">
                <View className="mb-2 flex-row items-center gap-2">
                  <MaterialIcons name="auto-awesome" size={18} color={passengerPurple[600]} />
                  <Text className="font-plex-medium text-xs uppercase tracking-widest text-brand-700 dark:text-brand-200">
                    المخطط الذكي
                  </Text>
                </View>
                <Text className="mb-1 font-plex-semibold text-xl text-neutral-900 dark:text-neutral-50">
                  نقترح رحلة هادئة إلى مكتبك؟
                </Text>
                <Text className="font-plex text-sm text-neutral-500 dark:text-neutral-400">
                  يستغرق الوصول ١٨ دقيقة في هذا الوقت.
                </Text>
              </View>
              <View className="rounded-full bg-brand-50 p-3 dark:bg-brand-900/40">
                <MaterialIcons name="work" size={22} color={passengerPurple[600]} />
              </View>
            </View>
            <View className="mt-4 flex-row justify-end">
              <Pressable
                onPress={() => router.push('/ai-planner')}
                className="flex-row items-center gap-2 rounded-full bg-brand-600 px-6 py-2 shadow-md active:scale-[0.98]"
              >
                <Text className="font-plex-medium text-xs text-white">احجز الآن</Text>
                <MaterialIcons name="arrow-back" size={16} color="#ffffff" />
              </Pressable>
            </View>
          </View>

          {/* وجهات سريعة */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
          >
            <QuickDestination icon="home" label="المنزل" time="١٢ دقيقة" />
            <QuickDestination icon="favorite" label="النادي الرياضي" time="٢٥ دقيقة" />
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}
