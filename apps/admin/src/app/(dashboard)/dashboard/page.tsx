'use client';

import { Car, Users, Navigation, Wallet, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * صفحة النظرة العامة — المرجع التصميمي لبقية صفحات اللوحة.
 * هوية أنثراسايت + ذهبي، RTL، دعم الوضع الداكن، بيانات ثابتة (mock).
 */

function StatCard({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-brand-200 bg-white p-5 dark:border-brand-700 dark:bg-brand-800">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-500/15 text-accent-600 dark:text-accent-400">
          <Icon size={20} />
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
          <TrendingUp size={14} />
          {delta}
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold text-brand-900 dark:text-brand-50">{value}</p>
      <p className="mt-1 text-sm text-brand-500 dark:text-brand-300">{label}</p>
    </div>
  );
}

const WEEK = [
  { d: 'السبت', v: 62 },
  { d: 'الأحد', v: 80 },
  { d: 'الاثنين', v: 55 },
  { d: 'الثلاثاء', v: 90 },
  { d: 'الأربعاء', v: 74 },
  { d: 'الخميس', v: 100 },
  { d: 'الجمعة', v: 48 },
];

const RECENT = [
  { id: '#1042', passenger: 'نورة الأحمد', driver: 'سارة العتيبي', status: 'مكتملة', amount: '84.50' },
  { id: '#1041', passenger: 'ريم القحطاني', driver: 'هند الدوسري', status: 'جارية', amount: '—' },
  { id: '#1040', passenger: 'لمى السالم', driver: 'عبير الشمري', status: 'مكتملة', amount: '52.00' },
  { id: '#1039', passenger: 'دانة الحربي', driver: 'منى الزهراني', status: 'ملغاة', amount: '—' },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    مكتملة: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    جارية: 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300',
    ملغاة: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? ''}`}>
      {status}
    </span>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900 dark:text-brand-50">لوحة المعلومات</h1>
        <p className="text-sm text-brand-500 dark:text-brand-300">نظرة عامة على أداء المنصّة اليوم</p>
      </div>

      {/* بطاقات المؤشرات */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="رحلات اليوم" value="٣٤٨" delta="+12%" icon={Navigation} />
        <StatCard label="السائقات النشطات" value="٤٢" delta="+5%" icon={Car} />
        <StatCard label="الراكبات" value="١٬٢٦٠" delta="+8%" icon={Users} />
        <StatCard label="إيرادات اليوم" value="١٨٬٤٥٠ ﷼" delta="+15%" icon={Wallet} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* رسم الرحلات الأسبوعي */}
        <div className="rounded-xl border border-brand-200 bg-white p-5 lg:col-span-2 dark:border-brand-700 dark:bg-brand-800">
          <h2 className="mb-4 font-semibold text-brand-800 dark:text-brand-100">الرحلات هذا الأسبوع</h2>
          <div className="flex h-48 items-end justify-between gap-2">
            {WEEK.map((b) => (
              <div key={b.d} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-accent-500/80 transition-all hover:bg-accent-500"
                    style={{ height: `${b.v}%` }}
                  />
                </div>
                <span className="text-xs text-brand-400">{b.d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ملخص سريع */}
        <div className="rounded-xl border border-brand-200 bg-white p-5 dark:border-brand-700 dark:bg-brand-800">
          <h2 className="mb-4 font-semibold text-brand-800 dark:text-brand-100">ملخّص</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between">
              <span className="text-brand-500 dark:text-brand-300">طلبات KYC معلّقة</span>
              <span className="font-semibold text-accent-600 dark:text-accent-400">٧</span>
            </li>
            <li className="flex justify-between">
              <span className="text-brand-500 dark:text-brand-300">بلاغات طوارئ اليوم</span>
              <span className="font-semibold text-brand-900 dark:text-brand-50">٠</span>
            </li>
            <li className="flex justify-between">
              <span className="text-brand-500 dark:text-brand-300">متوسط التقييم</span>
              <span className="font-semibold text-brand-900 dark:text-brand-50">٤.٩</span>
            </li>
            <li className="flex justify-between">
              <span className="text-brand-500 dark:text-brand-300">مجموعات نشطة</span>
              <span className="font-semibold text-brand-900 dark:text-brand-50">١٨</span>
            </li>
          </ul>
        </div>
      </div>

      {/* آخر الرحلات */}
      <div className="overflow-hidden rounded-xl border border-brand-200 bg-white dark:border-brand-700 dark:bg-brand-800">
        <div className="border-b border-brand-200 px-5 py-4 dark:border-brand-700">
          <h2 className="font-semibold text-brand-800 dark:text-brand-100">آخر الرحلات</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-brand-50 text-brand-500 dark:bg-brand-900/50 dark:text-brand-300">
              <tr>
                <th className="px-5 py-3 font-medium">الرقم</th>
                <th className="px-5 py-3 font-medium">الراكبة</th>
                <th className="px-5 py-3 font-medium">السائقة</th>
                <th className="px-5 py-3 font-medium">الحالة</th>
                <th className="px-5 py-3 font-medium">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100 dark:divide-brand-700">
              {RECENT.map((r) => (
                <tr key={r.id} className="text-brand-700 dark:text-brand-200">
                  <td className="px-5 py-3 font-mono text-brand-400">{r.id}</td>
                  <td className="px-5 py-3">{r.passenger}</td>
                  <td className="px-5 py-3">{r.driver}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-5 py-3">{r.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
