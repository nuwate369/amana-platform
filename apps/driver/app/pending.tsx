import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';

/**
 * شاشة «طلبك قيد المراجعة» (Pending Review) — تحويل مطابق لتصميم Stitch
 * للسائقة، بلوحة اللون الأزرق الداكن (navy) وخط IBM Plex Sans Arabic.
 * تُعرض عندما تكون حالة السائقة قيد المراجعة. بيانات ثابتة بلا منطق أعمال.
 */
export default function Pending() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-16 flex-row items-center justify-between border-b border-neutral-200 px-5 dark:border-neutral-800">
        <Text className="font-plex-bold text-2xl text-neutral-900 dark:text-neutral-50">أمانة</Text>
        <View className="h-10 w-10 items-center justify-center rounded-full">
          <MaterialIcons name="notifications" size={22} color={driverNavy[700]} />
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 24, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {/* الرسم التوضيحي للتحقق */}
        <View className="mb-8 mt-4 items-center">
          <View className="h-48 w-48 items-center justify-center">
            {/* حلقة زخرفية متقطعة */}
            <View className="absolute h-48 w-48 rounded-full border-4 border-dashed border-brand-200 dark:border-brand-700" />
            {/* بطاقة الرسم الرئيسية (بديل عن الصورة البعيدة) */}
            <View className="h-40 w-40 items-center justify-center rounded-full bg-white shadow-xl dark:bg-neutral-800">
              <View className="h-32 w-32 items-center justify-center rounded-full bg-brand-800">
                <MaterialIcons name="shield" size={72} color={driverNavy[100]} />
              </View>
              {/* شارة نابضة */}
              <View className="absolute -bottom-1 -right-1 items-center justify-center rounded-full border-4 border-white bg-brand-600 p-3 dark:border-neutral-900">
                <MaterialIcons name="verified-user" size={24} color="#ffffff" />
              </View>
            </View>
          </View>
        </View>

        {/* النص */}
        <View className="mb-8 max-w-md items-center gap-4 px-2">
          <Text className="text-center font-plex-bold text-3xl text-brand-700 dark:text-brand-100">
            طلبك قيد المراجعة
          </Text>
          <Text className="text-center font-plex text-lg leading-7 text-neutral-500 dark:text-neutral-400">
            شكراً لانضمامك إلى{' '}
            <Text className="font-plex-bold text-brand-700 dark:text-brand-200">أمانة</Text>. نقوم
            حالياً بالتحقق من بياناتك ومستنداتك لضمان أعلى معايير الأمان والاحترافية.
          </Text>
        </View>

        {/* بطاقات الخطوات */}
        <View className="w-full gap-4">
          {/* الخطوة 1: مكتملة */}
          <View className="flex-row items-center gap-4 rounded-xl border-r-4 border-r-brand-600 bg-white p-4 dark:bg-neutral-800">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-neutral-700">
              <MaterialIcons name="assignment-turned-in" size={22} color={driverNavy[700]} />
            </View>
            <View className="flex-1">
              <Text className="font-plex-semibold text-lg text-brand-700 dark:text-brand-200">
                اكتمال البيانات
              </Text>
              <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
                تم استلام جميع المستندات المطلوبة بنجاح
              </Text>
            </View>
          </View>

          {/* الخطوة 2: نشطة */}
          <View className="flex-row items-center gap-4 overflow-hidden rounded-xl bg-brand-800 p-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
              <MaterialIcons name="manage-search" size={22} color={driverNavy[800]} />
            </View>
            <View className="flex-1">
              <Text className="font-plex-semibold text-lg text-white">التدقيق الإداري</Text>
              <Text className="font-plex text-xs text-white/70">
                المراجعة جارية من قبل الإدارة المختصة
              </Text>
            </View>
          </View>
        </View>

        {/* مؤشر التقدم */}
        <View className="mt-8 w-full px-2">
          <View className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            <View className="h-full w-[75%] rounded-full bg-brand-600" />
          </View>
          <View className="mt-2 flex-row justify-between">
            <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">تم التقديم</Text>
            <Text className="font-plex-bold text-xs text-brand-700 dark:text-brand-200">
              في المراجعة النهائية
            </Text>
            <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">بدء العمل</Text>
          </View>
        </View>

        {/* منطقة الإجراء */}
        <View className="mt-8 w-full max-w-xs gap-4">
          <Pressable
            onPress={() => router.back()}
            className="h-14 flex-row items-center justify-center gap-2 rounded-xl bg-brand-900 px-8 active:scale-[0.98]"
          >
            <MaterialIcons name="support-agent" size={22} color="#ffffff" />
            <Text className="font-plex-semibold text-xl text-white">تواصل مع الدعم</Text>
          </Pressable>
          <Text className="px-4 text-center font-plex text-xs leading-5 text-neutral-500 dark:text-neutral-400">
            عادةً ما تستغرق عملية المراجعة من 24 إلى 48 ساعة عمل.
          </Text>
        </View>
      </ScrollView>

      {/* التذييل */}
      <View className="border-t border-neutral-200 bg-white py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Text className="text-center font-plex-medium text-sm text-neutral-500 dark:text-neutral-400">
          © 2024 منصة أمانة - رؤية 2030
        </Text>
      </View>
    </SafeAreaView>
  );
}
