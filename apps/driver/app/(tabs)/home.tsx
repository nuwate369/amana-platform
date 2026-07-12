import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';

/**
 * الشاشة الرئيسية للسائق — استقبال الطلبات (تحويل مطابق لتصميم Stitch).
 * خريطة (Placeholder)، مفتاح متصل/غير متصل، بطاقات الأرباح، وبطاقة طلب واردة.
 * لوحة التطبيق: الأزرق الداكن (Navy). البيانات ثابتة (mock) — بلا منطق أعمال.
 */
export default function HomeScreen() {
  const [online, setOnline] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-16 flex-row-reverse items-center justify-between border-b border-neutral-200 px-5 dark:border-neutral-800">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-700 dark:bg-brand-600">
            <MaterialIcons name="person" size={22} color="#ffffff" />
          </View>
          <Text className="font-plex-bold text-xl text-neutral-900 dark:text-neutral-50">أمانة</Text>
        </View>
        <Pressable className="h-10 w-10 items-center justify-center rounded-xl active:bg-neutral-200 dark:active:bg-neutral-800">
          <MaterialIcons name="notifications" size={24} color={driverNavy[700]} />
        </Pressable>
      </View>

      {/* لوحة الخريطة (Placeholder) */}
      <View className="relative flex-1">
        <View className="absolute inset-0 items-center justify-center bg-neutral-100 dark:bg-neutral-800">
          <MaterialIcons name="map" size={64} color="#9ca3af" />
          <Text className="mt-2 font-plex-medium text-sm text-neutral-400">خريطة الرياض</Text>
        </View>

        {/* مفتاح متصل/غير متصل */}
        <View className="absolute left-0 right-0 top-6 items-center px-5">
          <Pressable
            onPress={() => setOnline((v) => !v)}
            className="h-14 w-full max-w-xs flex-row items-center justify-between rounded-full border border-neutral-200 bg-white/90 px-2 shadow-lg active:scale-95 dark:border-neutral-700 dark:bg-neutral-800/90"
          >
            <Text className="flex-1 text-center font-plex-bold text-base text-neutral-900 dark:text-neutral-50">
              {online ? 'أنت الآن متصل بالخدمة' : 'أنت الآن غير متصل'}
            </Text>
            <View
              className={
                online
                  ? 'h-10 w-12 items-center justify-center rounded-full bg-brand-700'
                  : 'h-10 w-12 items-center justify-center rounded-full bg-neutral-300 dark:bg-neutral-600'
              }
            >
              <MaterialIcons
                name="power-settings-new"
                size={20}
                color={online ? '#ffffff' : '#6b7280'}
              />
            </View>
          </Pressable>
        </View>

        {/* بطاقات الأرباح والإجراءات السريعة */}
        <View className="absolute bottom-6 left-0 right-0 gap-4 px-5">
          {/* بطاقة الأرباح */}
          <View className="flex-row rounded-xl border border-neutral-200 bg-white/90 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/90">
            <View className="flex-1">
              <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
                أرباح اليوم
              </Text>
              <View className="mt-1 flex-row items-baseline gap-1">
                <Text className="font-plex-bold text-[32px] text-brand-700 dark:text-brand-300">
                  245.50
                </Text>
                <Text className="font-plex-bold text-xs text-neutral-500 dark:text-neutral-400">
                  ر.س
                </Text>
              </View>
            </View>
            <View className="flex-1 border-r border-neutral-200 pr-4 dark:border-neutral-700">
              <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
                عدد الرحلات
              </Text>
              <Text className="mt-1 font-plex-bold text-[32px] text-brand-700 dark:text-brand-300">
                12
              </Text>
            </View>
          </View>

          {/* بطاقة الإجراء السريع — مركز الأمان */}
          <Pressable className="flex-row items-center justify-between rounded-xl border border-neutral-200 bg-white/90 p-4 shadow-sm active:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800/90">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/40">
                <MaterialIcons name="verified-user" size={22} color={driverNavy[700]} />
              </View>
              <View>
                <Text className="font-plex-bold text-sm text-neutral-900 dark:text-neutral-50">
                  مركز الأمان
                </Text>
                <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
                  جميع الأنظمة تعمل بكفاءة
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-left" size={24} color="#9ca3af" />
          </Pressable>
        </View>
      </View>

      {/* بطاقة الطلب الوارد — تظهر عند الاتصال */}
      {online && (
        <View className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white px-5 pb-10 pt-6 shadow-2xl dark:bg-neutral-800">
          <View className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-600" />

          {/* رأس الطلب — الراكب والأجرة */}
          <View className="mb-8 flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <View className="h-16 w-16 items-center justify-center rounded-full border-4 border-brand-100 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-700">
                <MaterialIcons name="person" size={28} color={driverNavy[700]} />
              </View>
              <View>
                <Text className="font-plex-semibold text-2xl text-neutral-900 dark:text-neutral-50">
                  أحمد محمد
                </Text>
                <View className="flex-row items-center gap-1">
                  <MaterialIcons name="star" size={16} color={driverNavy[600]} />
                  <Text className="font-plex-bold text-sm text-brand-700 dark:text-brand-300">
                    4.9
                  </Text>
                </View>
              </View>
            </View>
            <View className="items-start">
              <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
                أجرة تقديرية
              </Text>
              <Text className="font-plex-bold text-xl text-brand-700 dark:text-brand-300">
                45.00 ر.س
              </Text>
            </View>
          </View>

          {/* المسار — الاستلام والوجهة */}
          <View className="mb-10 flex-row gap-4">
            <View className="items-center pt-1">
              <View className="h-3 w-3 rounded-full bg-brand-700 dark:bg-brand-500" />
              <View className="my-1 h-10 w-px border-r border-dashed border-neutral-300 dark:border-neutral-600" />
              <View className="h-3 w-3 rounded-full border-2 border-brand-700 dark:border-brand-500" />
            </View>
            <View className="flex-1 gap-4">
              <View>
                <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
                  موقع الاستلام
                </Text>
                <Text className="font-plex-medium text-base text-neutral-900 dark:text-neutral-50">
                  الرياض بارك، حي العقيق
                </Text>
              </View>
              <View>
                <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
                  وجهة الوصول
                </Text>
                <Text className="font-plex-medium text-base text-neutral-900 dark:text-neutral-50">
                  مركز الملك عبد الله المالي
                </Text>
              </View>
            </View>
          </View>

          {/* أزرار القبول والرفض */}
          <View className="flex-row gap-4">
            <Pressable
              onPress={() => router.push('/active-ride')}
              className="h-14 flex-[2] flex-row items-center justify-center gap-2 rounded-xl bg-brand-700 active:scale-95 dark:bg-brand-600"
            >
              <MaterialIcons name="check-circle" size={22} color="#ffffff" />
              <Text className="font-plex-bold text-base text-white">قبول الطلب</Text>
            </Pressable>
            <Pressable
              onPress={() => setOnline(true)}
              className="h-14 flex-1 items-center justify-center rounded-xl border border-neutral-300 active:scale-95 dark:border-neutral-600"
            >
              <Text className="font-plex-bold text-base text-neutral-500 dark:text-neutral-400">
                رفض
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
