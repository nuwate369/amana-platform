import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';

/**
 * شاشة «سجل الرحلات» للسائق — تحويل مطابق لتصميم Stitch
 * (Driver Ride History، مشروع Amanah Mobility Platform).
 * لوحة السائق كحلة أزرق داكن (Navy) والخط IBM Plex Sans Arabic.
 * البيانات ثابتة (mock) مطابقة للتصميم — بلا منطق أعمال.
 */

// شريحة تصفية.
function FilterChip({ label, active }: { label: string; active?: boolean }) {
  return (
    <View
      className={`rounded-full border px-4 py-2 ${
        active
          ? 'border-brand-600 bg-brand-50 dark:border-brand-500 dark:bg-brand-900/40'
          : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800'
      }`}
    >
      <Text
        className={`font-plex text-sm ${
          active
            ? 'font-plex-bold text-brand-700 dark:text-brand-200'
            : 'text-neutral-500 dark:text-neutral-400'
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

// بطاقة رحلة في السجل.
function HistoryCard({
  name,
  date,
  amount,
  location,
}: {
  name: string;
  date: string;
  amount: string;
  location: string;
}) {
  return (
    <View className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
      <View className="flex-row items-start justify-between">
        <View className="flex-row gap-4">
          <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-neutral-700">
            <MaterialIcons name="person" size={32} color={driverNavy[600]} />
          </View>
          <View>
            <Text className="font-plex-semibold text-xl text-neutral-900 dark:text-neutral-50">
              {name}
            </Text>
            <View className="mt-1 flex-row items-center gap-1">
              <MaterialIcons name="calendar-today" size={14} color="#9ca3af" />
              <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">{date}</Text>
            </View>
          </View>
        </View>
        <View className="items-start">
          <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-200">
            {amount}
          </Text>
          <Text className="mt-1 rounded-lg bg-brand-50 px-2 py-0.5 text-center font-plex text-xs text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
            مدفوع
          </Text>
        </View>
      </View>
      <View className="mt-2 flex-row items-center justify-between border-t border-neutral-100 pt-2 dark:border-neutral-700">
        <View className="flex-row items-center gap-1">
          <MaterialIcons name="location-on" size={20} color={driverNavy[600]} />
          <Text className="font-plex text-base text-neutral-700 dark:text-neutral-200" numberOfLines={1}>
            {location}
          </Text>
        </View>
        <MaterialIcons name="chevron-left" size={22} color="#9ca3af" />
      </View>
    </View>
  );
}

export default function RideHistoryScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-16 flex-row items-center justify-between border-b border-neutral-200 px-5 dark:border-neutral-800">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-brand-50 dark:border-neutral-700 dark:bg-neutral-800">
            <MaterialIcons name="person" size={24} color={driverNavy[600]} />
          </View>
          <Text className="font-plex-bold text-2xl text-neutral-900 dark:text-neutral-50">أمانة</Text>
        </View>
        <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800">
          <MaterialIcons name="notifications" size={24} color={driverNavy[700]} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* عنوان الصفحة */}
        <View className="gap-2 py-4">
          <Text className="font-plex-bold text-[32px] text-brand-700 dark:text-brand-200">
            سجل الرحلات
          </Text>
          <Text className="font-plex text-base text-neutral-500 dark:text-neutral-400">
            مراجعة أداءك والرحلات المكتملة
          </Text>
        </View>

        {/* البحث والتصفية */}
        <View className="mb-6 flex-row gap-2">
          <View className="h-12 flex-1 flex-row items-center rounded-xl border border-neutral-200 bg-white px-4 dark:border-neutral-700 dark:bg-neutral-800">
            <MaterialIcons name="search" size={22} color="#9ca3af" />
            <Text className="ms-2 flex-1 font-plex text-base text-neutral-400">
              البحث برقم الرحلة أو اسم الراكب
            </Text>
          </View>
          <Pressable className="h-12 w-12 items-center justify-center rounded-xl bg-brand-700 active:scale-95">
            <MaterialIcons name="tune" size={22} color="#ffffff" />
          </Pressable>
        </View>

        {/* شرائح التصفية */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4 -mx-5 px-5"
          contentContainerStyle={{ gap: 8 }}
        >
          <FilterChip label="الكل" active />
          <FilterChip label="هذا الأسبوع" />
          <FilterChip label="هذا الشهر" />
          <FilterChip label="المدفوعات النقدية" />
        </ScrollView>

        {/* قائمة السجل */}
        <HistoryCard
          name="محمد العتيبي"
          date="اليوم، 02:45 م"
          amount="45.00 ر.س"
          location="حي الملقا، الرياض"
        />
        <HistoryCard
          name="سارة عبدالله"
          date="أمس، 09:12 م"
          amount="62.50 ر.س"
          location="مطار الملك خالد الدولي"
        />
        <HistoryCard
          name="خالد منصور"
          date="12 أكتوبر، 01:20 م"
          amount="38.00 ر.س"
          location="بوليفارد سيتي"
        />

        {/* بطاقة الملخص */}
        <View className="mt-8 overflow-hidden rounded-3xl bg-brand-800 p-6 dark:bg-brand-900">
          <Text className="font-plex-medium text-base text-white/80">إجمالي أرباح الشهر</Text>
          <Text className="mt-1 font-plex-bold text-[32px] text-white">4,820.00 ر.س</Text>
          <View className="mt-4 flex-row">
            <View className="flex-row items-center gap-1 rounded-full bg-white/10 px-3 py-1">
              <MaterialIcons name="trending-up" size={16} color="#ffffff" />
              <Text className="font-plex text-xs text-white">+12% عن الشهر الماضي</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
