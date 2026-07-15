import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';

/**
 * شاشة الخريطة — أساس تجربة القيادة (المرحلة ب): تعرض موقع السائقة الحالي على
 * خريطة جوجل + زر «اتصال/إيقاف» + زر إعادة التمركز. لاحقًا: علامات طلبات الرحلات
 * القريبة والتوجيه لنقطة الالتقاط والوجهة.
 *
 * ملاحظة: خرائط جوجل (react-native-maps) تُرسم فعليًّا في **build مستقل/تطويري**
 * (`eas build`) بعد إضافة مفتاح Google Maps في app.json. داخل Expo Go على أندرويد
 * قد لا تتوفّر الوحدة النيتف، لذا نلفّ الخريطة بحدّ خطأ يعرض بديلًا نظيفًا بدل التعطّل.
 */

const RIYADH = {
  latitude: 24.7136,
  longitude: 46.6753,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

/** حدّ خطأ يلتقط تعذّر توفّر الخريطة النيتف (داخل Expo Go) ويعرض بديلًا. */
class MapBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [permDenied, setPermDenied] = useState(false);
  const [online, setOnline] = useState(false);

  // طلب إذن الموقع + جلب الموقع الحالي مرّة عند الفتح.
  useEffect(() => {
    let active = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!active) return;
      if (status !== 'granted') {
        setPermDenied(true);
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (active) setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch {
        /* يُترك على المنطقة الافتراضية */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // تحريك الكاميرا إلى موقع السائقة عند توفّره.
  useEffect(() => {
    if (coords) {
      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 600);
    }
  }, [coords]);

  function recenter() {
    if (coords) {
      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 500);
    }
  }

  const mapFallback = (
    <View className="flex-1 items-center justify-center gap-3 bg-neutral-100 px-8 dark:bg-neutral-900">
      <MaterialIcons name="map" size={56} color={driverNavy[400]} />
      <Text className="text-center font-plex-semibold text-base text-neutral-700 dark:text-neutral-200">
        الخريطة الحيّة تعمل في نسخة التطبيق المستقلة
      </Text>
      <Text className="text-center font-plex text-sm leading-6 text-neutral-500 dark:text-neutral-400">
        أضيفي مفتاح خرائط جوجل ثم أنشئي نسخة تطويرية (dev build) لتظهر الخريطة.
      </Text>
    </View>
  );

  return (
    <View className="flex-1">
      <MapBoundary fallback={mapFallback}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={{ flex: 1 }}
          initialRegion={RIYADH}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
        />
      </MapBoundary>

      {/* الشريط العلوي: الهوية + حالة الاتصال */}
      <SafeAreaView edges={['top']} className="absolute inset-x-0 top-0" pointerEvents="box-none">
        <View className="mx-4 mt-2 flex-row items-center justify-between rounded-2xl bg-white/95 px-4 py-3 shadow-md dark:bg-neutral-900/95">
          <View>
            <Text className="font-plex-bold text-base text-brand-700 dark:text-brand-200">أمانة</Text>
            <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
              {online ? 'متصلة — بانتظار الطلبات' : 'غير متصلة'}
            </Text>
          </View>
          <View className={`h-3 w-3 rounded-full ${online ? 'bg-green-500' : 'bg-neutral-400'}`} />
        </View>
      </SafeAreaView>

      {/* زر إعادة التمركز */}
      <Pressable
        onPress={recenter}
        className="absolute bottom-32 right-5 h-12 w-12 items-center justify-center rounded-full bg-white shadow-md active:scale-95 dark:bg-neutral-800"
      >
        <MaterialIcons name="my-location" size={22} color={driverNavy[600]} />
      </Pressable>

      {/* زر الاتصال / الإيقاف */}
      <View className="absolute inset-x-0 bottom-0 p-5" pointerEvents="box-none">
        <Pressable
          onPress={() => setOnline((o) => !o)}
          className={`h-14 flex-row items-center justify-center gap-2 rounded-2xl active:scale-[0.98] ${
            online ? 'bg-red-600' : 'bg-brand-700 dark:bg-brand-600'
          }`}
        >
          <MaterialIcons
            name={online ? 'pause-circle-filled' : 'play-circle-filled'}
            size={22}
            color="#ffffff"
          />
          <Text className="font-plex-bold text-lg text-white">
            {online ? 'إيقاف الاتصال' : 'ابدئي الاتصال'}
          </Text>
        </Pressable>
      </View>

      {/* غطاء رفض إذن الموقع */}
      {permDenied ? (
        <View className="absolute inset-0 items-center justify-center bg-black/40 p-8">
          <View className="items-center gap-3 rounded-2xl bg-white p-6 dark:bg-neutral-900">
            <MaterialIcons name="location-off" size={40} color="#dc2626" />
            <Text className="text-center font-plex-semibold text-base text-neutral-900 dark:text-neutral-50">
              نحتاج إذن الموقع لعرض الخريطة والرحلات
            </Text>
            <Text className="text-center font-plex text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              فعّلي إذن الموقع من إعدادات الهاتف ثم أعيدي فتح الشاشة.
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
