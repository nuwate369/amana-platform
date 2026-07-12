import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';

/**
 * شاشة «سجل الرحلات» — تحويل مطابق لتصميم Stitch
 * (Ride History Screen, مشروع Amanah Mobility Platform)
 * الألوان مطابقة للوحة الراكبة الأرجوانية والخط IBM Plex Sans Arabic.
 * البيانات ثابتة (mock) مطابقة للتصميم — بلا منطق أعمال.
 */

const FILTERS = ['الكل', 'مكتملة', 'ملغاة', 'مجدولة'];

type Ride = {
  id: string;
  driver: string;
  rating?: string;
  fare: string;
  from: string;
  to: string;
  date?: string;
  time?: string;
  cancelled?: boolean;
};

const RIDES: Ride[] = [
  {
    id: '#8821',
    driver: 'سارة الكاظم',
    rating: '4.9',
    fare: '65.00 ر.س',
    from: 'مركز الملك عبد الله المالي (KAFD)',
    to: 'حي الملقا، طريق أنس بن مالك',
    date: '15 أكتوبر 2023',
    time: '09:15 ص',
  },
  {
    id: '#8790',
    driver: 'نورة العتيبي',
    rating: '4.8',
    fare: '42.50 ر.س',
    from: 'الرياض بارك مول',
    to: 'جامعة الملك سعود، الدرعية',
    date: '12 أكتوبر 2023',
    time: '06:30 م',
  },
  {
    id: '#0000',
    driver: 'رحلة ملغاة',
    fare: '0.00 ر.س',
    from: 'حي النرجس',
    to: 'مطار الملك خالد الدولي',
    cancelled: true,
  },
];

// مؤشّر مسار (نقطة انطلاق ← نقطة وصول).
function RouteIndicator({ muted }: { muted?: boolean }) {
  const color = muted ? '#9ca3af' : passengerPurple[700];
  return (
    <View className="mt-1 items-center">
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <View className="my-0.5 h-6 w-0.5 bg-neutral-300 dark:bg-neutral-600" />
      <View
        className="h-2.5 w-2.5 rounded-full border-2"
        style={{ borderColor: color, backgroundColor: 'transparent' }}
      />
    </View>
  );
}

function RideCard({ ride }: { ride: Ride }) {
  if (ride.cancelled) {
    return (
      <View className="rounded-xl border border-neutral-200 bg-neutral-100 p-4 opacity-90 dark:border-neutral-700 dark:bg-neutral-800/60">
        <View className="mb-4 flex-row items-start justify-between">
          <View className="flex-row items-center gap-4">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
              <MaterialIcons name="no-accounts" size={24} color="#9ca3af" />
            </View>
            <View>
              <Text className="font-plex-semibold text-base text-neutral-900 dark:text-neutral-100">
                {ride.driver}
              </Text>
              <View className="mt-1 self-start rounded bg-red-100 px-2 py-0.5 dark:bg-red-900/40">
                <Text className="font-plex-bold text-[10px] text-red-700 dark:text-red-300">
                  تم الإلغاء
                </Text>
              </View>
            </View>
          </View>
          <Text className="font-plex-semibold text-base text-neutral-400">{ride.fare}</Text>
        </View>

        <View className="mb-6 flex-row items-start gap-4 opacity-60">
          <RouteIndicator muted />
          <View className="gap-2">
            <Text className="font-plex text-sm text-neutral-900 dark:text-neutral-100">
              {ride.from}
            </Text>
            <Text className="font-plex text-sm text-neutral-900 dark:text-neutral-100">
              {ride.to}
            </Text>
          </View>
        </View>

        <Pressable className="h-12 flex-row items-center justify-center gap-1 rounded-lg bg-brand-100 dark:bg-brand-900/40">
          <MaterialIcons name="info" size={20} color={passengerPurple[700]} />
          <Text className="font-plex-semibold text-xs text-brand-700 dark:text-brand-200">
            سبب الإلغاء
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
      <View className="mb-4 flex-row items-start justify-between">
        <View className="flex-row items-center gap-4">
          <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            <MaterialIcons name="person" size={28} color={passengerPurple[400]} />
          </View>
          <View>
            <Text className="font-plex-semibold text-base text-neutral-900 dark:text-neutral-100">
              {ride.driver}
            </Text>
            <View className="mt-0.5 flex-row items-center gap-1">
              <MaterialIcons name="star" size={16} color="#f59e0b" />
              <Text className="font-plex-medium text-xs text-neutral-600 dark:text-neutral-300">
                {ride.rating}
              </Text>
            </View>
          </View>
        </View>
        <View className="items-end">
          <Text className="font-plex-semibold text-base text-brand-700 dark:text-brand-300">
            {ride.fare}
          </Text>
          <Text className="font-plex-medium text-xs text-neutral-400">رقم الرحلة {ride.id}</Text>
        </View>
      </View>

      {/* المسار */}
      <View className="mb-4 flex-row items-start gap-4">
        <RouteIndicator />
        <View className="gap-2">
          <Text className="font-plex text-sm text-neutral-900 dark:text-neutral-100">
            {ride.from}
          </Text>
          <Text className="font-plex text-sm text-neutral-900 dark:text-neutral-100">
            {ride.to}
          </Text>
        </View>
      </View>

      {/* التاريخ والوقت */}
      <View className="mb-5 flex-row items-center gap-4 pr-6">
        <View className="flex-row items-center gap-1">
          <MaterialIcons name="calendar-today" size={18} color="#9ca3af" />
          <Text className="font-plex text-sm text-neutral-500 dark:text-neutral-400">
            {ride.date}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <MaterialIcons name="schedule" size={18} color="#9ca3af" />
          <Text className="font-plex text-sm text-neutral-500 dark:text-neutral-400">
            {ride.time}
          </Text>
        </View>
      </View>

      {/* الأزرار */}
      <View className="flex-row gap-4">
        <Pressable className="h-12 flex-1 flex-row items-center justify-center gap-1 rounded-lg bg-brand-600 active:scale-[0.98]">
          <MaterialIcons name="restart-alt" size={20} color="#ffffff" />
          <Text className="font-plex-semibold text-xs text-white">إعادة حجز</Text>
        </Pressable>
        <Pressable className="h-12 items-center justify-center rounded-lg border border-neutral-300 px-4 dark:border-neutral-600">
          <Text className="font-plex-semibold text-xs text-neutral-900 dark:text-neutral-100">
            التفاصيل
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// عنصر تبويب في الشريط السفلي.
function NavItem({
  icon,
  label,
  active,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  active?: boolean;
}) {
  if (active) {
    return (
      <View className="flex-row items-center gap-1 rounded-full bg-brand-100 px-5 py-1 dark:bg-brand-900/40">
        <MaterialIcons name={icon} size={24} color={passengerPurple[700]} />
        <Text className="font-plex-medium text-xs text-brand-700 dark:text-brand-200">{label}</Text>
      </View>
    );
  }
  return (
    <View className="items-center justify-center">
      <MaterialIcons name={icon} size={24} color="#9ca3af" />
      <Text className="mt-1 font-plex-medium text-xs text-neutral-400">{label}</Text>
    </View>
  );
}

export default function RideHistoryScreen() {
  const [activeFilter, setActiveFilter] = useState('الكل');

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-14 flex-row items-center justify-between px-5">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800">
          <MaterialIcons name="menu" size={24} color={passengerPurple[700]} />
        </Pressable>
        <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-200">أمانة</Text>
        <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800">
          <MaterialIcons name="notifications" size={24} color={passengerPurple[700]} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* العنوان */}
        <View className="mb-6">
          <Text className="mb-1 font-plex-semibold text-[26px] text-brand-700 dark:text-brand-200">
            سجل الرحلات
          </Text>
          <Text className="font-plex text-sm text-neutral-500 dark:text-neutral-400">
            استعرض جميع رحلاتك السابقة وتفاصيلها
          </Text>
        </View>

        {/* وسوم التصفية */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4 -mx-5 px-5"
          contentContainerStyle={{ gap: 12 }}
        >
          {FILTERS.map((filter) => {
            const active = filter === activeFilter;
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                className={
                  active
                    ? 'rounded-full bg-brand-100 px-4 py-1.5 dark:bg-brand-900/40'
                    : 'rounded-full bg-neutral-100 px-4 py-1.5 dark:bg-neutral-800'
                }
              >
                <Text
                  className={
                    active
                      ? 'font-plex-medium text-xs text-brand-700 dark:text-brand-200'
                      : 'font-plex-medium text-xs text-neutral-500 dark:text-neutral-400'
                  }
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* قائمة الرحلات */}
        <View className="gap-4">
          {RIDES.map((ride) => (
            <RideCard key={ride.id} ride={ride} />
          ))}
        </View>
      </ScrollView>

      {/* زر عائم لإضافة رحلة */}
      <Pressable className="absolute bottom-24 left-6 h-14 w-14 items-center justify-center rounded-full bg-brand-600 shadow-lg active:scale-90">
        <MaterialIcons name="add" size={28} color="#ffffff" />
      </Pressable>

      {/* شريط التنقّل السفلي */}
      <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-around rounded-t-xl bg-white px-4 pb-8 pt-3 dark:bg-neutral-800">
        <NavItem icon="home" label="الرئيسية" />
        <NavItem icon="directions-car" label="رحلاتي" active />
        <NavItem icon="auto-awesome" label="المخطط الذكي" />
        <NavItem icon="person" label="الملف الشخصي" />
      </View>
    </SafeAreaView>
  );
}
