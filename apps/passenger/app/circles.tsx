import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';

/**
 * شاشة «المجموعات المغلقة» — تحويل مطابق لتصميم Stitch (Closed Circles Screen).
 * إنشاء/الانضمام إلى مجموعة نقل مغلقة مع الزميلات بخصوصية تامة.
 * الألوان مطابقة للوحة الراكبة الأرجوانية، والخط IBM Plex Sans Arabic.
 * البيانات ثابتة (mock) — بلا منطق أعمال.
 */

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
          المجموعات
        </Text>
      </View>
      <View className="items-center">
        <MaterialIcons name="person" size={24} color="#9ca3af" />
        <Text className="font-plex-medium text-[11px] text-neutral-400">الملف الشخصي</Text>
      </View>
    </View>
  );
}

// دائرة صورة عضوة (نائبة).
function MemberDot({ overlap }: { overlap?: boolean }) {
  return (
    <View
      className={`h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-100 dark:border-neutral-800 dark:bg-neutral-700 ${
        overlap ? '-ml-3' : ''
      }`}
    >
      <MaterialIcons name="person" size={16} color={passengerPurple[500]} />
    </View>
  );
}

export default function CirclesScreen() {
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
          المجموعات المغلقة
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
        {/* بطاقة الترحيب والإجراء بتدرّج لوني */}
        <LinearGradient
          colors={[passengerPurple[700], passengerPurple[500]]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ borderRadius: 16 }}
          className="mb-4 overflow-hidden p-6"
        >
          <Text className="mb-2 font-plex-semibold text-xl text-white">أنشئي دائرتك الآمنة</Text>
          <Text className="mb-4 font-plex text-sm leading-6 text-white/90">
            شاركي رحلاتك مع زميلات العمل أو الصديقات بخصوصية تامة.
          </Text>
          <Pressable className="flex-row items-center gap-2 self-start rounded-full bg-white px-6 py-2 active:opacity-90">
            <MaterialIcons name="add-circle" size={18} color={passengerPurple[700]} />
            <Text className="font-plex-medium text-xs text-brand-700">إنشاء مجموعة جديدة</Text>
          </Pressable>
        </LinearGradient>

        {/* بطاقتا إجراء */}
        <View className="mb-6 flex-row gap-4">
          <Pressable className="flex-1 rounded-2xl border border-brand-100 bg-white p-4 active:border-brand-500 dark:border-neutral-700 dark:bg-neutral-800">
            <MaterialIcons name="group-add" size={30} color={passengerPurple[700]} />
            <Text className="mt-2 font-plex-bold text-xs text-brand-700 dark:text-brand-200">
              انضمام بكود
            </Text>
          </Pressable>
          <Pressable className="flex-1 rounded-2xl border border-brand-100 bg-white p-4 active:border-brand-500 dark:border-neutral-700 dark:bg-neutral-800">
            <MaterialIcons name="security" size={30} color={passengerPurple[700]} />
            <Text className="mt-2 font-plex-bold text-xs text-brand-700 dark:text-brand-200">
              إعدادات الخصوصية
            </Text>
          </Pressable>
        </View>

        {/* المجموعات الحالية */}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="font-plex-semibold text-xl text-neutral-900 dark:text-neutral-50">
            مجموعاتك الحالية
          </Text>
          <Text className="font-plex-medium text-xs text-brand-600 dark:text-brand-300">
            عرض الكل
          </Text>
        </View>

        {/* بطاقة المجموعة الأولى */}
        <View className="mb-4 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <View className="mb-4 flex-row items-start justify-between">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-lg bg-brand-100 dark:bg-neutral-700">
                <MaterialIcons name="groups" size={26} color={passengerPurple[600]} />
              </View>
              <View>
                <Text className="font-plex-semibold text-base text-brand-700 dark:text-brand-200">
                  زميلات العمل (المقر الرئيسي)
                </Text>
                <Text className="font-plex text-sm text-neutral-500 dark:text-neutral-400">
                  12 عضوة • 3 رحلات نشطة
                </Text>
              </View>
            </View>
            <MaterialIcons name="more-vert" size={22} color="#9ca3af" />
          </View>

          {/* قائمة العضوات */}
          <View className="mb-4 flex-row-reverse items-center justify-end">
            <View className="-ml-3 h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-200 dark:border-neutral-800">
              <Text className="font-plex-medium text-[11px] text-brand-700">9+</Text>
            </View>
            <MemberDot overlap />
            <MemberDot overlap />
            <MemberDot />
          </View>

          {/* مؤشر الرحلة الجارية */}
          <View className="flex-row items-center justify-between rounded-lg bg-neutral-100 p-3 dark:bg-neutral-900">
            <View className="flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-full bg-brand-600" />
              <Text className="font-plex-medium text-xs text-brand-700 dark:text-brand-200">
                رحلة جارية الآن
              </Text>
            </View>
            <Pressable className="rounded-full bg-brand-600 px-4 py-1.5 active:opacity-90">
              <Text className="font-plex-medium text-xs text-white">متابعة الموقع</Text>
            </Pressable>
          </View>
        </View>

        {/* بطاقة المجموعة الثانية */}
        <View className="mb-6 flex-row items-center justify-between rounded-2xl border border-brand-100 bg-white p-4 opacity-90 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-lg bg-brand-100 dark:bg-neutral-700">
              <MaterialIcons name="school" size={24} color={passengerPurple[500]} />
            </View>
            <View>
              <Text className="font-plex-semibold text-base text-neutral-900 dark:text-neutral-50">
                صديقات الجامعة
              </Text>
              <Text className="font-plex text-sm text-neutral-500 dark:text-neutral-400">
                5 عضوات • لا يوجد رحلات
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-left" size={22} color="#9ca3af" />
        </View>

        {/* قسم الخصوصية والثقة */}
        <View className="rounded-2xl border border-dashed border-brand-200 bg-brand-50 p-6 dark:border-neutral-700 dark:bg-brand-900/30">
          <View className="flex-row items-start gap-4">
            <MaterialIcons name="verified-user" size={30} color={passengerPurple[600]} />
            <View className="flex-1">
              <Text className="mb-1 font-plex-semibold text-base text-brand-700 dark:text-brand-300">
                خصوصيتك أولويتنا
              </Text>
              <Text className="font-plex text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                في المجموعات المغلقة، لا تظهر رحلاتك إلا للمشتركات في المجموعة فقط. جميع بيانات الموقع
                مشفرة ومؤمنة تماماً.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* زر عائم للإنشاء/الانضمام */}
      <Pressable className="absolute bottom-28 left-6 h-14 w-14 items-center justify-center rounded-full bg-brand-600 shadow-lg active:scale-90">
        <MaterialIcons name="add" size={30} color="#ffffff" />
      </Pressable>

      <BottomNav />
    </SafeAreaView>
  );
}
