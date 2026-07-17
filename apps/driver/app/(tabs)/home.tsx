import { MaterialIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Component, useMemo, useRef, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';
import { AmanaMap, type AmanaMapHandle, type MapMarker } from '@amana/shared-ui/MapView';
import { usePresence } from '@/lib/presence';
import { useNotifications } from '@/lib/notifications';
import { useDriverRides, type Coord, type DriverRide } from '@/lib/driver-rides';

/**
 * الشاشة الرئيسية للسائقة = خريطة القيادة الحيّة + التحكّم بالاتصال + استقبال طلبات
 * الرحلات (بطاقة طلب جديد عند الاتصال) وإدارة الرحلة النشطة (بدء/إنهاء).
 */

class MapBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function haversineKm(a: Coord, b: Coord): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 *
      Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180);
  return R * 2 * Math.asin(Math.min(1, Math.sqrt(s)));
}

function rideKm(r: DriverRide): string {
  return r.pickup && r.dropoff ? `${haversineKm(r.pickup, r.dropoff).toFixed(1)} كم` : '—';
}

export default function HomeScreen() {
  const mapRef = useRef<AmanaMapHandle>(null);
  const { online, busy, setOnline } = usePresence();
  const { unread } = useNotifications();
  const { incoming, active, busyId, accept, dismiss, startRide, completeRide } = useDriverRides();

  const request = !active && online ? incoming[0] : undefined;
  const target = active ?? request ?? null;

  const markers = useMemo<MapMarker[]>(() => {
    if (!target) return [];
    const m: MapMarker[] = [];
    if (target.pickup) m.push({ id: 'pickup', ...target.pickup, color: '#16a34a' });
    if (target.dropoff) m.push({ id: 'dropoff', ...target.dropoff, color: '#dc2626' });
    return m;
  }, [target]);

  const mapFallback = (
    <View className="flex-1 items-center justify-center gap-3 bg-neutral-100 px-8 dark:bg-neutral-900">
      <MaterialIcons name="map" size={56} color={driverNavy[400]} />
      <Text className="text-center font-plex-semibold text-base text-neutral-700 dark:text-neutral-200">
        الخريطة الحيّة تعمل في النسخة التطويرية
      </Text>
      <Text className="text-center font-plex text-sm leading-6 text-neutral-500 dark:text-neutral-400">
        Mapbox لا تُرسم داخل Expo Go — أنشئي نسخة تطويرية (dev build) لتظهر الخريطة.
      </Text>
    </View>
  );

  return (
    <View className="flex-1">
      <MapBoundary fallback={mapFallback}>
        <AmanaMap ref={mapRef} style={{ flex: 1 }} showUserLocation markers={markers} />
      </MapBoundary>

      {/* الشريط العلوي: الهوية + حالة الاتصال + مفتاح التبديل (يسار) */}
      <SafeAreaView edges={['top']} className="absolute inset-x-0 top-0" pointerEvents="box-none">
        <View className="mx-4 mt-2 flex-row items-center justify-between rounded-2xl bg-white/95 px-4 py-3 shadow-md dark:bg-neutral-900/95">
          <View className="items-end">
            <Text className="font-plex-bold text-base text-brand-700 dark:text-brand-200">أمانة</Text>
            <Text
              className={`font-plex text-xs ${online ? 'text-green-600 dark:text-green-400' : 'text-neutral-500 dark:text-neutral-400'}`}
            >
              {active ? 'رحلة جارية' : online ? 'متصلة — بانتظار الطلبات' : 'غير متصلة'}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            {busy && <ActivityIndicator size="small" color={driverNavy[500]} />}
            <Switch
              value={online}
              onValueChange={(v) => {
                if (!busy) void setOnline(v);
              }}
              disabled={busy}
              trackColor={{ false: '#d1d5db', true: '#16a34a' }}
              thumbColor="#ffffff"
              ios_backgroundColor="#d1d5db"
            />
            <Pressable
              onPress={() => router.push('/notifications' as Href)}
              className="relative h-9 w-9 items-center justify-center rounded-full active:bg-neutral-200/60 dark:active:bg-neutral-700/60"
            >
              <MaterialIcons name="notifications-none" size={24} color={driverNavy[600]} />
              {unread > 0 ? (
                <View className="absolute -right-0.5 -top-0.5 h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1">
                  <Text className="font-plex-bold text-[9px] text-white">{unread > 9 ? '9+' : unread}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* زر إعادة التمركز */}
      <Pressable
        onPress={() => mapRef.current?.recenter()}
        className={`absolute right-5 h-12 w-12 items-center justify-center rounded-full bg-white shadow-md active:scale-95 dark:bg-neutral-800 ${
          active || request ? 'bottom-52' : 'bottom-8'
        }`}
      >
        <MaterialIcons name="my-location" size={22} color={driverNavy[600]} />
      </Pressable>

      {/* بطاقة الرحلة النشطة */}
      {active ? (
        <View className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-5 pb-8 pt-4 shadow-2xl dark:bg-neutral-800">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="font-plex-bold text-lg text-neutral-900 dark:text-neutral-50">
              {active.passengerName ?? 'راكبة'}
            </Text>
            <Text className="font-plex-semibold text-base text-brand-700 dark:text-brand-300">
              {active.priceEstimate != null ? `${active.priceEstimate} ر.س` : ''}
            </Text>
          </View>
          <View className="mb-4 flex-row items-center gap-2">
            <MaterialIcons name="route" size={18} color={driverNavy[500]} />
            <Text className="font-plex text-sm text-neutral-600 dark:text-neutral-300">
              {active.status === 'matched' ? 'توجّهي إلى نقطة الالتقاط' : `المسافة ${rideKm(active)}`}
            </Text>
          </View>
          <Pressable
            onPress={() => (active.status === 'matched' ? void startRide() : void completeRide())}
            disabled={busyId === active.id}
            className={`h-14 flex-row items-center justify-center gap-2 rounded-2xl active:scale-[0.98] ${
              active.status === 'matched' ? 'bg-brand-700 dark:bg-brand-600' : 'bg-green-600'
            }`}
          >
            {busyId === active.id ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <MaterialIcons
                  name={active.status === 'matched' ? 'play-arrow' : 'flag'}
                  size={22}
                  color="#ffffff"
                />
                <Text className="font-plex-bold text-lg text-white">
                  {active.status === 'matched' ? 'بدء الرحلة' : 'إنهاء الرحلة'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      ) : request ? (
        /* بطاقة طلب رحلة جديد */
        <View className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-5 pb-8 pt-4 shadow-2xl dark:bg-neutral-800">
          <View className="mb-1 flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <Text className="font-plex-bold text-lg text-neutral-900 dark:text-neutral-50">طلب رحلة جديد</Text>
          </View>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-plex text-sm text-neutral-600 dark:text-neutral-300">
              {request.passengerName ?? 'راكبة'} · {rideKm(request)}
            </Text>
            <Text className="font-plex-semibold text-base text-brand-700 dark:text-brand-300">
              {request.priceEstimate != null ? `${request.priceEstimate} ر.س` : ''}
            </Text>
          </View>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => dismiss(request.id)}
              className="h-14 flex-1 items-center justify-center rounded-2xl border border-neutral-300 active:scale-[0.98] dark:border-neutral-600"
            >
              <Text className="font-plex-semibold text-base text-neutral-600 dark:text-neutral-300">تجاهل</Text>
            </Pressable>
            <Pressable
              onPress={() => void accept(request)}
              disabled={busyId === request.id}
              className="h-14 flex-[2] flex-row items-center justify-center gap-2 rounded-2xl bg-brand-700 active:scale-[0.98] dark:bg-brand-600"
            >
              {busyId === request.id ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={22} color="#ffffff" />
                  <Text className="font-plex-bold text-lg text-white">قبول</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
