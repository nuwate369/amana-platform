import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/toast';

/**
 * شاشة «طلبك قيد المراجعة» — تُعرض للسائقة بعد رفع مستنداتها وإرسالها،
 * وقبل اعتمادها من الإدارة. تقرأ الحالة الفعلية من صف السائقة، وزر «تحديث
 * الحالة» يعيد الجلب فتنقلها البوابة تلقائيًا للرئيسية بمجرد اعتمادها.
 */
export default function PendingScreen() {
  const { refreshDriver, signOut } = useAuth();
  const [checking, setChecking] = useState(false);

  async function onRefresh() {
    setChecking(true);
    const rec = await refreshDriver();
    setChecking(false);
    // إن بقيت pending نُخبر السائقة؛ أما إن اعتُمدت فتنقلها البوابة تلقائيًا للرئيسية.
    if (rec?.status === 'pending') {
      notify.warning('لا يزال طلبك قيد المراجعة. سنعلمك فور اعتماده.');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-16 flex-row items-center justify-between border-b border-neutral-200 px-5 dark:border-neutral-800">
        <Pressable
          onPress={signOut}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <MaterialIcons name="logout" size={22} color={driverNavy[500]} />
        </Pressable>
        <Text className="font-plex-bold text-2xl text-neutral-900 dark:text-neutral-50">أمانة</Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 24, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {/* الرسم التوضيحي */}
        <View className="mb-8 mt-4 h-44 w-44 items-center justify-center">
          <View className="absolute h-44 w-44 rounded-full border-4 border-dashed border-brand-200 dark:border-brand-700" />
          <View className="h-36 w-36 items-center justify-center rounded-full bg-white shadow-xl dark:bg-neutral-800">
            <View className="h-28 w-28 items-center justify-center rounded-full bg-brand-800">
              <MaterialIcons name="shield" size={64} color={driverNavy[100]} />
            </View>
            <View className="absolute -bottom-1 -right-1 items-center justify-center rounded-full border-4 border-white bg-brand-600 p-2.5 dark:border-neutral-900">
              <MaterialIcons name="hourglass-top" size={22} color="#ffffff" />
            </View>
          </View>
        </View>

        {/* النص */}
        <View className="mb-8 max-w-md items-center gap-4 px-2">
          <Text className="text-center font-plex-bold text-3xl text-brand-700 dark:text-brand-100">
            طلبك قيد المراجعة
          </Text>
          <Text className="text-center font-plex text-base leading-7 text-neutral-500 dark:text-neutral-400">
            شكرًا لانضمامك إلى{' '}
            <Text className="font-plex-bold text-brand-700 dark:text-brand-200">أمانة</Text>. نتحقق
            حاليًا من بياناتك ومستنداتك لضمان أعلى معايير الأمان والاحترافية.
          </Text>
        </View>

        {/* بطاقات الخطوات */}
        <View className="w-full gap-4">
          <View className="flex-row items-center gap-3 overflow-hidden rounded-[24px] bg-white p-5 shadow-sm dark:bg-neutral-800">
            <View className="w-1.5 self-stretch rounded-full bg-brand-600" />
            <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-neutral-700">
              <MaterialIcons name="assignment-turned-in" size={22} color={driverNavy[700]} />
            </View>
            <View className="flex-1">
              <Text className="font-plex-semibold text-base text-brand-700 dark:text-brand-200">
                اكتمال البيانات
              </Text>
              <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
                تم استلام جميع المستندات المطلوبة بنجاح
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-4 overflow-hidden rounded-[24px] bg-brand-800 p-5 shadow-md">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <MaterialIcons name="manage-search" size={22} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="font-plex-semibold text-base text-white">التدقيق الإداري</Text>
              <Text className="font-plex text-xs text-white/70">
                المراجعة جارية من قبل الإدارة المختصة
              </Text>
            </View>
          </View>
        </View>

        {/* منطقة الإجراء */}
        <View className="mt-10 w-full max-w-xs gap-3">
          <Pressable
            onPress={onRefresh}
            disabled={checking}
            className="h-14 flex-row items-center justify-center gap-2 rounded-[20px] bg-brand-700 px-8 shadow-sm active:scale-[0.98] dark:bg-brand-600"
          >
            {checking ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <MaterialIcons name="refresh" size={22} color="#ffffff" />
                <Text className="font-plex-semibold text-lg text-white">تحديث الحالة</Text>
              </>
            )}
          </Pressable>
          <Text className="px-4 text-center font-plex text-xs leading-5 text-neutral-500 dark:text-neutral-400">
            عادةً ما تستغرق المراجعة من 24 إلى 48 ساعة عمل.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
