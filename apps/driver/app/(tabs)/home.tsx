import { MaterialIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';
import { AmanaMap, type AmanaMapHandle, type MapMarker } from '@amana/shared-ui/MapView';
import { rideClassLabel } from '@amana/shared-types';
import { supabase } from '@/lib/supabase';
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
  const { incoming, active, busyId, accept, dismiss, markArrived, startRide, completeRide } =
    useDriverRides();

  const request = !active && online ? incoming[0] : undefined;
  const target = active ?? request ?? null;

  // مرحلة الرحلة النشطة تقود زرّ الإجراء: وصول لنقطة الالتقاط ← بدء ← إنهاء.
  const phase: 'arrive' | 'start' | 'complete' | null = !active
    ? null
    : active.status === 'in_progress'
      ? 'complete'
      : active.arrivedAt
        ? 'start'
        : 'arrive';

  // بعد إنهاء الرحلة ننتظر اكتمال دفع الراكبة، ثم تظهر بطاقة «قيّمي الراكبة».
  const [awaitingRating, setAwaitingRating] = useState<{
    rideId: string;
    passengerId: string | null;
    passengerName: string | null;
    paid: boolean;
  } | null>(null);

  async function handleComplete() {
    if (!active) return;
    const info = {
      rideId: active.id,
      passengerId: active.passengerId,
      passengerName: active.passengerName,
      paid: false,
    };
    await completeRide();
    setAwaitingRating(info); // لا ننتقل للتقييم الآن — ننتظر الدفع
  }

  // مراقبة اكتمال الدفع (paid_at) للرحلة المنتهية → تفعيل بطاقة التقييم.
  useEffect(() => {
    if (!awaitingRating || awaitingRating.paid) return;
    const rid = awaitingRating.rideId;
    const check = async () => {
      const { data } = await supabase.from('rides').select('paid_at').eq('id', rid).maybeSingle();
      if (data?.paid_at) {
        setAwaitingRating((prev) => (prev && prev.rideId === rid ? { ...prev, paid: true } : prev));
      }
    };
    void check();
    const ch = supabase
      .channel(`await-pay-${rid}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rid}` },
        () => void check(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [awaitingRating]);

  function openPassengerRating() {
    const a = awaitingRating;
    setAwaitingRating(null);
    if (a) router.push(`/rating?rideId=${a.rideId}&passengerId=${a.passengerId ?? ''}` as Href);
  }

  const PHASE_UI = {
    arrive: { label: 'وصلت لنقطة الالتقاط', hint: 'توجّهي إلى نقطة الالتقاط', icon: 'my-location' as const, cls: 'bg-brand-700 dark:bg-brand-600', run: markArrived },
    start: { label: 'بدء الرحلة', hint: 'بانتظار ركوب الراكبة', icon: 'play-arrow' as const, cls: 'bg-brand-700 dark:bg-brand-600', run: startRide },
    complete: { label: 'إنهاء الرحلة', hint: '', icon: 'flag' as const, cls: 'bg-green-600', run: handleComplete },
  };

  const markers = useMemo<MapMarker[]>(() => {
    if (!target) return [];
    const m: MapMarker[] = [];
    if (target.pickup) m.push({ id: 'pickup', ...target.pickup, color: '#16a34a', kind: 'pickup' });
    if (target.dropoff) m.push({ id: 'dropoff', ...target.dropoff, color: '#dc2626', kind: 'dropoff' });
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
        <AmanaMap
          ref={mapRef}
          style={{ flex: 1 }}
          showUserLocation
          markers={markers}
          routeFrom={target?.pickup ?? null}
          routeTo={target?.dropoff ?? null}
        />
      </MapBoundary>

      {/* الشريط العلوي: الهوية + حالة الاتصال + مفتاح التبديل (يسار) */}
      {/* بدون box-none: يجب أن يكون الشريط طبقة لمس صلبة تلتقط اللمسة قبل خريطة
          Mapbox الأصلية تحته، وإلا تسرّبت لمسة الجرس (JS) للخريطة فتُكبّرها على أندرويد.
          الشريط رفيع في الأعلى فلا يُعيق تحريك الخريطة عمليًّا. */}
      <SafeAreaView
        edges={['top']}
        className="absolute inset-x-0 top-0"
        style={{ zIndex: 20, elevation: 20 }}
      >
        <View
          className="mx-4 mt-2 flex-row items-center justify-between rounded-2xl bg-white/95 px-4 py-3 shadow-md dark:bg-neutral-900/95"
          style={{ elevation: 12 }}
        >
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
              value={active ? true : online}
              onValueChange={(v) => {
                if (!busy && !active) void setOnline(v);
              }}
              disabled={busy || !!active}
              trackColor={{ false: '#d1d5db', true: '#16a34a' }}
              thumbColor="#ffffff"
              ios_backgroundColor="#d1d5db"
            />
            <Pressable
              onPress={() => router.push('/notifications' as Href)}
              hitSlop={8}
              style={{ elevation: 24, zIndex: 24 }}
              className="relative h-9 w-9 items-center justify-center rounded-full bg-brand-50 active:bg-neutral-200 dark:bg-brand-900/40 dark:active:bg-neutral-700"
            >
              <MaterialIcons name="notifications-none" size={24} color={driverNavy[600]} />
              {unread > 0 ? (
                <View className="absolute -right-0.5 -top-0.5 h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1">
                  <Text className="font-plex-bold text-[9px] text-white">{unread > 9 ? '9+' : unread}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/account' as Href)}
              style={{ elevation: 24, zIndex: 24 }}
              className="h-9 w-9 items-center justify-center rounded-full bg-brand-50 active:bg-neutral-200/60 dark:bg-brand-900/40"
            >
              <MaterialIcons name="person" size={20} color={driverNavy[600]} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* زر إعادة التمركز */}
      <Pressable
        onPress={() => mapRef.current?.recenter()}
        style={{ elevation: 12, zIndex: 12 }}
        className={`absolute right-5 h-12 w-12 items-center justify-center rounded-full bg-white shadow-md active:scale-95 dark:bg-neutral-800 ${
          active || request || awaitingRating?.paid ? 'bottom-52' : 'bottom-8'
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
          <View className="mb-3 flex-row items-center gap-2">
            <MaterialIcons name="route" size={18} color={driverNavy[500]} />
            <Text className="font-plex text-sm text-neutral-600 dark:text-neutral-300">
              {phase && PHASE_UI[phase].hint ? PHASE_UI[phase].hint : `المسافة ${rideKm(active)}`}
            </Text>
          </View>
          {/* مراسلة الراكبة */}
          <Pressable
            onPress={() =>
              router.push(
                `/chat?rideId=${active.id}&name=${encodeURIComponent(active.passengerName ?? 'الراكبة')}` as Href,
              )
            }
            className="mb-3 h-11 flex-row items-center justify-center gap-2 rounded-xl border border-brand-200 active:scale-[0.98] dark:border-brand-800"
          >
            <MaterialIcons name="chat-bubble-outline" size={18} color={driverNavy[600]} />
            <Text className="font-plex-medium text-sm text-brand-700 dark:text-brand-300">مراسلة الراكبة</Text>
          </Pressable>
          {phase ? (
            <Pressable
              onPress={() => void PHASE_UI[phase].run()}
              disabled={busyId === active.id}
              className={`h-14 flex-row items-center justify-center gap-2 rounded-2xl active:scale-[0.98] ${PHASE_UI[phase].cls}`}
            >
              {busyId === active.id ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <MaterialIcons name={PHASE_UI[phase].icon} size={22} color="#ffffff" />
                  <Text className="font-plex-bold text-lg text-white">{PHASE_UI[phase].label}</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>
      ) : awaitingRating?.paid ? (
        /* بطاقة تقييم الراكبة بعد اكتمال الدفع */
        <View className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-5 pb-8 pt-4 shadow-2xl dark:bg-neutral-800">
          <View className="mb-1 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="check-circle" size={22} color="#16a34a" />
              <Text className="font-plex-bold text-lg text-neutral-900 dark:text-neutral-50">اكتمل الدفع</Text>
            </View>
            <Pressable onPress={() => setAwaitingRating(null)} className="h-8 w-8 items-center justify-center rounded-full">
              <MaterialIcons name="close" size={20} color="#9ca3af" />
            </Pressable>
          </View>
          <Text className="mb-4 font-plex text-sm text-neutral-500 dark:text-neutral-300">
            قيّمي راكبتك {awaitingRating.passengerName ?? ''}
          </Text>
          <Pressable
            onPress={openPassengerRating}
            className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-brand-700 active:scale-[0.98] dark:bg-brand-600"
          >
            <MaterialIcons name="rate-review" size={22} color="#ffffff" />
            <Text className="font-plex-bold text-lg text-white">تقييم الراكبة</Text>
          </Pressable>
        </View>
      ) : request ? (
        /* بطاقة طلب رحلة جديد */
        <View className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-5 pb-8 pt-4 shadow-2xl dark:bg-neutral-800">
          <View className="mb-1 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <Text className="font-plex-bold text-lg text-neutral-900 dark:text-neutral-50">طلب رحلة جديد</Text>
            </View>
            {request.requestedClass ? (
              <View className="rounded-full bg-brand-100 px-2.5 py-1 dark:bg-brand-900/40">
                <Text className="font-plex-medium text-xs text-brand-700 dark:text-brand-300">
                  {rideClassLabel(request.requestedClass)}
                </Text>
              </View>
            ) : null}
          </View>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-plex text-sm text-neutral-600 dark:text-neutral-300">
              {request.passengerName ?? 'راكبة'} · {request.dropoff ? rideKm(request) : 'بدون وجهة محدّدة'}
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
