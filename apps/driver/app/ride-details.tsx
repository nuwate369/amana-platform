import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';
import { RideDetailView } from '@amana/shared-ui/RideDetailView';
import { getRideDetail, type RideDetail } from '@amana/shared-ui/ride-details';
import { supabase } from '@/lib/supabase';

/** تفاصيل رحلة من منظور السائقة — العرض مشترك مع تطبيق الراكبة. */
export default function RideDetailsScreen() {
  const { rideId } = useLocalSearchParams<{ rideId?: string }>();
  const [ride, setRide] = useState<RideDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!rideId) {
      setLoading(false);
      return;
    }
    void getRideDetail(supabase, rideId).then((r) => {
      if (!alive) return;
      setRide(r);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [rideId]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      <View className="h-14 flex-row items-center justify-between px-4">
        <View className="w-10" />
        <Text className="font-plex-bold text-lg text-neutral-900 dark:text-neutral-50">
          تفاصيل الرحلة
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <MaterialIcons name="arrow-forward" size={24} color={driverNavy[600]} />
        </Pressable>
      </View>
      <RideDetailView
        ride={ride}
        loading={loading}
        perspective="driver"
        accent={driverNavy[600]}
      />
    </SafeAreaView>
  );
}
