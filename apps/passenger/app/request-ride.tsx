import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';

/**
 * شاشة «تحديد الرحلة» — تحويل مطابق لتصميم Stitch
 * (Request Ride Screen, مشروع Amanah Mobility Platform).
 * الألوان مطابقة للوحة الراكبة الأرجوانية والخط IBM Plex Sans Arabic.
 * منطقة الخريطة عنصر نائب (placeholder) — بلا مكتبات خرائط.
 * البيانات ثابتة (mock) مطابقة للتصميم — بلا منطق أعمال.
 */

type RideOption = {
  id: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  price: string;
  eta: string;
};

const RIDE_OPTIONS: RideOption[] = [
  {
    id: 'standard',
    icon: 'directions-car',
    title: 'أمانة أساسية',
    subtitle: 'سيارة مريحة وحديثة',
    price: '٤٥.٠٠ ر.س',
    eta: '٤:٢٠ م',
  },
  {
    id: 'premium',
    icon: 'local-taxi',
    title: 'أمانة فخمة',
    subtitle: 'خدمة راقية وسيارات فارهة',
    price: '٨٢.٠٠ ر.س',
    eta: '٤:١٨ م',
  },
  {
    id: 'group',
    icon: 'airport-shuttle',
    title: 'مجموعة نقل',
    subtitle: 'تتسع حتى ٦ أشخاص',
    price: '٦٨.٠٠ ر.س',
    eta: '٤:٢٥ م',
  },
];

export default function RequestRideScreen() {
  const [selected, setSelected] = useState('standard');

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-14 flex-row items-center justify-between px-5">
        <View className="w-10" />
        <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-200">تحديد الرحلة</Text>
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <MaterialIcons name="arrow-forward" size={24} color={passengerPurple[700]} />
        </Pressable>
      </View>

      {/* منطقة الخريطة (عنصر نائب) مع بطاقتَي الموقع */}
      <View className="relative mx-5 mb-4 h-56 overflow-hidden rounded-2xl">
        <View className="absolute inset-0 items-center justify-center bg-neutral-100 dark:bg-neutral-800">
          <MaterialIcons name="map" size={56} color="#9ca3af" />
          <Text className="mt-2 font-plex-medium text-sm text-neutral-400">الخريطة</Text>
        </View>

        <View className="absolute left-3 right-3 top-3 gap-2">
          <View className="flex-row items-center gap-3 rounded-xl bg-white/95 p-3 shadow dark:bg-neutral-800/95">
            <MaterialIcons name="radio-button-checked" size={18} color={passengerPurple[600]} />
            <View>
              <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">موقعي الحالي</Text>
              <Text className="font-plex-medium text-sm text-neutral-900 dark:text-neutral-50">حي النخيل، الرياض</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-3 rounded-xl bg-white/95 p-3 shadow dark:bg-neutral-800/95">
            <MaterialIcons name="location-on" size={18} color="#dc2626" />
            <View>
              <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">الوجهة</Text>
              <Text className="font-plex-medium text-sm text-neutral-900 dark:text-neutral-50">بوليفارد رياض سيتي</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* العنوان + وقت الوصول */}
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="font-plex-semibold text-xl text-neutral-900 dark:text-neutral-50">اختر نوع الرحلة</Text>
          <View className="flex-row items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 dark:bg-neutral-800">
            <MaterialIcons name="schedule" size={16} color="#9ca3af" />
            <Text className="font-plex-medium text-xs text-neutral-500 dark:text-neutral-400">١٢ دقيقة وصول</Text>
          </View>
        </View>

        {/* قائمة أنواع الرحلات */}
        <View className="mb-8 gap-3">
          {RIDE_OPTIONS.map((option) => {
            const isActive = selected === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => setSelected(option.id)}
                className={`flex-row items-center justify-between rounded-xl border p-4 ${
                  isActive
                    ? 'border-2 border-brand-600 bg-brand-50 dark:bg-brand-900/40'
                    : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800'
                }`}
              >
                <View className="flex-row items-center gap-4">
                  <View className="h-12 w-16 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-700">
                    <MaterialIcons name={option.icon} size={26} color={passengerPurple[700]} />
                  </View>
                  <View>
                    <Text className="font-plex-semibold text-base text-neutral-900 dark:text-neutral-50">
                      {option.title}
                    </Text>
                    <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">{option.subtitle}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="font-plex-semibold text-base text-brand-700 dark:text-brand-300">{option.price}</Text>
                  <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">{option.eta}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* وسيلة الدفع */}
        <View className="mb-2 flex-row items-center justify-between rounded-xl border border-neutral-200/60 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <View className="flex-row items-center gap-3">
            <View className="h-6 w-10 items-center justify-center rounded bg-neutral-100 dark:bg-neutral-700">
              <MaterialIcons name="credit-card" size={16} color={passengerPurple[700]} />
            </View>
            <Text className="font-plex-medium text-sm text-neutral-900 dark:text-neutral-50">Visa •••• ٩٤٣٢</Text>
          </View>
          <Pressable className="flex-row items-center gap-1">
            <Text className="font-plex-medium text-xs text-brand-700 dark:text-brand-200">تغيير</Text>
            <MaterialIcons name="chevron-left" size={16} color={passengerPurple[700]} />
          </Pressable>
        </View>
      </ScrollView>

      {/* زر الطلب الثابت أسفل الشاشة */}
      <View className="absolute bottom-0 left-0 right-0 rounded-t-xl bg-white px-5 pb-8 pt-4 dark:bg-neutral-800">
        <Pressable
          onPress={() => router.push('/matching')}
          className="h-14 flex-row items-center justify-center gap-2 rounded-xl bg-brand-600 active:scale-[0.98]"
        >
          <Text className="font-plex-semibold text-xl text-white">اطلبي الرحلة</Text>
          <MaterialIcons name="chevron-left" size={22} color="#ffffff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
