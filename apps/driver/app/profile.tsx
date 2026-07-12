import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';

/**
 * شاشة «الملف الشخصي» للسائق — تحويل مطابق لتصميم Stitch
 * (Driver Profile Screen، مشروع Amanah Mobility Platform).
 * لوحة السائق كحلة أزرق داكن (Navy) والخط IBM Plex Sans Arabic.
 * البيانات ثابتة (mock) مطابقة للتصميم — بلا منطق أعمال.
 */

// بطاقة إحصائية.
function StatCard({
  icon,
  value,
  label,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View className="flex-1 gap-1 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
      <MaterialIcons name={icon} size={24} color={driverNavy[600]} />
      <Text className="mt-2 font-plex-bold text-[32px] text-brand-700 dark:text-brand-200">
        {value}
      </Text>
      <Text className="font-plex-medium text-sm text-neutral-500 dark:text-neutral-400">{label}</Text>
    </View>
  );
}

// صف إجراء ضمن قائمة الإجراءات.
function ActionRow({
  icon,
  label,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
}) {
  return (
    <Pressable className="mb-2 flex-row items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 active:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:active:bg-neutral-700">
      <View className="flex-row items-center gap-3">
        <MaterialIcons name={icon} size={24} color={driverNavy[600]} />
        <Text className="font-plex text-base text-neutral-900 dark:text-neutral-50">{label}</Text>
      </View>
      <MaterialIcons name="chevron-left" size={24} color="#9ca3af" />
    </Pressable>
  );
}

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-16 flex-row items-center justify-between border-b border-neutral-200 px-5 dark:border-neutral-800">
        <Text className="font-plex-bold text-2xl text-brand-700 dark:text-brand-200">أمانة</Text>
        <View className="flex-row items-center gap-4">
          <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800">
            <MaterialIcons name="notifications" size={24} color="#6b7280" />
          </Pressable>
          <View className="h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-brand-50 dark:border-neutral-700 dark:bg-neutral-800">
            <MaterialIcons name="person" size={18} color={driverNavy[600]} />
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* بطاقة الهوية */}
        <LinearGradient
          colors={[driverNavy[900], driverNavy[700]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ borderRadius: 16 }}
          className="mb-6 items-center overflow-hidden p-6"
        >
          <View className="relative mb-4">
            <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white/80 bg-brand-100">
              <MaterialIcons name="person" size={56} color={driverNavy[700]} />
            </View>
            <View className="absolute bottom-0 right-0 flex-row items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-0.5">
              <Text className="font-plex-bold text-sm text-brand-700">4.9</Text>
              <MaterialIcons name="star" size={16} color="#f59e0b" />
            </View>
          </View>
          <Text className="mb-1 font-plex-semibold text-2xl text-white">عبدالعزيز محمد العتيبي</Text>
          <Text className="font-plex text-base text-white/90">شريك سائق معتمد</Text>
          <Pressable className="mt-4 h-11 w-full flex-row items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 active:bg-white/20">
            <MaterialIcons name="edit" size={18} color="#ffffff" />
            <Text className="font-plex-medium text-sm text-white">تعديل الملف الشخصي</Text>
          </Pressable>
        </LinearGradient>

        {/* شبكة الإحصاءات */}
        <View className="mb-6 flex-row gap-3">
          <StatCard icon="speed" value="1,248" label="إجمالي الرحلات" />
          <StatCard icon="verified-user" value="3" label="سنوات الخبرة" />
        </View>

        {/* تفاصيل المركبة */}
        <View className="mb-6">
          <Text className="mb-4 px-1 font-plex-semibold text-xl text-neutral-900 dark:text-neutral-50">
            تفاصيل المركبة
          </Text>
          <View className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
            {/* صورة المركبة (بديل) */}
            <View className="h-32 justify-end bg-brand-100 p-4 dark:bg-neutral-700">
              <View className="absolute inset-0 items-center justify-center">
                <MaterialIcons name="directions-car" size={64} color={driverNavy[300]} />
              </View>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }}
              />
              <View>
                <Text className="font-plex-semibold text-xl text-white">لكزس ES 350</Text>
                <Text className="font-plex text-base text-white/80">فئة بلاتينيوم</Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center gap-3">
                <View className="rounded-lg bg-brand-50 p-2 dark:bg-neutral-700">
                  <MaterialIcons name="directions-car" size={24} color={driverNavy[600]} />
                </View>
                <View>
                  <Text className="font-plex-medium text-sm text-neutral-500 dark:text-neutral-400">
                    رقم اللوحة
                  </Text>
                  <Text className="font-plex-semibold text-lg tracking-widest text-brand-700 dark:text-brand-200">
                    أ ب ج ١٢٣٤
                  </Text>
                </View>
              </View>
              <View className="items-start">
                <Text className="font-plex-medium text-sm text-neutral-500 dark:text-neutral-400">
                  اللون
                </Text>
                <Text className="font-plex-bold text-base text-brand-700 dark:text-brand-200">
                  أبيض لؤلؤي
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* قائمة الإجراءات */}
        <View>
          <ActionRow icon="history" label="سجل الرحلات" />
          <ActionRow icon="account-balance-wallet" label="المحفظة والأرباح" />
          <ActionRow icon="settings" label="إعدادات الحساب" />
        </View>

        {/* تسجيل الخروج */}
        <View className="mt-8">
          <Pressable className="h-14 flex-row items-center justify-center gap-2 rounded-xl border border-red-200 active:bg-red-50 dark:border-red-900/40 dark:active:bg-red-900/20">
            <MaterialIcons name="logout" size={22} color="#dc2626" />
            <Text className="font-plex-semibold text-xl text-red-600">تسجيل الخروج</Text>
          </Pressable>
          <Text className="mt-4 text-center font-plex text-xs text-neutral-400">
            النسخة 2.4.0 • أمانة لخدمات النقل
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
