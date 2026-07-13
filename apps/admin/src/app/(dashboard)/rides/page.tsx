'use client';

import { Navigation, MapPin, Users, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * صفحة مراقبة الرحلات الحية — خريطة + عدّاد لحظي + قائمة الرحلات الجارية.
 * هوية أنثراسايت + ذهبي، RTL، دعم الوضع الداكن، بيانات ثابتة (mock).
 */

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
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

const ONGOING = [
  { id: '#2087', passenger: 'نورة الأحمد', driver: 'سارة العتيبي', route: 'حي النرجس ← جامعة الأميرة نورة', status: 'جارية' },
  { id: '#2086', passenger: 'ريم القحطاني', driver: 'هند الدوسري', route: 'العليا ← مستشفى الملك فيصل', status: 'جارية' },
  { id: '#2085', passenger: 'لمى السالم', driver: 'عبير الشمري', route: 'الملقا ← الرياض بارك', status: 'في الطريق للراكبة' },
  { id: '#2084', passenger: 'دانة الحربي', driver: 'منى الزهراني', route: 'الياسمين ← حي الصحافة', status: 'جارية' },
  { id: '#2083', passenger: 'جود المطيري', driver: 'أمل الغامدي', route: 'قرطبة ← بوليفارد رياض سيتي', status: 'في الطريق للراكبة' },
];

function LiveStatus({ status }: { status: string }) {
    if (status === 'جارية') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-muted-foreground" />
      {status}
    </span>
  );
}

export default function RidesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">مراقبة الرحلات الحية</h1>
        <p className="text-sm text-muted-foreground">متابعة لحظية للرحلات الجارية على الخريطة</p>
      </div>

      {/* عدّاد لحظي */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="رحلات جارية" value="٢٧" icon={Navigation} />
        <StatCard label="سائقات متصلات" value="٤٢" icon={Users} />
        <StatCard label="طلبات معلّقة" value="٥" icon={Clock} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* خريطة الرحلات الحية */}
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-foreground">الخريطة اللحظية</h2>
          <div className="relative flex h-[420px] items-center justify-center overflow-hidden rounded-lg bg-muted">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <span className="relative">
                <MapPin size={56} strokeWidth={1.5} />
                <Navigation size={22} className="absolute -bottom-1 -left-1 text-primary" />
              </span>
              <span className="text-sm font-medium">خريطة الرحلات الحية</span>
              <span className="text-xs">يظهر هنا موقع كل سائقة وراكبة في الوقت الفعلي</span>
            </div>
          </div>
        </div>

        {/* قائمة الرحلات الجارية */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-foreground">الرحلات الجارية الآن</h2>
          </div>
          <ul className="divide-y divide-border">
            {ONGOING.map((r) => (
              <li key={r.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{r.id}</span>
                  <LiveStatus status={r.status} />
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="text-foreground">
                    <span className="text-muted-foreground">الراكبة: </span>
                    {r.passenger}
                  </p>
                  <p className="text-foreground">
                    <span className="text-muted-foreground">السائقة: </span>
                    {r.driver}
                  </p>
                  <p className="text-xs text-muted-foreground">{r.route}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
