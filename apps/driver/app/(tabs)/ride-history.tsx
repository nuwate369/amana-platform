import { MaterialIcons } from '@expo/vector-icons';
import { isActiveRideStatus } from '@amana/shared-types';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';
import { listMyDriverRides, type DriverRideHistoryItem } from '@/lib/rides-history';

/** شاشة «رحلاتي» — رحلات السائقة الحقيقية من Supabase (لقطة الراكبة والمسار والأجرة). */

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'completed', label: 'مكتملة' },
  { key: 'cancelled', label: 'ملغاة' },
  { key: 'active', label: 'جارية' },
];

function fmt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const date = d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });
  const time = d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

function RouteIndicator({ muted }: { muted?: boolean }) {
  const color = muted ? '#9ca3af' : driverNavy[600];
  return (
    <View className="mt-1 items-center">
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <View className="my-0.5 h-6 w-0.5 bg-neutral-300 dark:bg-neutral-600" />
      <View className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: color, backgroundColor: 'transparent' }} />
    </View>
  );
}

function RideCard({ ride }: { ride: DriverRideHistoryItem }) {
  const cancelled = ride.status === 'cancelled';
  return (
    <Pressable
      onPress={() => router.push(`/ride-details?rideId=${ride.id}` as Href)}
      className={`rounded-xl border p-4 active:opacity-80 ${
        cancelled
          ? 'border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800/60'
          : 'border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800'
      }`}
    >
      <View className="mb-4 flex-row items-start justify-between">
        <View className="flex-row items-center gap-4">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
            <MaterialIcons name={cancelled ? 'no-accounts' : 'person'} size={26} color={cancelled ? '#9ca3af' : driverNavy[400]} />
          </View>
          <View>
            <Text className="font-plex-semibold text-base text-neutral-900 dark:text-neutral-100">
              {ride.passengerName ?? (cancelled ? 'رحلة ملغاة' : 'راكبة أمانة')}
            </Text>
            {cancelled ? (
              <View className="mt-1 self-start rounded bg-red-100 px-2 py-0.5 dark:bg-red-900/40">
                <Text className="font-plex-bold text-[10px] text-red-700 dark:text-red-300">تم الإلغاء</Text>
              </View>
            ) : (
              <Text className="mt-0.5 font-plex-medium text-xs text-neutral-400">رقم الرحلة {ride.id.slice(0, 8)}</Text>
            )}
          </View>
        </View>
        <Text className={`font-plex-semibold text-base ${cancelled ? 'text-neutral-400' : 'text-brand-700 dark:text-brand-300'}`}>
          {cancelled ? 'لم تُحتسب أجرة' : ride.fare != null ? `${ride.fare.toFixed(2)} ر.س` : '—'}
        </Text>
      </View>

      <View className="mb-4 flex-row items-start gap-4">
        <RouteIndicator muted={cancelled} />
        <View className="flex-1 gap-2">
          <Text className="font-plex text-sm text-neutral-900 dark:text-neutral-100" numberOfLines={1}>
            {ride.from ?? 'نقطة الانطلاق'}
          </Text>
          <Text className="font-plex text-sm text-neutral-900 dark:text-neutral-100" numberOfLines={1}>
            {ride.to ?? 'بدون وجهة محدّدة'}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-1">
        <MaterialIcons name="calendar-today" size={16} color="#9ca3af" />
        <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">{fmt(ride.at)}</Text>
      </View>
    </Pressable>
  );
}

export default function RideHistoryScreen() {
  const [rides, setRides] = useState<DriverRideHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      listMyDriverRides().then((r) => {
        if (!alive) return;
        setRides(r);
        setLoading(false);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return rides;
    if (activeFilter === 'completed') return rides.filter((r) => r.status === 'completed');
    // `no_show` انتهاء غير مكتمل — مكانها مع الملغاة لا خارج كل التبويبات.
    if (activeFilter === 'cancelled')
      return rides.filter((r) => r.status === 'cancelled' || r.status === 'no_show');
    return rides.filter((r) => isActiveRideStatus(r.status));
  }, [rides, activeFilter]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      <View className="h-14 flex-row items-center justify-between px-5">
        <View className="w-10" />
        <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-200">أمانة</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6">
          <Text className="mb-1 font-plex-semibold text-[26px] text-brand-700 dark:text-brand-200">رحلاتي</Text>
          <Text className="font-plex text-sm text-neutral-500 dark:text-neutral-400">استعرضي جميع رحلاتك السابقة وتفاصيلها</Text>
        </View>

        {/* وسوم التصفية */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 -mx-5 px-5" contentContainerStyle={{ gap: 12 }}>
          {FILTERS.map((f) => {
            const active = f.key === activeFilter;
            return (
              <Pressable
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                className={active ? 'rounded-full bg-brand-100 px-4 py-1.5 dark:bg-brand-900/40' : 'rounded-full bg-neutral-100 px-4 py-1.5 dark:bg-neutral-800'}
              >
                <Text className={active ? 'font-plex-medium text-xs text-brand-700 dark:text-brand-200' : 'font-plex-medium text-xs text-neutral-500 dark:text-neutral-400'}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator color={driverNavy[600]} />
          </View>
        ) : filtered.length === 0 ? (
          <View className="items-center gap-3 py-16">
            <MaterialIcons name="history" size={56} color={driverNavy[300]} />
            <Text className="text-center font-plex-medium text-base text-neutral-500 dark:text-neutral-400">لا توجد رحلات بعد</Text>
          </View>
        ) : (
          <View className="gap-4">
            {filtered.map((ride) => (
              <RideCard key={ride.id} ride={ride} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
