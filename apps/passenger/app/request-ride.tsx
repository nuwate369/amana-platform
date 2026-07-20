import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';
import { AmanaMap, type AmanaMapHandle, type MapMarker } from '@amana/shared-ui/MapView';
import {
  RIDE_CLASSES,
  DEFAULT_RIDE_CLASS,
  getRideClass,
  type RideClassId,
} from '@amana/shared-types';
import { createRide, estimatePrice, haversineKm, type Coord } from '@/lib/rides';

/**
 * شاشة «تحديد الرحلة» — حقيقية: خريطة Mapbox، نقطة الانطلاق = الموقع الحالي،
 * والوجهة تُحدَّد بالضغط على الخريطة. يُحسب السعر من المسافة، وعند الطلب يُنشأ
 * صفّ رحلة (status=requested) في Supabase ثم ننتقل لشاشة المطابقة.
 * الهوية أرجوانية (لوحة الراكبة) وخط IBM Plex Sans Arabic.
 */

/** أيقونات الفئات — خاصّة بواجهة الراكبة؛ التسميات والمعاملات من المصدر المشترك. */
const CLASS_ICONS: Record<RideClassId, keyof typeof MaterialIcons.glyphMap> = {
  standard: 'directions-car',
  premium: 'local-taxi',
  group: 'airport-shuttle',
};

export default function RequestRideScreen() {
  const mapRef = useRef<AmanaMapHandle>(null);
  const insets = useSafeAreaInsets();
  const [pickup, setPickup] = useState<Coord | null>(null);
  const [dropoff, setDropoff] = useState<Coord | null>(null);
  const [selected, setSelected] = useState<RideClassId>(DEFAULT_RIDE_CLASS);
  const [busy, setBusy] = useState(false);
  // طلب سائقة بدون تحديد وجهة (تُحدَّد أثناء الرحلة؛ الأجرة بالعدّاد لاحقًا).
  const [noDestination, setNoDestination] = useState(false);

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

  const ready = Boolean(pickup && (dropoff || noDestination)) && !busy;

  async function onRequest() {
    if (!pickup || (!dropoff && !noDestination) || busy) return;
    const cls = getRideClass(selected);
    setBusy(true);
    const res = await createRide({
      pickup,
      dropoff: noDestination ? null : dropoff,
      priceEstimate: noDestination ? null : estimatePrice(km, cls.multiplier),
      requestedClass: selected,
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

        {/* بطاقة الموقع/الوجهة — مضغوطة سطرين لئلّا تحجب الخريطة */}
        <View className="absolute left-3 right-3 top-3" pointerEvents="none">
          <View className="rounded-xl bg-white/95 px-3 py-2 shadow dark:bg-neutral-800/95">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="radio-button-checked" size={15} color={passengerPurple[600]} />
              <Text
                numberOfLines={1}
                className="flex-1 font-plex-medium text-xs text-neutral-900 dark:text-neutral-50"
              >
                {pickup ? 'تم تحديد موقعك' : 'جارٍ تحديد موقعك…'}
              </Text>
            </View>
            <View className="my-1.5 h-px bg-neutral-200 dark:bg-neutral-700" />
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="location-on" size={15} color="#dc2626" />
              <Text
                numberOfLines={1}
                className="flex-1 font-plex-medium text-xs text-neutral-900 dark:text-neutral-50"
              >
                {noDestination
                  ? 'بدون وجهة محدّدة'
                  : dropoff
                    ? `الوجهة · ${km.toFixed(1)} كم`
                    : 'اضغطي على الخريطة لتحديد الوجهة'}
              </Text>
            </View>
          </View>
        </View>

        {/* زر إعادة التمركز */}
        <Pressable
          onPress={() => mapRef.current?.recenter()}
          style={{ elevation: 12, zIndex: 12 }}
          className="absolute bottom-3 right-3 h-11 w-11 items-center justify-center rounded-full bg-white shadow active:scale-95 dark:bg-neutral-800"
        >
          <MaterialIcons name="my-location" size={20} color={passengerPurple[700]} />
        </Pressable>
      </View>

      {/* الخيارات (خياران في كل صف) + زر الطلب */}
      <View
        className="rounded-t-3xl bg-white px-4 pt-3 shadow-lg dark:bg-neutral-800"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="flex-row flex-wrap justify-between gap-y-2.5">
          {/* بدون تحديد وجهة */}
          <Pressable
            onPress={() => setNoDestination((v) => !v)}
            className={`w-[48.5%] rounded-xl border p-3 ${
              noDestination
                ? 'border-2 border-brand-600 bg-brand-50 dark:bg-brand-900/40'
                : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800'
            }`}
          >
            <View className="h-6 flex-row items-center justify-between">
              <MaterialIcons name="location-off" size={20} color={passengerPurple[700]} />
              {noDestination ? (
                <MaterialIcons name="check-circle" size={16} color={passengerPurple[600]} />
              ) : null}
            </View>
            <Text className="mt-1 font-plex-semibold text-sm text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
              بدون وجهة
            </Text>
            <Text className="font-plex text-[10px] text-neutral-400" numberOfLines={1}>
              تحدّدينها بالطريق
            </Text>
          </Pressable>

          {/* الفئات */}
          {RIDE_CLASSES.map((option) => {
            const isActive = selected === option.id;
            const price = km > 0 && !noDestination ? `${estimatePrice(km, option.multiplier)} ر.س` : '—';
            return (
              <Pressable
                key={option.id}
                onPress={() => setSelected(option.id)}
                className={`w-[48.5%] rounded-xl border p-3 ${
                  isActive
                    ? 'border-2 border-brand-600 bg-brand-50 dark:bg-brand-900/40'
                    : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800'
                }`}
              >
                <View className="h-6 flex-row items-center justify-between">
                  <MaterialIcons name={CLASS_ICONS[option.id]} size={20} color={passengerPurple[700]} />
                  <Text className="font-plex-semibold text-xs text-brand-700 dark:text-brand-300">{price}</Text>
                </View>
                <Text
                  className="mt-1 font-plex-semibold text-sm text-neutral-900 dark:text-neutral-50"
                  numberOfLines={1}
                >
                  {option.labelAr}
                </Text>
                <Text className="font-plex text-[10px] text-neutral-400" numberOfLines={1}>
                  {option.subtitleAr}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={onRequest}
          disabled={!ready}
          className={`mt-3 h-14 flex-row items-center justify-center gap-2 rounded-xl active:scale-[0.98] ${
            ready ? 'bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-700'
          }`}
        >
          {busy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text className="font-plex-semibold text-xl text-white">
                {dropoff || noDestination ? 'اطلبي الرحلة' : 'حدّدي وجهتك أولًا'}
              </Text>
              {(dropoff || noDestination) && <MaterialIcons name="chevron-left" size={22} color="#ffffff" />}
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
