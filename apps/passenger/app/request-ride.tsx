import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';
import { AmanaMap, type AmanaMapHandle, type MapMarker } from '@amana/shared-ui/MapView';
import { createRide, estimatePrice, haversineKm, type Coord } from '@/lib/rides';

/**
 * شاشة «تحديد الرحلة» — حقيقية: خريطة Mapbox، نقطة الانطلاق = الموقع الحالي،
 * والوجهة تُحدَّد بالضغط على الخريطة. يُحسب السعر من المسافة، وعند الطلب يُنشأ
 * صفّ رحلة (status=requested) في Supabase ثم ننتقل لشاشة المطابقة.
 * الهوية أرجوانية (لوحة الراكبة) وخط IBM Plex Sans Arabic.
 */

type RideType = {
  id: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  multiplier: number;
};

const RIDE_TYPES: RideType[] = [
  { id: 'standard', icon: 'directions-car', title: 'أمانة أساسية', subtitle: 'سيارة مريحة وحديثة', multiplier: 1 },
  { id: 'premium', icon: 'local-taxi', title: 'أمانة فخمة', subtitle: 'خدمة راقية وسيارات فارهة', multiplier: 1.8 },
  { id: 'group', icon: 'airport-shuttle', title: 'مجموعة نقل', subtitle: 'تتسع حتى ٦ أشخاص', multiplier: 1.5 },
];

export default function RequestRideScreen() {
  const mapRef = useRef<AmanaMapHandle>(null);
  const [pickup, setPickup] = useState<Coord | null>(null);
  const [dropoff, setDropoff] = useState<Coord | null>(null);
  const [selected, setSelected] = useState('standard');
  const [busy, setBusy] = useState(false);

  const km = useMemo(
    () => (pickup && dropoff ? haversineKm(pickup, dropoff) : 0),
    [pickup, dropoff],
  );

  const markers = useMemo<MapMarker[]>(() => {
    const m: MapMarker[] = [];
    if (pickup) m.push({ id: 'pickup', latitude: pickup.latitude, longitude: pickup.longitude, color: passengerPurple[600] });
    if (dropoff) m.push({ id: 'dropoff', latitude: dropoff.latitude, longitude: dropoff.longitude, color: '#dc2626' });
    return m;
  }, [pickup, dropoff]);

  const ready = Boolean(pickup && dropoff) && !busy;

  async function onRequest() {
    if (!pickup || !dropoff || busy) return;
    const type = RIDE_TYPES.find((t) => t.id === selected) ?? RIDE_TYPES[0];
    setBusy(true);
    const res = await createRide({
      pickup,
      dropoff,
      priceEstimate: estimatePrice(km, type.multiplier),
    });
    setBusy(false);
    if ('error' in res) {
      Alert.alert('تعذّر إنشاء الطلب', res.error);
      return;
    }
    router.push(`/matching?rideId=${res.id}`);
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-14 flex-row items-center justify-between px-5">
        <View className="w-10" />
        <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-200">تحديد الرحلة</Text>
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <MaterialIcons name="arrow-forward" size={24} color={passengerPurple[700]} />
        </Pressable>
      </View>

      {/* الخريطة الحيّة */}
      <View className="relative mx-5 mb-3 flex-1 overflow-hidden rounded-2xl">
        <AmanaMap
          ref={mapRef}
          style={{ flex: 1 }}
          showUserLocation
          markers={markers}
          onUserLocation={(c) => setPickup((prev) => prev ?? c)}
          onMapPress={(c) => setDropoff(c)}
        />

        {/* بطاقتا الموقع */}
        <View className="absolute left-3 right-3 top-3 gap-2" pointerEvents="none">
          <View className="flex-row items-center gap-3 rounded-xl bg-white/95 p-3 shadow dark:bg-neutral-800/95">
            <MaterialIcons name="radio-button-checked" size={18} color={passengerPurple[600]} />
            <View className="flex-1">
              <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">موقعي الحالي</Text>
              <Text className="font-plex-medium text-sm text-neutral-900 dark:text-neutral-50">
                {pickup ? 'تم تحديد موقعك' : 'جارٍ تحديد موقعك…'}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-3 rounded-xl bg-white/95 p-3 shadow dark:bg-neutral-800/95">
            <MaterialIcons name="location-on" size={18} color="#dc2626" />
            <View className="flex-1">
              <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">الوجهة</Text>
              <Text className="font-plex-medium text-sm text-neutral-900 dark:text-neutral-50">
                {dropoff ? `${km.toFixed(1)} كم` : 'اضغطي على الخريطة لتحديدها'}
              </Text>
            </View>
          </View>
        </View>

        {/* زر إعادة التمركز */}
        <Pressable
          onPress={() => mapRef.current?.recenter()}
          className="absolute bottom-3 right-3 h-11 w-11 items-center justify-center rounded-full bg-white shadow active:scale-95 dark:bg-neutral-800"
        >
          <MaterialIcons name="my-location" size={20} color={passengerPurple[700]} />
        </Pressable>
      </View>

      {/* بطاقة أنواع الرحلات + زر الطلب */}
      <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4 shadow-lg dark:bg-neutral-800">
        <ScrollView
          className="max-h-64"
          contentContainerStyle={{ paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="mb-3 font-plex-semibold text-lg text-neutral-900 dark:text-neutral-50">اختاري نوع الرحلة</Text>
          <View className="gap-2.5">
            {RIDE_TYPES.map((option) => {
              const isActive = selected === option.id;
              const price = km > 0 ? `${estimatePrice(km, option.multiplier)} ر.س` : '—';
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setSelected(option.id)}
                  className={`flex-row items-center justify-between rounded-xl border p-3.5 ${
                    isActive
                      ? 'border-2 border-brand-600 bg-brand-50 dark:bg-brand-900/40'
                      : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800'
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-11 w-14 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-700">
                      <MaterialIcons name={option.icon} size={24} color={passengerPurple[700]} />
                    </View>
                    <View>
                      <Text className="font-plex-semibold text-base text-neutral-900 dark:text-neutral-50">
                        {option.title}
                      </Text>
                      <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">{option.subtitle}</Text>
                    </View>
                  </View>
                  <Text className="font-plex-semibold text-base text-brand-700 dark:text-brand-300">{price}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <Pressable
          onPress={onRequest}
          disabled={!ready}
          className={`mt-4 h-14 flex-row items-center justify-center gap-2 rounded-xl active:scale-[0.98] ${
            ready ? 'bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-700'
          }`}
        >
          {busy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text className="font-plex-semibold text-xl text-white">
                {dropoff ? 'اطلبي الرحلة' : 'حدّدي وجهتك أولًا'}
              </Text>
              {dropoff && <MaterialIcons name="chevron-left" size={22} color="#ffffff" />}
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
