import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';

/**
 * شاشة «لوحة الأرباح» للسائق — تحويل مطابق لتصميم Stitch
 * (Driver Earnings Dashboard، مشروع Amanah Mobility Platform).
 * لوحة السائق كحلة أزرق داكن (Navy) والخط IBM Plex Sans Arabic.
 * البيانات ثابتة (mock) مطابقة للتصميم — بلا منطق أعمال.
 */

// عمود في مخطط الأرباح الأسبوعي.
function ChartBar({
  label,
  height,
  active,
}: {
  label: string;
  height: number;
  active?: boolean;
}) {
  return (
    <View className="flex-1 items-center justify-end gap-2">
      <View
        style={{ height: `${height}%` }}
        className={`w-8 rounded-t-md ${active ? 'bg-brand-700' : 'bg-brand-100 dark:bg-neutral-700'}`}
      />
      <Text
        className={`font-plex text-xs ${active ? 'font-plex-bold text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}`}
      >
        {label}
      </Text>
    </View>
  );
}

// صف رحلة في قائمة آخر الرحلات.
function RideRow({
  number,
  meta,
  amount,
}: {
  number: string;
  meta: string;
  amount: string;
}) {
  return (
    <View className="mb-2 flex-row items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
      <View className="flex-1 flex-row items-center gap-4">
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-neutral-700">
          <MaterialIcons name="directions-car" size={24} color={driverNavy[600]} />
        </View>
        <View className="flex-1">
          <Text className="font-plex-bold text-base text-neutral-900 dark:text-neutral-50">
            {number}
          </Text>
          <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">{meta}</Text>
        </View>
      </View>
      <View className="items-start">
        <Text className="font-plex-bold text-lg text-neutral-900 dark:text-neutral-50">{amount}</Text>
        <Text className="mt-1 rounded-full bg-green-50 px-2 py-0.5 font-plex text-xs text-green-600 dark:bg-green-900/30 dark:text-green-400">
          مكتملة
        </Text>
      </View>
    </View>
  );
}

export default function EarningsScreen() {
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
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* بطاقة الرصيد الرئيسية */}
        <LinearGradient
          colors={[driverNavy[800], driverNavy[600]]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ borderRadius: 16 }}
          className="mb-4 justify-between overflow-hidden p-6"
        >
          <View>
            <Text className="font-plex-medium text-sm text-white/80">
              إجمالي الرصيد القابل للسحب
            </Text>
            <View className="mt-1 flex-row items-baseline gap-1">
              <Text className="font-plex-bold text-[32px] text-white">٢,٨٤٥.٥٠</Text>
              <Text className="font-plex-semibold text-lg text-white/80">ر.س</Text>
            </View>
          </View>
          <Pressable className="mt-6 h-14 flex-row items-center justify-center gap-2 rounded-full bg-white active:scale-[0.98]">
            <MaterialIcons name="payments" size={22} color={driverNavy[700]} />
            <Text className="font-plex-semibold text-lg text-brand-700">سحب الأرباح</Text>
          </Pressable>
        </LinearGradient>

        {/* شبكة الإحصاءات */}
        <View className="mb-8 flex-row flex-wrap gap-2">
          <View className="flex-1 rounded-xl border border-neutral-200 bg-brand-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
            <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">رحلات اليوم</Text>
            <Text className="mt-1 font-plex-semibold text-2xl text-neutral-900 dark:text-neutral-50">
              ١٤
            </Text>
          </View>
          <View className="flex-1 rounded-xl border border-neutral-200 bg-brand-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
            <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">التقييم</Text>
            <View className="mt-1 flex-row items-center gap-1">
              <Text className="font-plex-semibold text-2xl text-neutral-900 dark:text-neutral-50">
                ٤.٩
              </Text>
              <MaterialIcons name="star" size={20} color="#f59e0b" />
            </View>
          </View>
          <View className="w-full rounded-xl border border-neutral-200 bg-brand-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
            <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
              أرباح الأسبوع الحالي
            </Text>
            <Text className="mt-1 font-plex-semibold text-xl text-neutral-900 dark:text-neutral-50">
              ١,٢٤٠.٠٠ ر.س
            </Text>
          </View>
        </View>

        {/* مخطط الأرباح */}
        <View className="mb-8 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="font-plex-semibold text-xl text-neutral-900 dark:text-neutral-50">
              ملخص الأرباح الأسبوعي
            </Text>
            <View className="flex-row gap-2">
              <View className="rounded-full border border-neutral-200 bg-neutral-100 px-4 py-1 dark:border-neutral-600 dark:bg-neutral-700">
                <Text className="font-plex-medium text-sm text-neutral-700 dark:text-neutral-200">
                  يومي
                </Text>
              </View>
              <View className="rounded-full bg-brand-700 px-4 py-1">
                <Text className="font-plex-medium text-sm text-white">أسبوعي</Text>
              </View>
            </View>
          </View>
          <View className="h-48 flex-row items-end justify-between gap-2 px-2">
            <ChartBar label="أحد" height={40} />
            <ChartBar label="إثنين" height={65} />
            <ChartBar label="ثلاثاء" height={90} active />
            <ChartBar label="أربعاء" height={55} />
            <ChartBar label="خميس" height={75} />
            <ChartBar label="جمعة" height={30} />
            <ChartBar label="سبت" height={45} />
          </View>
        </View>

        {/* آخر الرحلات */}
        <View>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-plex-semibold text-xl text-neutral-900 dark:text-neutral-50">
              آخر الرحلات
            </Text>
            <Pressable className="flex-row items-center gap-1">
              <Text className="font-plex-medium text-sm text-neutral-500 dark:text-neutral-400">
                عرض الكل
              </Text>
              <MaterialIcons name="chevron-left" size={18} color={driverNavy[600]} />
            </Pressable>
          </View>
          <RideRow number="رحلة #٤٥٨٩" meta="اليوم، ٠٢:٣٠ م • شارع الملك فهد" amount="٤٥.٠٠ ر.س" />
          <RideRow number="رحلة #٤٥٨٨" meta="اليوم، ١٢:١٥ م • حي الملقا" amount="٣٢.٥٠ ر.س" />
          <RideRow number="رحلة #٤٥٨٧" meta="أمس، ٠٩:٤٥ م • مطار الملك خالد" amount="١١٨.٠٠ ر.س" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
