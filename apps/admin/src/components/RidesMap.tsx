'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Map, { Marker, Popup, NavigationControl, type MapRef } from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';
import { useTheme } from 'next-themes';
import { MapPin, Flag, Navigation, Maximize2, Minimize2, Car, Eye } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { ActiveRide, ActiveRideStatus } from '@/app/actions/rides';
import type { OnlineDriver } from '@/app/actions/presence';

/**
 * خريطة الرحلات الحيّة (Mapbox GL JS عبر react-map-gl) — تُرسم علامات الالتقاط
 * (ذهبي) والوجهة (رمادي) لكل رحلة نشطة، مع نافذة تفاصيل عند النقر. الأسلوب يتبع
 * مظهر اللوحة (فاتح/داكن)، ويُطبَّق مكوّن RTL لأسماء الأماكن العربية.
 *
 * يحتاج NEXT_PUBLIC_MAPBOX_TOKEN (مفتاح pk. عام)؛ إن غاب تُعرض حالة بديلة نظيفة.
 */

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

// مركز الرياض الافتراضي حين لا توجد نقاط.
const RIYADH = { longitude: 46.6753, latitude: 24.7136, zoom: 10 };

export interface RidesMapLabels {
  passenger: string;
  driver: string;
  pickup: string;
  dropoff: string;
  unknown: string;
  noTokenTitle: string;
  noTokenSubtitle: string;
  expand: string;
  collapse: string;
  driverOnline: string;
  viewDetails: string;
  statusOf: (s: ActiveRideStatus) => string;
}

// تحميل مكوّن اتجاه النص (RTL) مرّة واحدة لأسماء الأماكن العربية على الخريطة.
let rtlPluginRequested = false;
function ensureRtlPlugin() {
  if (rtlPluginRequested) return;
  rtlPluginRequested = true;
  try {
    const state = mapboxgl.getRTLTextPluginStatus?.();
    if (state === 'unavailable') {
      mapboxgl.setRTLTextPlugin(
        'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
        () => {},
        true,
      );
    }
  } catch {
    /* غير حرج — الخريطة تعمل بدونه */
  }
}

interface Point {
  id: string;
  kind: 'pickup' | 'dropoff';
  lng: number;
  lat: number;
  ride: ActiveRide;
}

export default function RidesMap({
  rides,
  drivers = [],
  labels,
  onViewDriver,
}: {
  rides: ActiveRide[];
  drivers?: OnlineDriver[];
  labels: RidesMapLabels;
  onViewDriver?: (id: string) => void;
}) {
  const { resolvedTheme } = useTheme();
  const mapRef = useRef<MapRef>(null);
  const [selected, setSelected] = useState<Point | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<OnlineDriver | null>(null);
  const [expanded, setExpanded] = useState(false);

  // في وضع ملء الشاشة: قفل تمرير الصفحة + إغلاق بمفتاح Escape.
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

  // إعادة حساب حجم الخريطة بعد تغيّر أبعاد الحاوية (دخول/خروج ملء الشاشة).
  useEffect(() => {
    const id = setTimeout(() => mapRef.current?.resize(), 60);
    return () => clearTimeout(id);
  }, [expanded]);

  const mapStyle =
    resolvedTheme === 'dark'
      ? 'mapbox://styles/mapbox/dark-v11'
      : 'mapbox://styles/mapbox/light-v11';

  // كل النقاط القابلة للرسم (التقاط + وجهة) من الرحلات ذات الإحداثيات.
  const points = useMemo<Point[]>(() => {
    const out: Point[] = [];
    for (const r of rides) {
      if (r.pickupLat != null && r.pickupLng != null) {
        out.push({ id: `${r.id}-p`, kind: 'pickup', lng: r.pickupLng, lat: r.pickupLat, ride: r });
      }
      if (r.dropoffLat != null && r.dropoffLng != null) {
        out.push({ id: `${r.id}-d`, kind: 'dropoff', lng: r.dropoffLng, lat: r.dropoffLat, ride: r });
      }
    }
    return out;
  }, [rides]);

  useEffect(() => {
    ensureRtlPlugin();
  }, []);

  // ملاءمة الإطار عند تغيّر مجموعة العلامات (ظهور/اختفاء) فقط — لا عند مجرّد
  // تحرّك السائقة، كي لا تُعاد المركزة مع كل نبضة موقع.
  const fitKey = useMemo(
    () => [...points.map((p) => p.id), ...drivers.map((d) => `dr:${d.id}`)].sort().join(','),
    [points, drivers],
  );
  const lastFitKey = useRef('');
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fitKey === lastFitKey.current) return;
    lastFitKey.current = fitKey;
    const coords: [number, number][] = [
      ...points.map((p) => [p.lng, p.lat] as [number, number]),
      ...drivers.map((d) => [d.lng, d.lat] as [number, number]),
    ];
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.easeTo({ center: coords[0], zoom: 13, duration: 600 });
      return;
    }
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const [lng, lat] of coords) {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 64, maxZoom: 14, duration: 600 },
    );
  }, [fitKey, points, drivers]);

  // إبقاء النوافذ المنبثقة متّسقة مع أحدث البيانات (أو إغلاقها إن اختفت).
  useEffect(() => {
    if (selected) setSelected(points.find((p) => p.id === selected.id) ?? null);
  }, [points]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedDriver) setSelectedDriver(drivers.find((d) => d.id === selectedDriver.id) ?? null);
  }, [drivers]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!MAPBOX_TOKEN) {
    return (
      <div className="relative flex h-full min-h-[420px] items-center justify-center overflow-hidden rounded-lg bg-muted">
        <div className="flex max-w-xs flex-col items-center gap-3 px-6 text-center text-muted-foreground">
          <span className="relative">
            <MapPin size={56} strokeWidth={1.5} />
            <Navigation size={22} className="absolute -bottom-1 -left-1 text-primary" />
          </span>
          <span className="text-sm font-medium text-foreground">{labels.noTokenTitle}</span>
          <span className="text-xs leading-6">{labels.noTokenSubtitle}</span>
          <code className="rounded bg-background px-2 py-1 text-[11px] text-primary">
            NEXT_PUBLIC_MAPBOX_TOKEN
          </code>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        expanded
          ? 'fixed inset-0 z-[80] bg-background'
          : 'relative h-full min-h-[420px] w-full overflow-hidden rounded-lg'
      }
    >
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={RIYADH}
        mapStyle={mapStyle}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {points.map((p) => (
          <Marker
            key={p.id}
            longitude={p.lng}
            latitude={p.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelected(p);
            }}
          >
            <button
              type="button"
              aria-label={p.kind === 'pickup' ? labels.pickup : labels.dropoff}
              className={`flex h-8 w-8 -translate-y-1 items-center justify-center rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 ${
                p.kind === 'pickup'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-foreground text-background'
              }`}
            >
              {p.kind === 'pickup' ? <MapPin size={16} /> : <Flag size={15} />}
            </button>
          </Marker>
        ))}

        {selected && (
          <Popup
            longitude={selected.lng}
            latitude={selected.lat}
            anchor="top"
            offset={16}
            closeButton
            closeOnClick={false}
            onClose={() => setSelected(null)}
            className="amana-ride-popup"
            maxWidth="260px"
          >
            <div className="space-y-1.5 p-1 text-right" dir="rtl">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-primary">
                  {selected.kind === 'pickup' ? labels.pickup : labels.dropoff}
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {labels.statusOf(selected.ride.status)}
                </span>
              </div>
              <p className="text-sm text-foreground">
                <span className="text-muted-foreground">{labels.passenger} </span>
                {selected.ride.passengerName ?? labels.unknown}
              </p>
              <p className="text-sm text-foreground">
                <span className="text-muted-foreground">{labels.driver} </span>
                {selected.ride.driverName ?? labels.unknown}
              </p>
              {(selected.kind === 'pickup'
                ? selected.ride.pickupAddress
                : selected.ride.dropoffAddress) && (
                <p className="text-xs text-muted-foreground">
                  {selected.kind === 'pickup'
                    ? selected.ride.pickupAddress
                    : selected.ride.dropoffAddress}
                </p>
              )}
            </div>
          </Popup>
        )}

        {/* السائقات المتصلات الآن (موقع حيّ) */}
        {drivers.map((d) => (
          <Marker
            key={`dr-${d.id}`}
            longitude={d.lng}
            latitude={d.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedDriver(d);
            }}
          >
            <button
              type="button"
              aria-label={labels.driverOnline}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-green-500 text-white shadow-md transition-transform hover:scale-110"
            >
              <Car size={16} />
            </button>
          </Marker>
        ))}

        {selectedDriver && (
          <Popup
            longitude={selectedDriver.lng}
            latitude={selectedDriver.lat}
            anchor="top"
            offset={16}
            closeButton
            closeOnClick={false}
            onClose={() => setSelectedDriver(null)}
            className="amana-ride-popup"
            maxWidth="260px"
          >
            <div className="p-1 text-right" dir="rtl">
              <div className="flex items-center gap-3">
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-green-600 dark:text-green-400">
                  <Car size={20} />
                  <span className="absolute -bottom-0.5 -left-0.5 flex h-3.5 w-3.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-70" />
                    <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-card bg-green-500" />
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selectedDriver.name ?? labels.unknown}
                  </p>
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-green-600 dark:text-green-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    {labels.driverOnline}
                  </span>
                </div>
              </div>
              {onViewDriver && (
                <button
                  type="button"
                  onClick={() => onViewDriver(selectedDriver.id)}
                  className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Eye size={13} />
                  {labels.viewDetails}
                </button>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {/* زر تكبير الخريطة / الخروج من ملء الشاشة */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? labels.collapse : labels.expand}
        title={expanded ? labels.collapse : labels.expand}
        className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-md transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
      </button>
    </div>
  );
}
