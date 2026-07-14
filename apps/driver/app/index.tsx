import { MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';

/**
 * شاشة البداية (Splash) — المسار الجذر "/". تُعرض أثناء قراءة الجلسة وحالة
 * السائقة، ثم يتكفّل حارس المسارات (useProtectedRoute) بتوجيه المستخدمة
 * للوجهة الصحيحة (تسجيل الدخول / رفع المستندات / قيد المراجعة / الرئيسية).
 * لوحة اللون: الأزرق الداكن (Navy) وخط IBM Plex Sans Arabic.
 */
export default function SplashScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <View className="flex-1 items-center justify-center px-5">
        <View className="items-center gap-2">
          <View className="mb-4 h-32 w-32 items-center justify-center rounded-full border-2 border-brand-100 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
            <MaterialIcons name="shield" size={64} color={driverNavy[700]} />
          </View>
          <Text className="mb-1 font-plex-bold text-[32px] text-neutral-900 dark:text-neutral-50">
            أمانة
          </Text>
          <Text className="font-plex-medium text-xl text-neutral-500 opacity-80 dark:text-neutral-400">
            Driver Professional
          </Text>
        </View>

        {/* مؤشر التحميل */}
        <View className="mt-10 items-center gap-2">
          <View className="h-[3px] w-36 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            <View className="h-full w-1/2 rounded-full bg-brand-700 dark:bg-brand-500" />
          </View>
          <Text className="font-plex-medium text-xs tracking-wide text-neutral-500 dark:text-neutral-400">
            جارٍ التحميل…
          </Text>
        </View>
      </View>

      {/* التذييل — رؤية 2030 */}
      <View className="w-full items-center gap-4 px-5 pb-8">
        <View className="flex-row items-center gap-2 opacity-60">
          <View className="h-px w-8 bg-neutral-400" />
          <Text className="font-plex-medium text-sm tracking-widest text-neutral-500 dark:text-neutral-400">
            SAUDI VISION 2030
          </Text>
          <View className="h-px w-8 bg-neutral-400" />
        </View>
      </View>
    </SafeAreaView>
  );
}
