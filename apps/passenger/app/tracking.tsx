import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';

/**
 * شاشة «تتبع الرحلة» — تحويل مطابق لتصميم Stitch
 * (Live Tracking Screen, مشروع Amanah Mobility Platform)
 * الألوان مطابقة للوحة الراكبة الأرجوانية والخط IBM Plex Sans Arabic.
 * البيانات ثابتة (mock) مطابقة للتصميم — بلا منطق أعمال.
 * الخريطة الحيّة مستبدلة بعنصر نائب (native-only).
 */

// زر تحكّم دائري عائم فوق الخريطة.
function MapControl({ icon }: { icon: keyof typeof MaterialIcons.glyphMap }) {
  return (
    <Pressable className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg active:scale-95 dark:bg-neutral-800">
      <MaterialIcons name={icon} size={24} color={passengerPurple[700]} />
    </Pressable>
  );
}

export default function TrackingScreen() {
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
          تتبع الرحلة
        </Text>
        <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800">
          <MaterialIcons name="share" size={24} color={passengerPurple[700]} />
        </Pressable>
      </View>

      {/* منطقة الخريطة (عنصر نائب) */}
      <View className="relative flex-1 overflow-hidden">
        <View className="flex-1 items-center justify-center bg-neutral-100 dark:bg-neutral-800">
          <MaterialIcons name="map" size={64} color={passengerPurple[400]} />
          <Text className="mt-2 font-plex-medium text-sm text-neutral-500 dark:text-neutral-400">
            الخريطة الحيّة
          </Text>
        </View>

        {/* أزرار التحكّم العائمة */}
        <View className="absolute bottom-6 right-5 gap-4">
          <MapControl icon="my-location" />
          <MapControl icon="add" />
          <MapControl icon="remove" />
        </View>

        {/* زر الاستغاثة SOS */}
        <Pressable className="absolute bottom-6 left-5 flex-row items-center gap-2 rounded-full bg-red-600 px-6 py-3 shadow-xl active:scale-90">
          <MaterialIcons name="emergency" size={22} color="#ffffff" />
          <Text className="font-plex-bold text-xs tracking-widest text-white">SOS</Text>
        </Pressable>
      </View>

      {/* الورقة السفلية */}
      <View className="rounded-t-[32px] bg-white px-5 pb-8 pt-3 shadow-2xl dark:bg-neutral-800">
        {/* مقبض السحب */}
        <View className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-600" />

        {/* حالة الرحلة */}
        <View className="mb-6 flex-row items-start justify-between">
          <View>
            <Text className="mb-1 font-plex-medium text-xs tracking-wider text-neutral-400">
              وقت الوصول المقدر
            </Text>
            <View className="flex-row items-baseline gap-1">
              <Text className="font-plex-semibold text-[26px] text-brand-700 dark:text-brand-300">
                12
              </Text>
              <Text className="font-plex text-sm text-brand-700 dark:text-brand-300">دقيقة</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="mb-1 font-plex-medium text-xs tracking-wider text-neutral-400">
              المسافة المتبقية
            </Text>
            <Text className="font-plex-semibold text-xl text-neutral-900 dark:text-neutral-100">
              4.8 كم
            </Text>
          </View>
        </View>

        <View className="mb-6 h-px w-full bg-neutral-200 dark:bg-neutral-700" />

        {/* ملف السائقة */}
        <View className="mb-8 flex-row items-center justify-between gap-4">
          <View className="flex-row items-center gap-4">
            <View className="relative">
              <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-2 border-brand-100 bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-700">
                <MaterialIcons name="person" size={36} color={passengerPurple[400]} />
              </View>
              <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-brand-100 dark:border-neutral-800">
                <MaterialIcons name="verified" size={14} color={passengerPurple[700]} />
              </View>
            </View>
            <View>
              <Text className="mb-1 font-plex-semibold text-xl text-neutral-900 dark:text-neutral-50">
                سارة الكاظم
              </Text>
              <View className="flex-row items-center gap-1">
                <MaterialIcons name="star" size={18} color="#f59e0b" />
                <Text className="font-plex-medium text-xs text-neutral-900 dark:text-neutral-100">
                  4.9
                </Text>
                <Text className="mx-1 text-neutral-400">•</Text>
                <Text className="font-plex-medium text-xs text-neutral-400">Lexus ES 2023</Text>
              </View>
            </View>
          </View>
          <View className="rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-1 dark:border-neutral-700 dark:bg-neutral-700">
            <Text className="text-center font-plex-medium text-xs tracking-widest text-neutral-700 dark:text-neutral-200">
              أ ب ج ١٢٣٤
            </Text>
            <Text className="text-center font-plex text-[10px] text-neutral-400">1234 GBA</Text>
          </View>
        </View>

        {/* أزرار الإجراءات */}
        <View className="flex-row gap-4">
          <Pressable className="h-14 flex-1 flex-row items-center justify-center gap-3 rounded-xl bg-brand-600 active:scale-95">
            <MaterialIcons name="call" size={22} color="#ffffff" />
            <Text className="font-plex-semibold text-base text-white">اتصال</Text>
          </Pressable>
          <Pressable className="h-14 flex-1 flex-row items-center justify-center gap-3 rounded-xl bg-brand-50 active:scale-95 dark:bg-brand-900/40">
            <MaterialIcons name="chat-bubble" size={22} color={passengerPurple[700]} />
            <Text className="font-plex-semibold text-base text-brand-700 dark:text-brand-200">
              مراسلة
            </Text>
          </Pressable>
        </View>

        {/* شارة الرحلة المؤمّنة */}
        <View className="mt-6 flex-row items-center justify-center gap-2 rounded-full bg-neutral-100 py-3 dark:bg-neutral-700/50">
          <MaterialIcons name="security" size={20} color={passengerPurple[600]} />
          <Text className="font-plex-medium text-xs text-neutral-600 dark:text-neutral-300">
            رحلتك مؤمنة بالكامل مع أمانة
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
