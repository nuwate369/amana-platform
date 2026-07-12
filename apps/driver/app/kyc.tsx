import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';

/**
 * شاشة «تحقق من الهوية» (Document Upload / KYC) — تحويل مطابق لتصميم Stitch
 * للسائقة، بلوحة اللون الأزرق الداكن (navy) وخط IBM Plex Sans Arabic.
 * بيانات ثابتة (mock) بلا منطق أعمال — أزرار الرفع لا تفتح منتقي ملفات فعلي.
 */

// خطوة في مؤشر التقدم.
function Step({
  icon,
  label,
  active,
  done,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  active?: boolean;
  done?: boolean;
}) {
  const filled = active || done;
  return (
    <View className="items-center">
      <View
        className={`h-10 w-10 items-center justify-center rounded-full ${
          filled ? 'bg-brand-700' : 'bg-neutral-200 dark:bg-neutral-700'
        }`}
      >
        <MaterialIcons name={icon} size={20} color={filled ? '#ffffff' : '#9ca3af'} />
      </View>
      <Text
        className={`mt-2 font-plex text-xs ${
          active
            ? 'font-plex-bold text-brand-700 dark:text-brand-200'
            : filled
              ? 'text-brand-700 dark:text-brand-200'
              : 'text-neutral-400'
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

export default function KycScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-16 flex-row items-center justify-between border-b border-neutral-200 px-5 dark:border-neutral-800">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <MaterialIcons name="arrow-forward" size={24} color={driverNavy[700]} />
        </Pressable>
        <Text className="font-plex-bold text-2xl text-brand-700 dark:text-brand-200">أمانة</Text>
        <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-100 dark:bg-neutral-800">
          <MaterialIcons name="notifications" size={18} color={driverNavy[700]} />
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* العنوان */}
        <View className="mb-8">
          <Text className="mb-2 font-plex-bold text-3xl text-brand-700 dark:text-brand-100">
            تحقق من الهوية
          </Text>
          <Text className="font-plex text-base leading-6 text-neutral-500 dark:text-neutral-400">
            يرجى تحميل المستندات المطلوبة لتفعيل حسابك كشريك سائق في أمانة.
          </Text>
        </View>

        {/* مؤشر التقدم */}
        <View className="mb-8 flex-row items-center justify-between px-2">
          <Step icon="person" label="المعلومات" done />
          <View className="mx-2 h-0.5 flex-1 bg-brand-700" />
          <Step icon="description" label="المستندات" active />
          <View className="mx-2 h-0.5 flex-1 bg-neutral-300 dark:bg-neutral-700" />
          <Step icon="fact-check" label="المراجعة" />
        </View>

        {/* قائمة المستندات */}
        <View className="gap-4">
          {/* المستند 1: قيد المراجعة */}
          <View className="flex-row items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
            <View className="flex-row items-center gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-neutral-700">
                <MaterialIcons name="badge" size={28} color={driverNavy[700]} />
              </View>
              <View className="items-end">
                <Text className="font-plex-semibold text-lg text-neutral-900 dark:text-neutral-50">
                  صورة الهوية الوطنية
                </Text>
                <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
                  يجب أن تكون سارية المفعول
                </Text>
              </View>
            </View>
            <View className="items-end gap-1">
              <View className="flex-row items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1">
                <MaterialIcons name="schedule" size={14} color="#b45309" />
                <Text className="font-plex-bold text-[11px] text-amber-700">قيد المراجعة</Text>
              </View>
              <Pressable>
                <Text className="font-plex-medium text-sm text-brand-700 dark:text-brand-300">
                  عرض المستند
                </Text>
              </Pressable>
            </View>
          </View>

          {/* المستند 2: مطلوب الرفع */}
          <View className="flex-row items-center justify-between rounded-xl border-2 border-dashed border-brand-300 bg-white p-4 dark:border-brand-700 dark:bg-neutral-800">
            <View className="flex-row items-center gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-neutral-700">
                <MaterialIcons name="directions-car" size={28} color={driverNavy[700]} />
              </View>
              <View className="items-end">
                <Text className="font-plex-semibold text-lg text-neutral-900 dark:text-neutral-50">
                  رخصة القيادة
                </Text>
                <Text className="font-plex text-xs text-red-600">مطلوب الرفع الآن</Text>
              </View>
            </View>
            <Pressable className="flex-row items-center gap-1 rounded-lg bg-brand-700 px-6 py-2 active:scale-95">
              <MaterialIcons name="file-upload" size={16} color="#ffffff" />
              <Text className="font-plex-medium text-sm text-white">رفع الآن</Text>
            </Pressable>
          </View>

          {/* المستند 3: مطلوب الرفع */}
          <View className="flex-row items-center justify-between rounded-xl border-2 border-dashed border-brand-300 bg-white p-4 dark:border-brand-700 dark:bg-neutral-800">
            <View className="flex-row items-center gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-neutral-700">
                <MaterialIcons name="assignment" size={28} color={driverNavy[700]} />
              </View>
              <View className="items-end">
                <Text className="font-plex-semibold text-lg text-neutral-900 dark:text-neutral-50">
                  استمارة السيارة
                </Text>
                <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
                  نسخة واضحة من الأمام
                </Text>
              </View>
            </View>
            <Pressable className="flex-row items-center gap-1 rounded-lg bg-brand-700 px-6 py-2 active:scale-95">
              <MaterialIcons name="file-upload" size={16} color="#ffffff" />
              <Text className="font-plex-medium text-sm text-white">رفع الآن</Text>
            </Pressable>
          </View>

          {/* بطاقة نصيحة التصوير */}
          <LinearGradient
            colors={[driverNavy[800], driverNavy[600]]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ borderRadius: 16 }}
            className="mt-2 overflow-hidden p-6"
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-2">
                <Text className="mb-1 font-plex-semibold text-lg text-white">نصيحة التصوير</Text>
                <Text className="max-w-[85%] font-plex text-xs leading-5 text-white/80">
                  تأكد من وضع المستند على سطح مستوٍ مع إضاءة جيدة وتجنب الانعكاسات لضمان القبول
                  السريع.
                </Text>
              </View>
              <MaterialIcons name="camera-enhance" size={72} color="rgba(255,255,255,0.25)" />
            </View>
          </LinearGradient>
        </View>

        {/* زر الإرسال */}
        <View className="mt-8">
          <Pressable
            onPress={() => router.push('/pending')}
            className="h-14 flex-row items-center justify-center gap-4 rounded-xl bg-brand-700 active:scale-[0.98] dark:bg-brand-600"
          >
            <Text className="font-plex-semibold text-xl text-white">إرسال للتدقيق</Text>
            <MaterialIcons name="send" size={22} color="#ffffff" />
          </Pressable>
          <Text className="mt-4 px-6 text-center font-plex text-xs leading-5 text-neutral-500 dark:text-neutral-400">
            بضغطك على إرسال، أنت توافق على معالجة بياناتك وفقاً لسياسة الخصوصية الخاصة بأمانة.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
