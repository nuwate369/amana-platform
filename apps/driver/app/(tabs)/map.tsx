import { MaterialIcons } from '@expo/vector-icons';
import { Component, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';
import { AmanaMap, type AmanaMapHandle } from '@amana/shared-ui/MapView';

/**
 * شاشة الخريطة — أساس تجربة القيادة (المرحلة ب): تعرض موقع السائقة على خريطة Mapbox
 * (المكوّن المشترك `AmanaMap`) + زر «اتصال/إيقاف» + إعادة تمركز. لاحقًا: علامات
 * طلبات الرحلات القريبة والتوجيه لنقطة الالتقاط والوجهة.
 *
 * ملاحظة: Mapbox وحدة أصلية تُرسم في **نسخة تطويرية (Dev Build)** فقط؛ داخل Expo Go
 * يعرض `AmanaMap` بديلًا نظيفًا، ونلفّه بحدّ خطأ إضافيّ احتياطًا.
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

export default function MapScreen() {
  const mapRef = useRef<AmanaMapHandle>(null);
  const [online, setOnline] = useState(false);

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
        onPress={() => mapRef.current?.recenter()}
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
    </View>
  );
}
