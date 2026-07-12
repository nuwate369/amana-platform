import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';

/**
 * شاشة «البصمة الكربونية» — تحويل مطابق لتصميم Stitch (Carbon Footprint Screen).
 * إحصاءات الأثر البيئي للرحلات المشتركة والكهربائية.
 * الألوان الأساسية مطابقة للوحة الراكبة الأرجوانية، مع إبقاء أخضر بيئي دلالي
 * للعناصر ذات المعنى (توفير الانبعاثات). الخط IBM Plex Sans Arabic.
 * البيانات ثابتة (mock) — بلا منطق أعمال. الرسوم مقرّبة بعناصر View بسيطة.
 */

// أخضر بيئي دلالي (خارج لوحة العلامة الأرجوانية).
const ECO_GREEN = '#16a34a';

// أعمدة الأداء الأسبوعي: النسبة والتمييز.
const BARS = [
  { h: 40, active: false },
  { h: 60, active: false },
  { h: 45, active: false },
  { h: 75, active: false },
  { h: 90, active: true },
  { h: 55, active: false },
  { h: 65, active: false },
];
const DAYS = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

// شريط التنقّل السفلي الثابت.
function BottomNav() {
  return (
    <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-around rounded-t-xl bg-white px-4 pb-8 pt-3 dark:bg-neutral-800">
      <View className="items-center">
        <MaterialIcons name="home" size={24} color="#9ca3af" />
        <Text className="font-plex-medium text-[11px] text-neutral-400">الرئيسية</Text>
      </View>
      <View className="items-center">
        <MaterialIcons name="directions-car" size={24} color="#9ca3af" />
        <Text className="font-plex-medium text-[11px] text-neutral-400">رحلاتي</Text>
      </View>
      <View className="flex-row items-center gap-1 rounded-full bg-brand-100 px-5 py-1 dark:bg-brand-900/50">
        <MaterialIcons name="auto-awesome" size={22} color={passengerPurple[700]} />
        <Text className="font-plex-medium text-[11px] text-brand-700 dark:text-brand-200">
          المخطط الذكي
        </Text>
      </View>
      <View className="items-center">
        <MaterialIcons name="person" size={24} color="#9ca3af" />
        <Text className="font-plex-medium text-[11px] text-neutral-400">الملف الشخصي</Text>
      </View>
    </View>
  );
}

export default function CarbonScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-14 flex-row items-center justify-between px-5">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <MaterialIcons name="arrow-forward" size={24} color={passengerPurple[700]} />
        </Pressable>
        <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-200">
          البصمة الكربونية
        </Text>
        <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800">
          <MaterialIcons name="notifications" size={24} color={passengerPurple[700]} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* بطاقة الأثر الرئيسية */}
        <View className="mb-6 overflow-hidden rounded-2xl border border-brand-100 bg-brand-50 p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <Text className="mb-1 font-plex-medium text-xs text-neutral-500 dark:text-neutral-400">
            إجمالي ثاني أكسيد الكربون الذي تم توفيره
          </Text>
          <Text className="mb-4 font-plex-semibold text-[26px] text-brand-700 dark:text-brand-200">
            124.5 كجم
          </Text>
          <View className="flex-row items-center gap-2 self-start rounded-full border border-white bg-white/70 px-4 py-1">
            <MaterialIcons name="eco" size={18} color={ECO_GREEN} />
            <Text className="font-plex text-sm text-neutral-800">يعادل زراعة 6 أشجار</Text>
          </View>
          {/* زخرفة */}
          <View className="absolute -bottom-4 -left-4 opacity-10">
            <MaterialIcons name="forest" size={120} color={ECO_GREEN} />
          </View>
        </View>

        {/* بطاقة الأداء الأسبوعي (رسم أعمدة) */}
        <View className="mb-4 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-plex-semibold text-lg text-brand-700 dark:text-brand-200">
              الأداء الأسبوعي
            </Text>
            <Text className="font-plex-medium text-xs" style={{ color: ECO_GREEN }}>
              +12% تحسن
            </Text>
          </View>
          <View className="h-40 flex-row items-end justify-between gap-2 pt-2">
            {BARS.map((bar, i) => (
              <View
                key={i}
                className={`flex-1 rounded-t-lg ${
                  bar.active ? 'bg-brand-600' : 'bg-brand-100 dark:bg-neutral-700'
                }`}
                style={{ height: `${bar.h}%` }}
              />
            ))}
          </View>
          <View className="mt-2 flex-row justify-between">
            {DAYS.map((d, i) => (
              <Text
                key={i}
                className="flex-1 text-center font-plex-medium text-xs text-neutral-400"
              >
                {d}
              </Text>
            ))}
          </View>
        </View>

        {/* شبكة إحصاءات */}
        <View className="mb-6 flex-row gap-4">
          {/* الرحلات المشتركة */}
          <View className="flex-1 items-center justify-center rounded-2xl border border-brand-100 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <MaterialIcons name="directions-car" size={24} color={passengerPurple[700]} />
            <Text className="my-1 font-plex-semibold text-[26px] text-brand-700 dark:text-brand-200">
              ٢٤
            </Text>
            <Text className="font-plex-medium text-xs text-neutral-500 dark:text-neutral-400">
              رحلة مشتركة
            </Text>
          </View>
          {/* هدف الشهر (حلقة تقدّم مقرّبة) */}
          <View className="flex-1 items-center justify-center rounded-2xl border border-brand-100 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <View
              className="h-16 w-16 items-center justify-center rounded-full border-[5px] border-neutral-200 dark:border-neutral-600"
              style={{ borderTopColor: ECO_GREEN, borderRightColor: ECO_GREEN, borderBottomColor: ECO_GREEN }}
            >
              <MaterialIcons name="eco" size={22} color={ECO_GREEN} />
            </View>
            <View className="mt-1 items-center">
              <Text className="font-plex-medium text-xs text-brand-700 dark:text-brand-200">
                هدف الشهر
              </Text>
              <Text className="font-plex-bold text-sm" style={{ color: ECO_GREEN }}>
                ٧٥٪
              </Text>
            </View>
          </View>
        </View>

        {/* تفاصيل المساهمة البيئية */}
        <Text className="mb-4 font-plex-semibold text-lg text-brand-700 dark:text-brand-200">
          تفاصيل المساهمة البيئية
        </Text>
        <View className="mb-2">
          {/* عنصر 1 */}
          <View className="mb-4 flex-row items-center gap-4 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
            <View
              className="h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: '#dcfce7' }}
            >
              <MaterialIcons name="electric-car" size={24} color={ECO_GREEN} />
            </View>
            <View className="flex-1">
              <Text className="font-plex-semibold text-base text-neutral-900 dark:text-neutral-50">
                رحلات كهربائية
              </Text>
              <Text className="font-plex text-sm text-neutral-500 dark:text-neutral-400">
                تم توفير ٤٥ كجم من CO2
              </Text>
            </View>
            <MaterialIcons name="chevron-left" size={22} color="#9ca3af" />
          </View>
          {/* عنصر 2 */}
          <View className="flex-row items-center gap-4 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
            <View className="h-12 w-12 items-center justify-center rounded-lg bg-brand-100 dark:bg-neutral-700">
              <MaterialIcons name="group" size={24} color={passengerPurple[600]} />
            </View>
            <View className="flex-1">
              <Text className="font-plex-semibold text-base text-neutral-900 dark:text-neutral-50">
                الركوب المشترك
              </Text>
              <Text className="font-plex text-sm text-neutral-500 dark:text-neutral-400">
                تم توفير ٧٩.٥ كجم من CO2
              </Text>
            </View>
            <MaterialIcons name="chevron-left" size={22} color="#9ca3af" />
          </View>
        </View>

        {/* دعوة لاتخاذ إجراء */}
        <LinearGradient
          colors={[passengerPurple[700], passengerPurple[500]]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ borderRadius: 16 }}
          className="mt-8 overflow-hidden p-6"
        >
          <Text className="mb-1 font-plex-semibold text-lg text-white">ازرعي شجرة اليوم!</Text>
          <Text className="mb-4 font-plex text-sm leading-6 text-white/80">
            استخدمي النقاط المكتسبة من رحلاتك البيئية للمساهمة في مبادرة "السعودية الخضراء".
          </Text>
          <Pressable className="self-start rounded-full bg-white px-6 py-2.5 active:scale-95">
            <Text className="font-plex-bold text-xs text-brand-700">استبدال النقاط</Text>
          </Pressable>
        </LinearGradient>
      </ScrollView>

      {/* زر عائم بيئي */}
      <Pressable
        className="absolute bottom-28 left-5 h-14 w-14 items-center justify-center rounded-full shadow-lg active:scale-90"
        style={{ backgroundColor: ECO_GREEN }}
      >
        <MaterialIcons name="add-location-alt" size={28} color="#ffffff" />
      </Pressable>

      <BottomNav />
    </SafeAreaView>
  );
}
