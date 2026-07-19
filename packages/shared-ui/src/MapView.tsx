import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Location from 'expo-location';
import type MapboxNS from '@rnmapbox/maps';

/**
 * مكوّن خريطة موحّد لتطبيقات أمانة (السائقة/الراكبة) — طبقة تجريد بسيطة:
 * الخصائص محايدة عن المزوّد (نقاط بإحداثيات، إظهار الموقع، مركز/تقريب)، والتنفيذ
 * الداخلي عبر Mapbox (@rnmapbox/maps). لتبديل المزوّد لاحقًا (مثلًا Google) نغيّر
 * التنفيذ الداخلي فقط دون تغيير واجهة الخصائص أو الشاشات المستهلِكة.
 *
 * ملاحظة مهمّة: @rnmapbox/maps وحدة أصلية **لا تعمل في Expo Go** — تتطلّب نسخة
 * تطويرية (Dev Build). نحمّلها بحذر ونعرض بديلًا نظيفًا بدل انهيار التطبيق.
 */

// تحميل حذر: في Expo Go الوحدة الأصلية غير موجودة، فنتفادى انهيار التطبيق كلّه.
let Mapbox: typeof MapboxNS | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@rnmapbox/maps');
  Mapbox = (mod.default ?? mod) as typeof MapboxNS;
} catch {
  Mapbox = null;
}

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
if (Mapbox && MAPBOX_TOKEN) {
  Mapbox.setAccessToken(MAPBOX_TOKEN);
}

/** علامة على الخريطة (محايدة عن المزوّد). */
export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  /** لون العلامة (افتراضي: كحليّ أمانة). */
  color?: string;
  /** نوع العلامة — يحدّد شكلها (سائقة = أيقونة سيارة، انطلاق/وجهة = دبوس). */
  kind?: 'driver' | 'pickup' | 'dropoff';
}

export interface AmanaMapProps {
  style?: StyleProp<ViewStyle>;
  /** علامات إضافية (موقع السائقة، نقطة الانطلاق/الوجهة لاحقًا). */
  markers?: MapMarker[];
  /** إظهار موقع المستخدم الحالي (افتراضي: true). */
  showUserLocation?: boolean;
  /** تتبّع الكاميرا لموقع المستخدم تلقائيًّا (افتراضي: false — نتيح التحريك اليدوي). */
  followUser?: boolean;
  /** مركز ابتدائي عند غياب موقع المستخدم. */
  initialCenter?: { latitude: number; longitude: number };
  /** مستوى التقريب (افتراضي 13). */
  zoom?: number;
  /** يُستدعى عند تحديد موقع المستخدم. */
  onUserLocation?: (coord: { latitude: number; longitude: number }) => void;
  /** يُستدعى عند الضغط على الخريطة (لتحديد الوجهة مثلًا). */
  onMapPress?: (coord: { latitude: number; longitude: number }) => void;
  /** بداية مسار الطريق (يُرسَم خطًّا يتبع الطرق عبر Mapbox Directions). */
  routeFrom?: { latitude: number; longitude: number } | null;
  /** نهاية مسار الطريق. */
  routeTo?: { latitude: number; longitude: number } | null;
}

/** مقبض تحكّم أمريّ (إعادة التمركز على موقع المستخدم). */
export interface AmanaMapHandle {
  recenter: () => void;
}

/** مركز افتراضي: الرياض. */
const DEFAULT_CENTER = { latitude: 24.7136, longitude: 46.6753 };
const BRAND_NAVY = '#254594';

export const AmanaMap = forwardRef<AmanaMapHandle, AmanaMapProps>(function AmanaMap(
  { style, markers = [], showUserLocation = true, followUser = false, initialCenter, zoom = 13, onUserLocation, onMapPress, routeFrom, routeTo },
  ref,
) {
  const [perm, setPerm] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [userCoord, setUserCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  // هندسة مسار الطريق (GeoJSON LineString) من Mapbox Directions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [routeGeo, setRouteGeo] = useState<any>(null);
  // كاميرا Mapbox تُحمّل شرطيًّا؛ نوعها any مقبول هنا (المرجع اختياريّ).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cameraRef = useRef<any>(null);

  // إعادة التمركز الأمريّة على موقع المستخدم.
  useImperativeHandle(
    ref,
    () => ({
      recenter: () => {
        if (userCoord && cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [userCoord.longitude, userCoord.latitude],
            zoomLevel: zoom,
            animationDuration: 500,
          });
        }
      },
    }),
    [userCoord, zoom],
  );

  // طلب إذن الموقع (مع رسالة توضيحية من app.json) + معالجة الرفض بلا كسر الشاشة.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!active) return;
        if (status !== 'granted') {
          setPerm('denied');
          return;
        }
        setPerm('granted');
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!active) return;
        const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserCoord(c);
        onUserLocation?.(c);
      } catch {
        if (active) setPerm('denied');
      }
    })();
    return () => {
      active = false;
    };
  }, [onUserLocation]);

  // جلب مسار الطريق (يتبع الشوارع) عبر Mapbox Directions ورسمه خطًّا على الخريطة.
  useEffect(() => {
    if (!Mapbox || !MAPBOX_TOKEN || !routeFrom || !routeTo) {
      setRouteGeo(null);
      return;
    }
    let active = true;
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/` +
      `${routeFrom.longitude},${routeFrom.latitude};${routeTo.longitude},${routeTo.latitude}` +
      `?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        const g = d?.routes?.[0]?.geometry;
        setRouteGeo(g ?? null);
      })
      .catch(() => {
        if (active) setRouteGeo(null);
      });
    return () => {
      active = false;
    };
  }, [routeFrom?.latitude, routeFrom?.longitude, routeTo?.latitude, routeTo?.longitude]);

  // بديل نظيف: الخريطة تتطلّب Dev Build (Expo Go لا يدعم الوحدة الأصلية).
  if (!Mapbox) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>
          الخريطة تتطلّب نسخة تطويرية (Dev Build) — لا تعمل داخل Expo Go.
        </Text>
      </View>
    );
  }
  if (!MAPBOX_TOKEN) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>مفتاح الخرائط غير مضبوط (EXPO_PUBLIC_MAPBOX_TOKEN).</Text>
      </View>
    );
  }
  if (perm === 'unknown') {
    return (
      <View style={[styles.fallback, style]}>
        <ActivityIndicator color={BRAND_NAVY} />
      </View>
    );
  }

  const center = userCoord ?? initialCenter ?? DEFAULT_CENTER;

  return (
    <View style={[styles.container, style]}>
      <Mapbox.MapView
        style={StyleSheet.absoluteFill}
        styleURL={Mapbox.StyleURL.Street}
        logoEnabled
        compassEnabled
        scaleBarEnabled={false}
        onPress={
          onMapPress
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (feature: any) => {
                const c = feature?.geometry?.coordinates;
                if (Array.isArray(c) && c.length >= 2) {
                  onMapPress({ longitude: c[0], latitude: c[1] });
                }
              }
            : undefined
        }
      >
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={zoom}
          centerCoordinate={[center.longitude, center.latitude]}
          followUserLocation={followUser && perm === 'granted'}
          followZoomLevel={zoom}
          animationMode="flyTo"
          animationDuration={600}
        />
        {showUserLocation && perm === 'granted' ? (
          <Mapbox.UserLocation visible androidRenderMode="normal" />
        ) : null}
        {routeGeo ? (
          <Mapbox.ShapeSource id="amana-route" shape={{ type: 'Feature', geometry: routeGeo, properties: {} }}>
            <Mapbox.LineLayer
              id="amana-route-casing"
              style={{ lineColor: '#ffffff', lineWidth: 7, lineCap: 'round', lineJoin: 'round', lineOpacity: 0.9 }}
            />
            <Mapbox.LineLayer
              id="amana-route-line"
              style={{ lineColor: BRAND_NAVY, lineWidth: 4, lineCap: 'round', lineJoin: 'round' }}
            />
          </Mapbox.ShapeSource>
        ) : null}
        {markers.map((m) => (
          <Mapbox.PointAnnotation key={m.id} id={m.id} coordinate={[m.longitude, m.latitude]}>
            {m.kind === 'driver' ? (
              <View style={styles.driverMarker}>
                <Text style={styles.driverGlyph}>🚗</Text>
              </View>
            ) : (
              <View style={[styles.pin, { backgroundColor: m.color ?? BRAND_NAVY }]} />
            )}
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>

      {/* رُفض إذن الموقع: الخريطة تبقى ظاهرة + دعوة لطيفة لفتح الإعدادات */}
      {perm === 'denied' ? (
        <View style={styles.permOverlay} pointerEvents="box-none">
          <View style={styles.permCard}>
            <Text style={styles.permText}>نحتاج إذن الموقع لعرض موقعك على الخريطة.</Text>
            <Pressable style={styles.permBtn} onPress={() => void Linking.openSettings()}>
              <Text style={styles.permBtnText}>فتح الإعدادات</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#eef1f6' },
  fallbackText: { textAlign: 'center', color: '#5b6472', fontSize: 14, lineHeight: 22 },
  pin: { width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: '#ffffff' },
  driverMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 5,
  },
  driverGlyph: { fontSize: 20, lineHeight: 24 },
  permOverlay: { position: 'absolute', bottom: 16, left: 16, right: 16, alignItems: 'center' },
  permCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  permText: { textAlign: 'center', color: '#333', fontSize: 13, lineHeight: 20 },
  permBtn: { backgroundColor: BRAND_NAVY, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 20 },
  permBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
});
