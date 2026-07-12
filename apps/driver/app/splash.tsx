import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';

/**
 * شاشة البداية (Splash) لتطبيق السائق — تحويل مطابق لتصميم Stitch.
 * لوحة التطبيق: الأزرق الداكن (Navy) والخط IBM Plex Sans Arabic.
 * البيانات ثابتة (mock) مطابقة للتصميم — بلا منطق أعمال.
 */
export default function SplashScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* زر اللغة أعلى اليمين */}
      <View className="absolute right-5 top-5 z-20">
        <Pressable className="h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white/60 active:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800/60">
          <MaterialIcons name="language" size={20} color={driverNavy[500]} />
        </Pressable>
      </View>

      {/* الكتلة الرئيسية */}
      <View className="flex-1 items-center justify-center px-5">
        {/* شعار العلامة */}
        <View className="items-center gap-2">
          <View className="mb-4 h-32 w-32 items-center justify-center rounded-full border-2 border-brand-100 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
            <MaterialIcons name="shield" size={64} color={driverNavy[700]} />
          </View>
          <View className="items-center">
            <Text className="mb-1 font-plex-bold text-[32px] text-neutral-900 dark:text-neutral-50">
              أمانة
            </Text>
            <Text className="font-plex-medium text-xl text-neutral-500 opacity-80 dark:text-neutral-400">
              Driver Professional
            </Text>
          </View>
        </View>

        {/* بطاقة حالة الاتصال الآمن */}
        <View className="mt-8 w-full max-w-xs">
          <View className="flex-row items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white/80 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/80">
            <View className="flex-row items-center gap-2">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-700 dark:bg-brand-600">
                <MaterialIcons name="verified-user" size={18} color="#ffffff" />
              </View>
              <View>
                <Text className="font-plex-bold text-sm text-neutral-900 dark:text-neutral-50">
                  اتصال آمن
                </Text>
                <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
                  تم التحقق من الهوية
                </Text>
              </View>
            </View>
            <View className="items-end gap-1">
              <View className="h-2 w-2 rounded-full bg-green-500" />
              <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">نشط</Text>
            </View>
          </View>
        </View>

        {/* مؤشر التحميل */}
        <View className="mt-6 items-center gap-2">
          <View className="h-[3px] w-36 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            <View className="h-full w-1/2 rounded-full bg-brand-700 dark:bg-brand-500" />
          </View>
          <Text className="font-plex-medium text-xs tracking-wide text-neutral-500 dark:text-neutral-400">
            جاري التحميل...
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
        <View className="flex-row items-center justify-center gap-4">
          <View className="h-10 w-16 items-center justify-center rounded bg-neutral-100 dark:bg-neutral-800">
            <MaterialIcons name="account-balance" size={22} color={driverNavy[400]} />
          </View>
          <Text className="font-plex-medium text-sm text-neutral-500 dark:text-neutral-400">
            Powered by Vision 2030
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
