import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Component, useCallback, useRef, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';
import { AmanaMap, type AmanaMapHandle } from '@amana/shared-ui/MapView';
import { useAuth } from '@/lib/auth';
import { useNotifications } from '@/lib/notifications';
import { useActiveRide, activeStatusLabel } from '@/lib/active-ride';
import { useBottomInset } from '@amana/shared-ui/layout';

/**
 * شاشة «الرئيسية» — خريطة حيّة حقيقية (موقع الراكبة) + ترحيب باسمها الحقيقي +
 * مدخل طلب رحلة. لا بيانات وهمية (أُزيلت بطاقات Stitch: المخطط الذكي والوجهات).
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

export default function HomeScreen() {
  const mapRef = useRef<AmanaMapHandle>(null);
  const { user } = useAuth();
  const { unread } = useNotifications();
  const { ride: activeRide, refresh: refreshRide } = useActiveRide();

  // تحديث عند كل دخول للشاشة. الاعتماد على الاشتراك اللحظي وحده يترك الشريط
  // على حالة قديمة إن فات الحدث (إلغاء، دفع، انقطاع شبكة لحظة التغيير) —
  // فتظهر «بانتظار الدفع» لرحلة أُلغيت فعلًا.
  useFocusEffect(
    useCallback(() => {
      refreshRide();
    }, [refreshRide]),
  );
  const bottomInset = useBottomInset(20);

  const fullName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() || '';
  const firstName = fullName ? fullName.split(' ')[0] : 'بكِ';

  const mapFallback = (
    <View className="flex-1 items-center justify-center gap-3 bg-neutral-100 px-8 dark:bg-neutral-900">
      <MaterialIcons name="map" size={56} color={passengerPurple[400]} />
      <Text className="text-center font-plex-medium text-sm text-neutral-500 dark:text-neutral-400">
        الخريطة الحيّة تعمل في النسخة التطويرية (dev build).
      </Text>
    </View>
  );

  return (
    <View className="flex-1">
      <MapBoundary fallback={mapFallback}>
        <AmanaMap ref={mapRef} style={{ flex: 1 }} showUserLocation />
      </MapBoundary>

      {/* الشريط العلوي — طبقة لمس صلبة (بلا box-none) لتلتقط اللمسة قبل خريطة Mapbox
          تحتها، وإلا تسرّبت لمسة الجرس/الحساب للخريطة فتُكبّرها على أندرويد. */}
      <SafeAreaView edges={['top']} className="absolute inset-x-0 top-0" style={{ zIndex: 20, elevation: 20 }}>
        <View
          className="mx-4 mt-2 flex-row items-center justify-between rounded-2xl bg-white/95 px-4 py-3 shadow-md dark:bg-neutral-900/95"
          style={{ elevation: 12 }}
        >
          <View>
            <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">مرحبًا</Text>
            <Text className="font-plex-bold text-base text-brand-700 dark:text-brand-200">{firstName}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => router.push('/(tabs)/notifications')}
              style={{ elevation: 24 }}
              className="relative h-10 w-10 items-center justify-center rounded-full bg-brand-50 active:bg-neutral-200/60 dark:bg-brand-900/40"
            >
              <MaterialIcons name="notifications-none" size={24} color={passengerPurple[700]} />
              {unread > 0 ? (
                <View className="absolute right-1 top-1 h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1">
                  <Text className="font-plex-bold text-[9px] text-white">{unread > 9 ? '9+' : unread}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              style={{ elevation: 24 }}
              className="h-10 w-10 items-center justify-center rounded-full bg-brand-50 active:bg-neutral-200/60 dark:bg-brand-900/40"
            >
              <MaterialIcons name="person" size={22} color={passengerPurple[700]} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* زر إعادة التمركز */}
      <Pressable
        onPress={() => mapRef.current?.recenter()}
        style={{ elevation: 12, zIndex: 12 }}
        className="absolute bottom-40 right-5 h-12 w-12 items-center justify-center rounded-full bg-white shadow-md active:scale-95 dark:bg-neutral-800"
      >
        <MaterialIcons name="my-location" size={22} color={passengerPurple[700]} />
      </Pressable>

      {/* البطاقة السفلية — رحلة جارية إن وُجدت، وإلّا مدخل طلب رحلة.
          لا يُعرض الاثنان معًا: طلب رحلة ثانية فوق قائمة يُربك الراكبة
          ويترك رحلتين مفتوحتين على سائقتين. */}
      <View
        className="absolute inset-x-0 bottom-0 gap-3 rounded-t-3xl bg-white px-5 pt-5 shadow-2xl dark:bg-neutral-800"
        style={{ elevation: 24, ...bottomInset }}
      >
        {activeRide ? (
          <>
            <View className="flex-row items-center gap-2">
              <View
                className={`h-2.5 w-2.5 rounded-full ${
                  activeRide.needsPayment ? 'bg-amber-500' : 'bg-green-500'
                }`}
              />
              <Text className="flex-1 font-plex-bold text-base text-neutral-900 dark:text-neutral-50">
                {activeRide.needsPayment ? 'بانتظار الدفع' : 'رحلة جارية'}
              </Text>
              {(activeRide.fareTotal ?? activeRide.priceEstimate) != null && (
                <Text className="font-plex-bold text-base text-brand-700 dark:text-brand-200">
                  {activeRide.fareTotal ?? activeRide.priceEstimate} ر.س
                </Text>
              )}
            </View>

            <Text className="font-plex text-sm text-neutral-500 dark:text-neutral-400">
              {activeStatusLabel(activeRide)}
            </Text>

            <Pressable
              onPress={() =>
                router.push(
                  activeRide.needsPayment
                    ? `/payment?rideId=${activeRide.id}`
                    : activeRide.status === 'requested'
                      ? `/matching?rideId=${activeRide.id}`
                      : `/tracking?rideId=${activeRide.id}`,
                )
              }
              className={`h-14 flex-row items-center justify-center gap-2 rounded-xl active:scale-[0.98] ${
                activeRide.needsPayment ? 'bg-amber-500' : 'bg-brand-600'
              }`}
            >
              <MaterialIcons
                name={activeRide.needsPayment ? 'payment' : 'navigation'}
                size={22}
                color="#ffffff"
              />
              <Text className="font-plex-bold text-lg text-white">
                {activeRide.needsPayment ? 'إتمام الدفع' : 'متابعة الرحلة'}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={() => router.push('/request-ride')}
              className="flex-row items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 active:scale-[0.99] dark:border-neutral-700 dark:bg-neutral-900"
            >
              <MaterialIcons name="search" size={22} color={passengerPurple[600]} />
              <Text className="flex-1 font-plex-medium text-lg text-neutral-400">إلى أين؟</Text>
              <View className="flex-row items-center gap-1">
                <MaterialIcons name="schedule" size={18} color={passengerPurple[700]} />
                <Text className="font-plex-medium text-xs text-brand-700 dark:text-brand-200">الآن</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/request-ride')}
              className="h-14 flex-row items-center justify-center gap-2 rounded-xl bg-brand-600 active:scale-[0.98]"
            >
              <MaterialIcons name="local-taxi" size={22} color="#ffffff" />
              <Text className="font-plex-bold text-lg text-white">اطلبي رحلة</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
