'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigation, Users, Clock, MapPin } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  listActiveRides,
  type ActiveRideStatus,
  type RidesSnapshot,
} from '@/app/actions/rides';
import { listOnlineDrivers, type OnlineDriver } from '@/app/actions/presence';
import { supabase } from '@/lib/supabase/client';
import type { RidesMapLabels } from '@/components/RidesMap';
import { UserDetailsModal } from '@/components/UserDetailsModal';

/**
 * مراقبة الرحلات الحيّة — بيانات حقيقية (Supabase) + بثّ لحظي (Realtime):
 * خريطة Mapbox تُرسم مواقع الالتقاط/الوجهة، عدّادات لحظية، وقائمة الرحلات الجارية.
 * هوية أنثراسايت + ذهبي، RTL، دعم الوضع الداكن.
 */

// الخريطة تُحمّل على العميل فقط (mapbox-gl يحتاج window).
const RidesMap = dynamic(() => import('@/components/RidesMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-lg bg-muted">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  ),
});

const EMPTY: RidesSnapshot = { rides: [], ongoing: 0, pending: 0, activeDrivers: 0 };

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon size={20} />
        </span>
        <div>
          <p className="text-xl font-bold text-foreground">{value}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function LiveStatus({ status, label }: { status: ActiveRideStatus; label: string }) {
  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        {label}
      </span>
    );
  }
  // الوصول مرحلة حرجة للمتابعة: السائقة بالموقع والراكبة لم تركب بعد،
  // وأغلب مشاكل التواصل تقع هنا — فتُميَّز بلون خاص لا بلون «طلب جديد».
  if (status === 'arrived') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
        </span>
        {label}
      </span>
    );
  }
  if (status === 'matched') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-muted-foreground" />
      {label}
    </span>
  );
}

export default function RidesPage() {
  const { t } = useTranslation();
  const [snap, setSnap] = useState<RidesSnapshot>(EMPTY);
  const [drivers, setDrivers] = useState<OnlineDriver[]>([]);
  const [driverDetailsId, setDriverDetailsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const ridesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const driversTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([listActiveRides(), listOnlineDrivers()]);
      setSnap(s);
      setDrivers(d);
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadDrivers = useCallback(async () => {
    setDrivers(await listOnlineDrivers());
  }, []);

  useEffect(() => {
    reload();
    // بثّ لحظي: تغيّر الرحلات يُعيد جلب الرحلات؛ تغيّر الحضور يُعيد جلب السائقات
    // المتصلات (مع تجميع سريع). ومؤقّت دوريّ يُسقط السائقات التي انقطع اتصالها بصمت.
    const channel = supabase
      .channel('admin-rides-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => {
        if (ridesTimer.current) clearTimeout(ridesTimer.current);
        ridesTimer.current = setTimeout(reload, 400);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presence' }, () => {
        if (driversTimer.current) clearTimeout(driversTimer.current);
        driversTimer.current = setTimeout(reloadDrivers, 400);
      })
      .subscribe();
    const prune = setInterval(reloadDrivers, 20_000);
    return () => {
      if (ridesTimer.current) clearTimeout(ridesTimer.current);
      if (driversTimer.current) clearTimeout(driversTimer.current);
      clearInterval(prune);
      supabase.removeChannel(channel);
    };
  }, [reload, reloadDrivers]);

  const statusLabel = (s: ActiveRideStatus): string => {
    if (s === 'in_progress') return t('rides.status.inProgress', 'جارية');
    if (s === 'arrived') return t('rides.status.arrived', 'وصلت السائقة');
    if (s === 'matched') return t('rides.status.matched', 'في الطريق للراكبة');
    return t('rides.status.requested', 'طلب جديد');
  };

  const mapLabels: RidesMapLabels = {
    passenger: t('rides.list.passenger', 'الراكبة:'),
    driver: t('rides.list.driver', 'السائقة:'),
    pickup: t('rides.map.pickup', 'الالتقاط'),
    dropoff: t('rides.map.dropoff', 'الوجهة'),
    unknown: t('rides.unknown', 'غير معروف'),
    noTokenTitle: t('rides.map.placeholder.title', 'خريطة الرحلات الحية'),
    noTokenSubtitle: t('rides.map.noToken', 'أضِف مفتاح Mapbox العام لعرض الخريطة اللحظية'),
    expand: t('rides.map.expand', 'تكبير الخريطة'),
    collapse: t('rides.map.collapse', 'تصغير الخريطة'),
    driverOnline: t('rides.map.driverOnline', 'سائقة متصلة'),
    viewDetails: t('rides.map.viewDetails', 'عرض التفاصيل'),
    statusOf: statusLabel,
  };

  const routeText = (r: RidesSnapshot['rides'][number]): string => {
    const from = r.pickupAddress ?? (r.pickupLat != null ? `${r.pickupLat.toFixed(3)}, ${r.pickupLng?.toFixed(3)}` : '—');
    const to = r.dropoffAddress ?? (r.dropoffLat != null ? `${r.dropoffLat.toFixed(3)}, ${r.dropoffLng?.toFixed(3)}` : '—');
    return `${from} ← ${to}`;
  };

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center">
        <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-foreground">
          <Navigation className="h-6 w-6 shrink-0 text-primary" />
          {t('rides.title', 'مراقبة الرحلات الحية')}
          <span className="hidden text-muted-foreground/30 md:inline">/</span>
          <span className="text-sm font-normal text-muted-foreground">
            {t('rides.subtitle', 'متابعة لحظية للرحلات الجارية على الخريطة')}
          </span>
        </h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary md:ms-auto">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          {t('rides.liveBadge', 'مباشر')}
        </span>
      </div>

      {/* عدّادات لحظية */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('rides.stats.ongoing', 'رحلات جارية')} value={snap.ongoing} icon={Navigation} />
        <StatCard label={t('rides.stats.onlineDrivers', 'سائقات متصلات')} value={drivers.length} icon={Users} />
        <StatCard label={t('rides.stats.pendingRequests', 'طلبات معلّقة')} value={snap.pending} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* خريطة الرحلات الحية */}
        <div className="flex flex-col rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-foreground">{t('rides.map.title', 'الخريطة اللحظية')}</h2>
          <div className="h-[440px]">
            <RidesMap rides={snap.rides} drivers={drivers} labels={mapLabels} onViewDriver={setDriverDetailsId} />
          </div>
        </div>

        {/* قائمة الرحلات الجارية */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold text-foreground">{t('rides.list.title', 'الرحلات الجارية الآن')}</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {snap.rides.length}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : snap.rides.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center text-muted-foreground">
              <MapPin size={40} strokeWidth={1.5} />
              <p className="text-sm font-medium text-foreground">{t('rides.empty.title', 'لا توجد رحلات نشطة الآن')}</p>
              <p className="text-xs">{t('rides.empty.subtitle', 'ستظهر الرحلات هنا فور بدئها')}</p>
            </div>
          ) : (
            <ul className="max-h-[520px] divide-y divide-border overflow-y-auto">
              {snap.rides.map((r) => (
                <li key={r.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">#{r.id.slice(0, 8)}</span>
                    <LiveStatus status={r.status} label={statusLabel(r.status)} />
                  </div>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-foreground">
                      <span className="text-muted-foreground">{t('rides.list.passenger', 'الراكبة:')} </span>
                      {r.passengerName ?? t('rides.unknown', 'غير معروف')}
                    </p>
                    <p className="text-foreground">
                      <span className="text-muted-foreground">{t('rides.list.driver', 'السائقة:')} </span>
                      {r.driverName ?? t('rides.waitingDriver', 'بانتظار سائقة')}
                    </p>
                    <p className="truncate text-xs text-muted-foreground" title={routeText(r)}>{routeText(r)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <UserDetailsModal
        userId={driverDetailsId}
        kind="driver"
        onClose={() => setDriverDetailsId(null)}
      />
    </div>
  );
}
