import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';

/**
 * شاشة الملاحة والرحلة النشطة للسائق — تحويل مطابق لتصميم Stitch.
 * خريطة (Placeholder)، حالة الرحلة، بطاقة الاتجاهات، تفاصيل الراكب، وزر إتمام الرحلة.
 * لوحة التطبيق: الأزرق الداكن (Navy). البيانات ثابتة (mock) — بلا منطق أعمال.
 */
export default function ActiveRideScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-16 flex-row-reverse items-center justify-between border-b border-neutral-200 px-5 dark:border-neutral-800">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full border-2 border-brand-700 bg-neutral-100 dark:border-brand-500 dark:bg-neutral-700">
            <MaterialIcons name="person" size={20} color={driverNavy[700]} />
          </View>
          <Text className="font-plex-bold text-2xl text-neutral-900 dark:text-neutral-50">أمانة</Text>
        </View>
        <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800">
          <MaterialIcons name="notifications" size={24} color="#6b7280" />
        </Pressable>
      </View>

      {/* الخريطة والعناصر الطافية */}
      <View className="relative flex-1">
        {/* لوحة الخريطة (Placeholder) */}
        <View className="absolute inset-0 items-center justify-center bg-neutral-100 dark:bg-neutral-800">
          <MaterialIcons name="map" size={64} color="#9ca3af" />
          <Text className="mt-2 font-plex-medium text-sm text-neutral-400">خريطة الملاحة</Text>
        </View>

        {/* مؤشر الحالة الطافي */}
        <View className="absolute left-0 right-0 top-4 items-center">
          <View className="flex-row items-center gap-2 rounded-full border border-neutral-200 bg-white/90 px-6 py-2 shadow-md dark:border-neutral-700 dark:bg-neutral-800/90">
            <View className="h-3 w-3 rounded-full bg-brand-500" />
            <Text className="font-plex-bold text-sm text-brand-700 dark:text-brand-300">
              في الطريق إلى العميل
            </Text>
          </View>
        </View>

        {/* زر الطوارئ */}
        <View className="absolute right-4 top-4">
          <Pressable className="h-12 w-12 items-center justify-center rounded-full border border-red-500 bg-white/90 shadow-lg active:scale-95 dark:bg-neutral-800/90">
            <MaterialIcons name="emergency" size={24} color="#ba1a1a" />
          </Pressable>
        </View>

        {/* بطاقة الاتجاهات */}
        <View className="absolute right-4 top-20 w-72 rounded-xl border border-neutral-200 bg-white/90 p-4 shadow-md dark:border-neutral-700 dark:bg-neutral-800/90">
          <View className="mb-2 flex-row items-center justify-between">
            <View>
              <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
                المسافة المتبقية
              </Text>
              <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-300">
                1.2 كم
              </Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/40">
              <MaterialIcons name="turn-right" size={30} color={driverNavy[700]} />
            </View>
          </View>
          <View className="border-t border-neutral-200 pt-2 dark:border-neutral-700">
            <Text className="font-plex text-base text-neutral-900 dark:text-neutral-50">
              انعطف يميناً إلى شارع العليا
            </Text>
          </View>
        </View>

        {/* بطاقة تفاصيل الراكب */}
        <View className="absolute bottom-32 left-5 right-5">
          <View className="flex-row items-center gap-4 rounded-xl border border-neutral-200 bg-white/90 p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-800/90">
            <View className="h-14 w-14 items-center justify-center rounded-full border-2 border-neutral-200 bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-700">
              <MaterialIcons name="person" size={26} color={driverNavy[700]} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="font-plex-semibold text-xl text-neutral-900 dark:text-neutral-50">
                  عبدالله محمد
                </Text>
                <View className="flex-row items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 dark:bg-neutral-700">
                  <MaterialIcons name="star" size={14} color={driverNavy[600]} />
                  <Text className="font-plex-medium text-sm text-neutral-600 dark:text-neutral-300">
                    4.9
                  </Text>
                </View>
              </View>
              <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
                نقطة الالتقاء: فندق ريتز كارلتون
              </Text>
            </View>
            <View className="gap-2">
              <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-brand-100 active:bg-brand-200 dark:bg-neutral-700">
                <MaterialIcons name="chat-bubble" size={20} color={driverNavy[700]} />
              </Pressable>
              <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-brand-100 active:bg-brand-200 dark:bg-neutral-700">
                <MaterialIcons name="call" size={20} color={driverNavy[700]} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* شريط الإجراء الرئيسي */}
        <View className="absolute bottom-0 left-0 right-0 rounded-t-[32px] bg-white px-5 pb-8 pt-6 shadow-2xl dark:bg-neutral-800">
          <View className="mb-3 flex-row items-center justify-between px-2">
            <View>
              <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
                الوقت المقدر
              </Text>
              <Text className="font-plex-bold text-lg text-neutral-900 dark:text-neutral-50">
                4 دقائق
              </Text>
            </View>
            <View className="items-end">
              <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
                إجمالي الرحلة
              </Text>
              <Text className="font-plex-bold text-lg text-brand-700 dark:text-brand-300">
                45.00 ر.س
              </Text>
            </View>
          </View>

          {/* زر إتمام الرحلة */}
          <Pressable
            onPress={() => router.back()}
            className="relative h-16 flex-row items-center justify-center overflow-hidden rounded-full bg-brand-700 active:scale-[0.98] dark:bg-brand-600"
          >
            <Text className="font-plex-semibold text-xl text-white">إتمام الرحلة</Text>
            <View className="absolute bottom-2 right-2 top-2 w-12 items-center justify-center rounded-full bg-white/20">
              <MaterialIcons name="chevron-left" size={24} color="#ffffff" />
            </View>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
