import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View, BackHandler, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';
import { supabase } from '@/lib/supabase';
import { cancelRide } from '@/lib/rides';

/**
 * شاشة «جاري البحث عن سائقة» — حقيقية: تراقب صفّ الرحلة عبر Realtime. عند قبول
 * سائقة (status=matched) ننتقل للتتبّع؛ وإن أُلغيت نعود للرئيسية. زرّ الإلغاء
 * يضبط الحالة cancelled. الهوية أرجوانية وخط IBM Plex Sans Arabic.
 */

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
      }),
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

function DetailPill({ icon, label }: { icon: keyof typeof MaterialIcons.glyphMap; label: string }) {
  return (
    <View className="flex-1 flex-row items-center gap-3 rounded-lg bg-neutral-100 p-4 dark:bg-neutral-700/60">
      <MaterialIcons name={icon} size={20} color={passengerPurple[600]} />
      <Text className="font-plex-medium text-xs text-neutral-600 dark:text-neutral-300">{label}</Text>
    </View>
  );
}

export default function MatchingScreen() {
  const { rideId } = useLocalSearchParams<{ rideId?: string }>();

  useEffect(() => {
    if (!rideId) {
      router.replace('/(tabs)/home');
      return;
    }

    const handleStatus = (status: string | null) => {
      // كل حالة نشطة بعد المطابقة تعني أنّ هناك سائقة — فالمكان الصحيح هو
      // شاشة التتبّع. تركُ `arrived` بلا فرع كان يُبقي الراكبة على شاشة
      // «جارٍ البحث» وسائقتها تنتظرها بالأسفل.
      if (status === 'matched' || status === 'arrived' || status === 'in_progress') {
        router.replace(`/tracking?rideId=${rideId}`);
      } else if (status === 'cancelled' || status === 'completed' || status === 'no_show') {
        router.replace('/(tabs)/home');
      }
    };

    // فحص أوّليّ (قد تُقبل قبل تفعيل الاشتراك).
    supabase
      .from('rides')
      .select('status')
      .eq('id', rideId)
      .single()
      .then(({ data }) => handleStatus(data?.status ?? null));

    const channel = supabase
      .channel(`ride-${rideId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
        (payload) => handleStatus((payload.new as { status?: string }).status ?? null),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId]);

  async function onCancel() {
    if (rideId) await cancelRide(rideId);
    router.replace('/(tabs)/home');
  }

  // اعتراض زر الرجوع (Hardware Back Button) لمنع الراكب من ترك الشاشة والطلب معلّق
  useEffect(() => {
    const backAction = () => {
      Alert.alert('إلغاء الطلب', 'هل أنتِ متأكدة من إلغاء هذا الطلب والعودة للرئيسية؟', [
        { text: 'تراجع', style: 'cancel' },
        { text: 'نعم، إلغاء', style: 'destructive', onPress: onCancel },
      ]);
      return true; // منع الإجراء الافتراضي (العودة)
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [rideId]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      <View className="h-14 flex-row items-center justify-between px-5">
        <View className="w-10" />
        <Text className="font-plex-bold text-2xl text-brand-700 dark:text-brand-200">Amana</Text>
        <View className="w-10" />
      </View>

      <View className="relative flex-1">
        <View className="absolute inset-0 items-center justify-center bg-neutral-100 dark:bg-neutral-800">
          <MaterialIcons name="radar" size={64} color="#9ca3af" />
        </View>

        <View className="absolute inset-0 items-center justify-center">
          <RadarRing delay={0} />
          <RadarRing delay={1000} />
          <RadarRing delay={2000} />
          <View className="h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-brand-600 shadow-lg dark:border-neutral-900">
            <MaterialIcons name="person" size={28} color="#ffffff" />
          </View>
        </View>

        <View className="absolute bottom-0 left-0 right-0 gap-5 px-5 pb-8">
          <View className="rounded-[32px] border border-white/50 bg-white/95 p-6 shadow-pop dark:border-neutral-700 dark:bg-neutral-800/95">
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
                  نبحث عن أقرب سائقة متصلة لكِ الآن…
                </Text>
              </View>
            </View>

            <View className="mb-6 flex-row items-center gap-2">
              <View className="h-2 flex-1 rounded-full bg-brand-600" />
              <View className="h-2 flex-1 rounded-full bg-brand-300" />
              <View className="h-2 flex-1 rounded-full bg-brand-100 dark:bg-neutral-700" />
            </View>

            <View className="flex-row gap-4">
              <DetailPill icon="shield" label="أمان عالي" />
              <DetailPill icon="verified-user" label="سائقات معتمدات" />
            </View>
          </View>

          <Pressable
            onPress={onCancel}
            className="h-14 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-red-500 bg-white/80 shadow-sm active:scale-95 active:bg-red-50 dark:bg-neutral-900/80 dark:active:bg-red-900/20"
          >
            <MaterialIcons name="close" size={22} color="#ef4444" />
            <Text className="font-plex-bold text-base text-red-500">إلغاء الطلب</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
