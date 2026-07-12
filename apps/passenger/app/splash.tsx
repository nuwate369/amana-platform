import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';

/**
 * شاشة «البداية» (Splash) — تحويل مطابق لتصميم Stitch
 * (Splash Screen، مشروع Amanah Mobility Platform)
 * مع مطابقة الألوان للوحة الراكبة الأرجوانية والخط IBM Plex Sans Arabic.
 * محتوى ثابت مطابق للتصميم — بلا منطق أعمال.
 */
export default function SplashScreen() {
  return (
    <SafeAreaView className="flex-1 items-center justify-between bg-neutral-50 py-10 dark:bg-neutral-900">
      {/* مساحة علوية لتوسيط الشعار */}
      <View className="flex-1" />

      {/* قسم الشعار المركزي */}
      <View className="items-center gap-4">
        <View className="relative h-24 w-24 items-center justify-center">
          {/* الحلقة الخارجية */}
          <View className="absolute inset-0 scale-125 rounded-full border-2 border-brand-600 opacity-10" />
          {/* حاوية الدرع/الشعار */}
          <LinearGradient
            colors={[passengerPurple[700], passengerPurple[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 16, transform: [{ rotate: '3deg' }] }}
            className="h-20 w-20 items-center justify-center overflow-hidden shadow-lg"
          >
            <View style={{ transform: [{ rotate: '-3deg' }] }}>
              <MaterialIcons name="security" size={48} color="#ffffff" />
            </View>
          </LinearGradient>
        </View>

        <View className="items-center">
          <Text className="font-plex-bold text-[26px] leading-8 text-brand-700 dark:text-brand-200">
            أمانة
          </Text>
          <Text className="mt-1 font-plex text-sm text-neutral-500 opacity-80 dark:text-neutral-400">
            نقل آمن.. بخصوصية تامة
          </Text>
        </View>
      </View>

      {/* المحتوى السفلي */}
      <View className="flex-1 w-full items-center justify-end">
        {/* مؤشّر التحميل */}
        <View className="mb-10 h-1.5 w-12 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
          <View className="h-full w-1/2 rounded-full bg-brand-600" />
        </View>

        {/* سطر التذييل */}
        <View className="items-center gap-2">
          <Text className="font-plex-medium text-[11px] tracking-[3px] text-neutral-400 dark:text-neutral-500">
            POWERED BY VISION 2030
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
