import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';

/**
 * شاشة «حالة الوثائق» (Document Status Management) — تحويل مطابق لتصميم Stitch
 * للسائقة، بلوحة اللون الأزرق الداكن (navy) وخط IBM Plex Sans Arabic.
 * بيانات ثابتة (mock) بلا منطق أعمال.
 */

export default function DocumentsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-16 flex-row items-center justify-between border-b border-neutral-200 px-5 dark:border-neutral-800">
        <Text className="font-plex-bold text-2xl text-brand-700 dark:text-brand-200">أمانة</Text>
        <View className="flex-row items-center gap-3">
          <Text className="font-plex-semibold text-xl text-neutral-900 dark:text-neutral-50">
            حالة الوثائق
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
          >
            <MaterialIcons name="arrow-forward" size={24} color={driverNavy[700]} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* نظرة عامة على الحالة */}
        <View className="mb-4 gap-4">
          {/* بطاقة حالة الحساب */}
          <View className="h-48 justify-between rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
            <View>
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="font-plex-medium text-sm text-neutral-500 dark:text-neutral-400">
                    حالة الحساب
                  </Text>
                  <Text className="mt-1 font-plex-bold text-2xl text-brand-700 dark:text-brand-200">
                    نشط جزئياً
                  </Text>
                </View>
                <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-100 dark:bg-neutral-700">
                  <MaterialIcons name="verified-user" size={24} color={driverNavy[700]} />
                </View>
              </View>
              <Text className="mt-2 max-w-xs font-plex text-sm text-neutral-500 dark:text-neutral-400">
                يرجى تحديث الوثائق المنتهية لضمان استمرار استقبال الطلبات.
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <View className="h-full w-[75%] rounded-full bg-brand-700" />
              </View>
              <Text className="font-plex-medium text-sm text-brand-700 dark:text-brand-200">75%</Text>
            </View>
          </View>

          {/* بطاقة التنبيه */}
          <View className="items-center justify-center gap-2 rounded-xl bg-brand-900 p-6">
            <MaterialIcons name="warning" size={48} color={driverNavy[200]} />
            <Text className="font-plex-semibold text-lg text-white">وثيقة واحدة</Text>
            <Text className="font-plex-medium text-sm text-white/70">تحتاج إلى إجراء فوري</Text>
          </View>
        </View>

        {/* قائمة الوثائق */}
        <Text className="px-2 pb-2 pt-4 font-plex-medium text-sm uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          قائمة الوثائق الرسمية
        </Text>

        <View className="gap-2">
          {/* وثيقة: سارية */}
          <View className="flex-row items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
            <View className="h-12 w-12 items-center justify-center rounded-lg bg-brand-100 dark:bg-neutral-700">
              <MaterialIcons name="badge" size={24} color={driverNavy[700]} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-start justify-between">
                <Text className="font-plex-bold text-lg text-neutral-900 dark:text-neutral-50">
                  الهوية الوطنية
                </Text>
                <View className="rounded-full border border-green-200 bg-green-100 px-2 py-0.5">
                  <Text className="font-plex-bold text-[10px] text-green-800">سارية</Text>
                </View>
              </View>
              <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
                تنتهي في: 12 ديسمبر 2025
              </Text>
            </View>
            <MaterialIcons name="visibility" size={22} color="#9ca3af" />
          </View>

          {/* وثيقة: تنتهي قريباً */}
          <View className="gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
            <View className="flex-row items-center gap-4">
              <View className="relative h-12 w-12 items-center justify-center rounded-lg bg-brand-100 dark:bg-neutral-700">
                <MaterialIcons name="directions-car" size={24} color={driverNavy[700]} />
                <View className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-600" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-start justify-between">
                  <Text className="font-plex-bold text-lg text-neutral-900 dark:text-neutral-50">
                    رخصة القيادة
                  </Text>
                  <View className="rounded-full border border-red-400 bg-red-100 px-2 py-0.5">
                    <Text className="font-plex-bold text-[10px] text-red-800">تنتهي قريباً</Text>
                  </View>
                </View>
                <Text className="font-plex-medium text-xs text-red-600">
                  تنتهي بعد 3 أيام (14 أكتوبر 2023)
                </Text>
              </View>
            </View>
            <Pressable className="flex-row items-center justify-center gap-2 rounded-lg bg-brand-700 py-2 active:scale-95">
              <MaterialIcons name="upload-file" size={16} color="#ffffff" />
              <Text className="font-plex-medium text-sm text-white">تحديث الوثيقة</Text>
            </Pressable>
          </View>

          {/* وثيقة: سارية */}
          <View className="flex-row items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
            <View className="h-12 w-12 items-center justify-center rounded-lg bg-brand-100 dark:bg-neutral-700">
              <MaterialIcons name="description" size={24} color={driverNavy[700]} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-start justify-between">
                <Text className="font-plex-bold text-lg text-neutral-900 dark:text-neutral-50">
                  استمارة السيارة
                </Text>
                <View className="rounded-full border border-green-200 bg-green-100 px-2 py-0.5">
                  <Text className="font-plex-bold text-[10px] text-green-800">سارية</Text>
                </View>
              </View>
              <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
                تنتهي في: 05 مايو 2024
              </Text>
            </View>
            <MaterialIcons name="visibility" size={22} color="#9ca3af" />
          </View>

          {/* وثيقة: منتهية */}
          <View className="gap-4 rounded-xl border border-neutral-200 bg-white p-4 opacity-80 dark:border-neutral-700 dark:bg-neutral-800">
            <View className="flex-row items-center gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-700">
                <MaterialIcons name="policy" size={24} color="#9ca3af" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-start justify-between">
                  <Text className="font-plex-bold text-lg text-neutral-900 dark:text-neutral-50">
                    وثيقة التأمين
                  </Text>
                  <View className="rounded-full bg-neutral-500 px-2 py-0.5">
                    <Text className="font-plex-bold text-[10px] text-white">منتهية</Text>
                  </View>
                </View>
                <Text className="font-plex text-xs text-red-600">انتهت في 01 أكتوبر 2023</Text>
              </View>
            </View>
            <Pressable className="flex-row items-center justify-center gap-2 rounded-lg border-2 border-brand-700 py-2 active:scale-95">
              <MaterialIcons name="sync" size={16} color={driverNavy[700]} />
              <Text className="font-plex-medium text-sm text-brand-700 dark:text-brand-300">
                تجديد الوثيقة
              </Text>
            </Pressable>
          </View>
        </View>

        {/* بطاقة الأمان */}
        <View className="mt-8 items-center overflow-hidden rounded-2xl border border-neutral-200 bg-brand-50 p-6 dark:border-neutral-700 dark:bg-neutral-800">
          <MaterialIcons name="security" size={64} color={driverNavy[700]} />
          <Text className="mt-4 font-plex-semibold text-lg text-neutral-900 dark:text-neutral-50">
            بياناتك في أمان
          </Text>
          <Text className="mt-2 text-center font-plex text-sm leading-6 text-neutral-500 dark:text-neutral-400">
            نحن نستخدم أعلى معايير التشفير لحماية وثائقك ومعلوماتك الشخصية وفقاً للأنظمة المحلية.
          </Text>
        </View>
      </ScrollView>

      {/* الشريط السفلي للتنقل */}
      <View className="flex-row-reverse items-center justify-around border-t border-neutral-200 bg-white px-4 pb-6 pt-2 dark:border-neutral-800 dark:bg-neutral-800">
        <View className="items-center gap-1 p-2">
          <MaterialIcons name="home" size={24} color="#9ca3af" />
          <Text className="font-plex-medium text-xs text-neutral-500 dark:text-neutral-400">
            الرئيسية
          </Text>
        </View>
        <View className="items-center gap-1 p-2">
          <MaterialIcons name="payments" size={24} color="#9ca3af" />
          <Text className="font-plex-medium text-xs text-neutral-500 dark:text-neutral-400">
            الأرباح
          </Text>
        </View>
        <View className="items-center gap-1 p-2">
          <MaterialIcons name="history" size={24} color="#9ca3af" />
          <Text className="font-plex-medium text-xs text-neutral-500 dark:text-neutral-400">
            الرحلات
          </Text>
        </View>
        <View className="items-center gap-1 p-2">
          <MaterialIcons name="person" size={24} color={driverNavy[700]} />
          <Text className="font-plex-bold text-xs text-brand-700 dark:text-brand-200">الملف</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
