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
    <div className="rounded-xl border border-brand-200 bg-white p-5 dark:border-brand-700 dark:bg-brand-800">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-500/15 text-accent-600 dark:text-accent-400">
          <Icon size={20} />
        </span>
        <div>
          <p className="text-2xl font-bold text-brand-900 dark:text-brand-50">{value}</p>
          <p className="mt-0.5 text-sm text-brand-500 dark:text-brand-300">{label}</p>
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
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-medium text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-500" />
        </span>
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-700 dark:text-brand-200">
      <span className="h-2 w-2 rounded-full bg-brand-400" />
      {status}
    </span>
  );
}

export default function RidesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900 dark:text-brand-50">مراقبة الرحلات الحية</h1>
        <p className="text-sm text-brand-500 dark:text-brand-300">متابعة لحظية للرحلات الجارية على الخريطة</p>
      </div>

      {/* عدّاد لحظي */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="رحلات جارية" value="٢٧" icon={Navigation} />
        <StatCard label="سائقات متصلات" value="٤٢" icon={Users} />
        <StatCard label="طلبات معلّقة" value="٥" icon={Clock} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* خريطة الرحلات الحية */}
        <div className="rounded-xl border border-brand-200 bg-white p-5 lg:col-span-2 dark:border-brand-700 dark:bg-brand-800">
          <h2 className="mb-4 font-semibold text-brand-800 dark:text-brand-100">الخريطة اللحظية</h2>
          <div className="relative flex h-[420px] items-center justify-center overflow-hidden rounded-lg bg-brand-100 dark:bg-brand-900/50">
            <div className="flex flex-col items-center gap-3 text-brand-400 dark:text-brand-500">
              <span className="relative">
                <MapPin size={56} strokeWidth={1.5} />
                <Navigation size={22} className="absolute -bottom-1 -left-1 text-accent-500" />
              </span>
              <span className="text-sm font-medium">خريطة الرحلات الحية</span>
              <span className="text-xs">يظهر هنا موقع كل سائقة وراكبة في الوقت الفعلي</span>
            </div>
          </div>
        </div>

        {/* قائمة الرحلات الجارية */}
        <div className="overflow-hidden rounded-xl border border-brand-200 bg-white dark:border-brand-700 dark:bg-brand-800">
          <div className="border-b border-brand-200 px-5 py-4 dark:border-brand-700">
            <h2 className="font-semibold text-brand-800 dark:text-brand-100">الرحلات الجارية الآن</h2>
          </div>
          <ul className="divide-y divide-brand-100 dark:divide-brand-700">
            {ONGOING.map((r) => (
              <li key={r.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-brand-400">{r.id}</span>
                  <LiveStatus status={r.status} />
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="text-brand-800 dark:text-brand-100">
                    <span className="text-brand-500 dark:text-brand-300">الراكبة: </span>
                    {r.passenger}
                  </p>
                  <p className="text-brand-800 dark:text-brand-100">
                    <span className="text-brand-500 dark:text-brand-300">السائقة: </span>
                    {r.driver}
                  </p>
                  <p className="text-xs text-brand-500 dark:text-brand-300">{r.route}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
