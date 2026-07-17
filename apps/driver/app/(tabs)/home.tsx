import { MaterialIcons } from '@expo/vector-icons';
import { Component, useRef, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';
import { AmanaMap, type AmanaMapHandle } from '@amana/shared-ui/MapView';
import { usePresence } from '@/lib/presence';

/**
 * الشاشة الرئيسية للسائقة = خريطة القيادة الحيّة (كأوبر/كريم): موقع السائقة على
 * خريطة Mapbox + زر «ابدئي الاتصال» الذي يشغّل وضع الإتاحة ويبثّ الموقع للوحة
 * الإدارة. لاحقًا: استقبال طلبات الرحلات القريبة والتوجيه.
 *
 * ملاحظة: Mapbox وحدة أصلية تُرسم في نسخة تطويرية؛ داخل Expo Go يظهر بديل نظيف.
 */

/** حدّ خطأ احتياطيّ يلتقط أي تعذّر في الوحدة الأصلية ويعرض بديلًا بدل التعطّل. */
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
  const { online, busy, setOnline } = usePresence();

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
        <AmanaMap ref={mapRef} style={{ flex: 1 }} showUserLocation />
      </MapBoundary>

      {/* الشريط العلوي: الهوية + حالة الاتصال + مفتاح التبديل (يسار) */}
      <SafeAreaView edges={['top']} className="absolute inset-x-0 top-0" pointerEvents="box-none">
        <View className="mx-4 mt-2 flex-row items-center justify-between rounded-2xl bg-white/95 px-4 py-3 shadow-md dark:bg-neutral-900/95">
          {/* الهوية + حالة الاتصال (يمين الشريط) */}
          <View>
            <Text className="font-plex-bold text-base text-brand-700 dark:text-brand-200">أمانة</Text>
            <Text
              className={`font-plex text-xs ${online ? 'text-green-600 dark:text-green-400' : 'text-neutral-500 dark:text-neutral-400'}`}
            >
              {online ? 'متصلة — بانتظار الطلبات' : 'غير متصلة'}
            </Text>
          </View>
          {/* أدوات التحكّم — مفتاح الاتصال (يسار الشريط)، تُضاف أزرار أخرى لاحقًا */}
          <View className="flex-row items-center gap-2">
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
          </View>
        </View>
      </SafeAreaView>

      {/* زر إعادة التمركز */}
      <Pressable
        onPress={() => mapRef.current?.recenter()}
        className="absolute bottom-8 right-5 h-12 w-12 items-center justify-center rounded-full bg-white shadow-md active:scale-95 dark:bg-neutral-800"
      >
        <MaterialIcons name="my-location" size={22} color={driverNavy[600]} />
      </Pressable>
    </View>
  );
}
