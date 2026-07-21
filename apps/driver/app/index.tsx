import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';
import { useBottomInset } from '@amana/shared-ui/layout';

/**
 * شاشة البداية (Splash) — المسار الجذر "/". تُعرض أثناء قراءة الجلسة وحالة
 * السائقة، ثم يتكفّل حارس المسارات (useProtectedRoute) بتوجيه المستخدمة
 * للوجهة الصحيحة (تسجيل الدخول / رفع المستندات / قيد المراجعة / الرئيسية).
 * لوحة اللون: الأزرق الداكن (Navy) وخط IBM Plex Sans Arabic.
 */
export default function SplashScreen() {
  // نفس نمط بقيّة الشاشات: نترك الحافة السفلية للنظام ونضيفها على التذييل
  // وحده. الاعتماد على `SafeAreaView` بكل حوافّه لا يكفي مع الرسم من حافة
  // إلى حافة (edge-to-edge)، فيقع النصّ تحت شريط تنقّل النظام.
  const bottomInset = useBottomInset(24);

  // شبكة أمان: إن لم يوجّهنا حارس المسارات خلال 15 ثانية فشيء ما تعطّل —
  // شبكة لا تستجيب أو جلسة تالفة. شاشة تحميل بلا نهاية ولا تفسير أسوأ من
  // رسالة خطأ صريحة، فنمنح المستخدمة مخرجًا بدل الانتظار الأبدي.
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStalled(true), 15_000);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
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
        {stalled ? (
          <View className="mt-10 items-center gap-3 px-6">
            <MaterialIcons name="wifi-off" size={28} color="#9ca3af" />
            <Text className="text-center font-plex-medium text-sm text-neutral-600 dark:text-neutral-300">
              تعذّر الاتصال بالخادم
            </Text>
            <Text className="text-center font-plex text-xs text-neutral-500 dark:text-neutral-400">
              تأكّدي من اتصالك بالإنترنت ثمّ أعيدي المحاولة.
            </Text>
            <Pressable
              onPress={() => router.replace('/(auth)/sign-in')}
              className="mt-1 rounded-xl bg-brand-700 px-6 py-3 active:scale-95"
            >
              <Text className="font-plex-bold text-sm text-white">إعادة المحاولة</Text>
            </Pressable>
          </View>
        ) : (
          <View className="mt-10 items-center gap-2">
            <View className="h-[3px] w-36 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <View className="h-full w-1/2 rounded-full bg-brand-700 dark:bg-brand-500" />
            </View>
            <Text className="font-plex-medium text-xs tracking-wide text-neutral-500 dark:text-neutral-400">
              جارٍ التحميل…
            </Text>
          </View>
        )}
      </View>

      {/* التذييل — رؤية 2030 */}
      <View className="w-full items-center gap-4 px-5" style={bottomInset}>
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
