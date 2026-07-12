import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';

/**
 * شاشة «المخطط الذكي» — تحويل مطابق لتصميم Stitch (AI Planner Screen).
 * إدخال الحالة المزاجية/الهدف واقتراح وجهات مخصّصة.
 * الألوان مطابقة للوحة الراكبة الأرجوانية، والخط IBM Plex Sans Arabic.
 * البيانات ثابتة (mock) — بلا منطق أعمال.
 */

const CHIPS = ['☕️ مكان هادئ للقهوة', '🌳 منتزه للمشي', '🎨 معرض فني'];

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

export default function AiPlannerScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-14 flex-row items-center justify-between px-5">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800">
          <MaterialIcons name="menu" size={24} color={passengerPurple[700]} />
        </Pressable>
        <Text className="font-plex-bold text-2xl text-brand-700 dark:text-brand-200">أمانة</Text>
        <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800">
          <MaterialIcons name="notifications" size={24} color={passengerPurple[700]} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* قسم العنوان */}
        <View className="mb-6">
          <Text className="mb-1 font-plex-semibold text-xl text-brand-700 dark:text-brand-300">
            المخطط الذكي
          </Text>
          <Text className="font-plex text-sm text-neutral-500 dark:text-neutral-400">
            أين تودين الذهاب اليوم؟ صفي لي حالتك المزاجية أو هدفك.
          </Text>
        </View>

        {/* قسم التفاعل مع الذكاء الاصطناعي */}
        <View className="mb-10 overflow-hidden rounded-2xl border border-brand-100 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <View className="mb-4 flex-row items-center gap-2">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-600">
              <MaterialIcons name="auto-awesome" size={20} color="#ffffff" />
            </View>
            <Text className="font-plex-bold text-xs tracking-widest text-brand-700 dark:text-brand-300">
              ذكاء أمانة الاصطناعي
            </Text>
          </View>

          <View className="relative">
            <TextInput
              multiline
              numberOfLines={3}
              placeholder="مثلاً: أبحث عن مقهى هادئ للدراسة..."
              placeholderTextColor="#9ca3af"
              textAlign="right"
              className="min-h-[88px] rounded-lg border border-neutral-300 bg-neutral-50 p-4 pb-14 font-plex text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
            />
            <Pressable className="absolute bottom-3 left-3 items-center justify-center rounded-lg bg-brand-600 p-2 active:scale-95">
              <MaterialIcons name="send" size={20} color="#ffffff" />
            </Pressable>
          </View>

          <View className="mt-4 flex-row flex-wrap gap-2">
            {CHIPS.map((chip) => (
              <Pressable
                key={chip}
                className="rounded-full bg-brand-50 px-4 py-1.5 active:opacity-80 dark:bg-neutral-700"
              >
                <Text className="font-plex-medium text-xs text-brand-700 dark:text-brand-200">
                  {chip}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* قسم الاقتراحات */}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-300">
            اقتراحات مخصصة لكِ
          </Text>
          <View className="flex-row items-center gap-1">
            <MaterialIcons name="location-on" size={16} color="#9ca3af" />
            <Text className="font-plex-medium text-xs text-neutral-500 dark:text-neutral-400">
              الرياض، العليا
            </Text>
          </View>
        </View>

        {/* بطاقة الاقتراح الأولى */}
        <View className="mb-4 overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <View className="relative h-48 items-center justify-center bg-brand-100 dark:bg-neutral-700">
            <MaterialIcons name="image" size={48} color={passengerPurple[400]} />
            <View className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1">
              <Text className="font-plex-bold text-xs text-brand-700">9.2/10 هدوء</Text>
            </View>
          </View>
          <View className="p-4">
            <View className="mb-2 flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="font-plex-semibold text-lg text-brand-700 dark:text-brand-200">
                  مقهى "سكينة" الفني
                </Text>
                <Text className="font-plex text-sm text-neutral-500 dark:text-neutral-400">
                  حي الملقا • 15 دقيقة بعيداً
                </Text>
              </View>
              <View className="items-start">
                <Text className="font-plex-medium text-xs text-brand-600 dark:text-brand-300">
                  رحلة من
                </Text>
                <Text className="font-plex-bold text-lg text-brand-700 dark:text-brand-200">
                  42 ر.س
                </Text>
              </View>
            </View>
            <View className="mt-4 flex-row items-center gap-4">
              <Pressable className="h-11 flex-1 items-center justify-center rounded-lg bg-brand-600 active:opacity-95">
                <Text className="font-plex-bold text-sm text-white">احجزي رحلتك الآن</Text>
              </Pressable>
              <Pressable className="h-12 w-12 items-center justify-center rounded-lg border border-neutral-300 active:bg-neutral-100 dark:border-neutral-600">
                <MaterialIcons name="bookmark-border" size={22} color={passengerPurple[700]} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* بطاقة الاقتراح الثانية (أفقية) */}
        <View className="mb-4 flex-row gap-4 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <View className="h-24 w-24 items-center justify-center rounded-lg bg-brand-100 dark:bg-neutral-700">
            <MaterialIcons name="image" size={32} color={passengerPurple[400]} />
          </View>
          <View className="flex-1 justify-between">
            <View>
              <Text className="font-plex-bold text-base text-brand-700 dark:text-brand-200">
                ردهة "إيقاع" الثقافية
              </Text>
              <Text className="font-plex-medium text-xs text-neutral-500 dark:text-neutral-400">
                مساحة عمل هادئة وراقية
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="font-plex-bold text-sm text-brand-700 dark:text-brand-200">
                35 ر.س
              </Text>
              <MaterialIcons name="arrow-back" size={22} color={passengerPurple[700]} />
            </View>
          </View>
        </View>

        {/* بطاقتا شبكة صغيرتان */}
        <View className="flex-row gap-4">
          {[
            { name: 'جاليري أمانة', time: '25 دقيقة', price: '55 ر.س' },
            { name: 'تراس الأفق', time: '10 دقائق', price: '30 ر.س' },
          ].map((item) => (
            <View
              key={item.name}
              className="flex-1 rounded-2xl border border-brand-100 bg-white p-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              <View className="mb-2 h-24 items-center justify-center rounded-lg bg-brand-100 dark:bg-neutral-700">
                <MaterialIcons name="image" size={28} color={passengerPurple[400]} />
              </View>
              <Text className="mb-1 font-plex-bold text-xs text-brand-700 dark:text-brand-200">
                {item.name}
              </Text>
              <View className="flex-row items-center justify-between">
                <Text className="font-plex-medium text-xs text-neutral-500 dark:text-neutral-400">
                  {item.time}
                </Text>
                <Text className="font-plex-bold text-xs text-brand-700 dark:text-brand-200">
                  {item.price}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}
