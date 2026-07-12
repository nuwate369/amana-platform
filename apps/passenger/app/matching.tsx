import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';

/**
 * شاشة «جاري البحث عن سائقة» — تحويل مطابق لتصميم Stitch
 * (Matching Driver Screen, مشروع Amanah Mobility Platform).
 * الألوان مطابقة للوحة الراكبة الأرجوانية والخط IBM Plex Sans Arabic.
 * منطقة الخريطة عنصر نائب (placeholder) — بلا مكتبات خرائط.
 * حلقات الرادار حركة نبضية عبر Animated. البيانات ثابتة (mock).
 */

// حلقة رادار نابضة واحدة (تتمدد وتتلاشى بشكل متكرر مع تأخير).
function RadarRing({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 3000,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 3] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <Animated.View
      style={{ transform: [{ scale }], opacity }}
      className="absolute h-40 w-40 rounded-full border-2 border-brand-500"
    />
  );
}

// صف تفصيلي صغير في بطاقة الحالة.
function DetailPill({ icon, label }: { icon: keyof typeof MaterialIcons.glyphMap; label: string }) {
  return (
    <View className="flex-1 flex-row items-center gap-3 rounded-lg bg-neutral-100 p-4 dark:bg-neutral-700/60">
      <MaterialIcons name={icon} size={20} color={passengerPurple[600]} />
      <Text className="font-plex-medium text-xs text-neutral-600 dark:text-neutral-300">{label}</Text>
    </View>
  );
}

export default function MatchingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-14 flex-row items-center justify-between px-5">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800">
          <MaterialIcons name="menu" size={26} color={passengerPurple[700]} />
        </Pressable>
        <Text className="font-plex-bold text-2xl text-brand-700 dark:text-brand-200">Amana</Text>
        <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800">
          <MaterialIcons name="notifications" size={24} color={passengerPurple[700]} />
        </Pressable>
      </View>

      {/* اللوحة الرئيسية: خريطة (عنصر نائب) + رادار بحث */}
      <View className="relative flex-1">
        {/* خلفية الخريطة */}
        <View className="absolute inset-0 items-center justify-center bg-neutral-100 dark:bg-neutral-800">
          <MaterialIcons name="map" size={64} color="#9ca3af" />
          <Text className="mt-2 font-plex-medium text-sm text-neutral-400">الخريطة</Text>
        </View>

        {/* طبقة الرادار في المنتصف */}
        <View className="absolute inset-0 items-center justify-center">
          <RadarRing delay={0} />
          <RadarRing delay={1000} />
          <RadarRing delay={2000} />
          {/* مؤشر موقع المستخدمة */}
          <View className="h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-brand-600 shadow-lg dark:border-neutral-900">
            <MaterialIcons name="person" size={28} color="#ffffff" />
          </View>
        </View>

        {/* لوحة الحالة والأزرار السفلية */}
        <View className="absolute bottom-0 left-0 right-0 gap-4 px-5 pb-8">
          {/* بطاقة الحالة */}
          <View className="rounded-2xl border border-white/50 bg-white/95 p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-800/95">
            <View className="mb-6 flex-row items-center gap-4">
              <LinearGradient
                colors={[passengerPurple[700], passengerPurple[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 9999 }}
                className="h-12 w-12 items-center justify-center overflow-hidden"
              >
                <MaterialIcons name="auto-awesome" size={22} color="#ffffff" />
              </LinearGradient>
              <View className="flex-1">
                <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-200">
                  جاري البحث عن سائقة
                </Text>
                <Text className="font-plex text-sm text-neutral-500 dark:text-neutral-400">
                  نقوم حالياً بالبحث عن أقرب رحلة آمنة لكِ...
                </Text>
              </View>
            </View>

            {/* مؤشرات الخطوات */}
            <View className="mb-6 flex-row items-center gap-2">
              <View className="h-1.5 flex-1 rounded-full bg-brand-600" />
              <View className="h-1.5 flex-1 rounded-full bg-brand-300" />
              <View className="h-1.5 flex-1 rounded-full bg-brand-100 dark:bg-neutral-700" />
            </View>

            {/* صف التفاصيل */}
            <View className="flex-row gap-4">
              <DetailPill icon="shield" label="أمان عالي" />
              <DetailPill icon="verified-user" label="سائقات معتمدات" />
            </View>
          </View>

          {/* أزرار الإجراءات */}
          <Pressable className="h-14 flex-row items-center justify-center gap-2 rounded-xl bg-brand-600 shadow-lg active:scale-95">
            <MaterialIcons name="share" size={22} color="#ffffff" />
            <Text className="font-plex-semibold text-base text-white">مشاركة تفاصيل الرحلة مع العائلة</Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            className="h-14 flex-row items-center justify-center gap-2 rounded-xl border border-red-500 active:scale-95 active:bg-red-50 dark:active:bg-red-900/20"
          >
            <MaterialIcons name="close" size={22} color="#ef4444" />
            <Text className="font-plex-semibold text-base text-red-500">إلغاء الطلب</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
