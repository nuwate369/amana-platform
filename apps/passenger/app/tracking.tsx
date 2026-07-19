import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';
import { AmanaMap, type AmanaMapHandle, type MapMarker } from '@amana/shared-ui/MapView';
import { supabase } from '@/lib/supabase';
import { getRide, haversineKm, type RideDetails } from '@/lib/rides';

/**
 * شاشة «تتبع الرحلة» — حقيقية: تعرض السائقة المطابَقة (لقطة على صفّ الرحلة) وموقعها
 * الحيّ على الخريطة، مع تقدير المسافة/الوقت. «وصلت» تُنهي الرحلة وتنتقل للتقييم.
 * الهوية أرجوانية وخط IBM Plex Sans Arabic.
 */

export default function TrackingScreen() {
  const { rideId } = useLocalSearchParams<{ rideId?: string }>();
  const mapRef = useRef<AmanaMapHandle>(null);
  const [ride, setRide] = useState<RideDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rideId) {
      router.replace('/(tabs)/home');
      return;
    }
    let alive = true;
    const refresh = () =>
      getRide(rideId).then((r) => {
        if (!alive) return;
        setRide(r);
        setLoading(false);
        if (!r) return;
        // الرحلة تقودها السائقة: إلغاء ⇒ الرئيسية؛ إنهاء ⇒ الانتقال التلقائي للتقييم.
        if (r.status === 'cancelled') {
          router.replace('/(tabs)/home');
        } else if (r.status === 'completed') {
          router.replace(`/rating?rideId=${rideId}${r.driverId ? `&driverId=${r.driverId}` : ''}`);
        }
      });
    refresh();
    const ch = supabase
      .channel(`track-${rideId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [rideId]);

  const markers = useMemo<MapMarker[]>(() => {
    if (!ride) return [];
    const m: MapMarker[] = [];
    if (ride.pickup) m.push({ id: 'pickup', ...ride.pickup, color: passengerPurple[600] });
    if (ride.dropoff) m.push({ id: 'dropoff', ...ride.dropoff, color: '#dc2626' });
    if (ride.driver) m.push({ id: 'driver', ...ride.driver, color: '#16a34a' });
    return m;
  }, [ride]);

  const kmRemaining = useMemo(() => {
    if (!ride) return 0;
    if (ride.driver && ride.dropoff) return haversineKm(ride.driver, ride.dropoff);
    if (ride.pickup && ride.dropoff) return haversineKm(ride.pickup, ride.dropoff);
    return 0;
  }, [ride]);
  const etaMin = Math.max(1, Math.round(kmRemaining / 0.5)); // ~30 كم/س

  // حالة الرحلة كما تقودها السائقة (الراكبة تُشاهد فقط).
  const statusText = !ride
    ? ''
    : ride.status === 'in_progress'
      ? 'الرحلة جارية إلى وجهتك'
      : ride.driverArrivedAt
        ? 'سائقتك وصلت — بانتظارك عند نقطة الالتقاط'
        : 'سائقتك في الطريق إليك';

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
        <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-200">تتبع الرحلة</Text>
        <View className="w-10" />
      </View>

      {/* الخريطة الحيّة */}
      <View className="relative flex-1 overflow-hidden">
        <AmanaMap ref={mapRef} style={{ flex: 1 }} showUserLocation={false} markers={markers} />
        <Pressable
          onPress={() => mapRef.current?.recenter()}
          style={{ elevation: 12, zIndex: 12 }}
          className="absolute bottom-6 right-5 h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg active:scale-95 dark:bg-neutral-800"
        >
          <MaterialIcons name="my-location" size={22} color={passengerPurple[700]} />
        </Pressable>
        <Pressable
          style={{ elevation: 12, zIndex: 12 }}
          className="absolute bottom-6 left-5 flex-row items-center gap-2 rounded-full bg-red-600 px-6 py-3 shadow-xl active:scale-90"
        >
          <MaterialIcons name="emergency" size={22} color="#ffffff" />
          <Text className="font-plex-bold text-xs tracking-widest text-white">SOS</Text>
        </Pressable>
      </View>

      {/* الورقة السفلية */}
      <View className="rounded-t-[32px] bg-white px-5 pb-8 pt-3 shadow-2xl dark:bg-neutral-800">
        <View className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-600" />

        {loading ? (
          <View className="items-center py-10">
            <ActivityIndicator color={passengerPurple[600]} />
          </View>
        ) : (
          <>
            {/* حالة الرحلة */}
            <View className="mb-6 flex-row items-start justify-between">
              <View>
                <Text className="mb-1 font-plex-medium text-xs tracking-wider text-neutral-400">
                  وقت الوصول المقدّر
                </Text>
                <View className="flex-row items-baseline gap-1">
                  <Text className="font-plex-semibold text-[26px] text-brand-700 dark:text-brand-300">{etaMin}</Text>
                  <Text className="font-plex text-sm text-brand-700 dark:text-brand-300">دقيقة</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="mb-1 font-plex-medium text-xs tracking-wider text-neutral-400">المسافة المتبقية</Text>
                <Text className="font-plex-semibold text-xl text-neutral-900 dark:text-neutral-100">
                  {kmRemaining.toFixed(1)} كم
                </Text>
              </View>
            </View>

            <View className="mb-6 h-px w-full bg-neutral-200 dark:bg-neutral-700" />

            {/* ملف السائقة (لقطة من صفّ الرحلة) */}
            <View className="mb-8 flex-row items-center justify-between gap-4">
              <View className="flex-row items-center gap-4">
                <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-2 border-brand-100 bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-700">
                  <MaterialIcons name="person" size={36} color={passengerPurple[400]} />
                </View>
                <View>
                  <Text className="mb-1 font-plex-semibold text-xl text-neutral-900 dark:text-neutral-50">
                    {ride?.driverName ?? 'سائقتك'}
                  </Text>
                  <Text className="font-plex-medium text-xs text-neutral-400">
                    {ride?.vehicle ?? 'مركبة أمانة'}
                  </Text>
                </View>
              </View>
              {ride?.plate ? (
                <View className="rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-1 dark:border-neutral-700 dark:bg-neutral-700">
                  <Text className="text-center font-plex-medium text-xs tracking-widest text-neutral-700 dark:text-neutral-200">
                    {ride.plate}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* أزرار الإجراءات */}
            <View className="flex-row gap-4">
              <Pressable className="h-14 flex-1 flex-row items-center justify-center gap-3 rounded-xl bg-brand-600 active:scale-95">
                <MaterialIcons name="call" size={22} color="#ffffff" />
                <Text className="font-plex-semibold text-base text-white">اتصال</Text>
              </Pressable>
              <Pressable className="h-14 flex-1 flex-row items-center justify-center gap-3 rounded-xl bg-brand-50 active:scale-95 dark:bg-brand-900/40">
                <MaterialIcons name="chat-bubble" size={22} color={passengerPurple[700]} />
                <Text className="font-plex-semibold text-base text-brand-700 dark:text-brand-200">مراسلة</Text>
              </Pressable>
            </View>

            {/* شريط حالة الرحلة (الراكبة تُشاهد فقط — السائقة تقود المراحل) */}
            <View className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-brand-50 py-3 dark:bg-brand-900/30">
              <MaterialIcons
                name={
                  ride?.status === 'in_progress'
                    ? 'navigation'
                    : ride?.driverArrivedAt
                      ? 'directions-walk'
                      : 'directions-car'
                }
                size={20}
                color={passengerPurple[700]}
              />
              <Text className="font-plex-semibold text-sm text-brand-700 dark:text-brand-200">
                {statusText}
              </Text>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
