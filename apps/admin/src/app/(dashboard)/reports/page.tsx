'use client';

import { Wallet, Navigation, Receipt, XCircle, TrendingUp, Download, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * صفحة التقارير — تبويبات + نطاق تاريخ + مؤشرات + رسم إيرادات شهري + جدول أفضل السائقات.
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

const TABS = ['الإيرادات', 'الرحلات', 'الأداء'];

const MONTHS = [
  { m: 'يناير', v: 55 },
  { m: 'فبراير', v: 62 },
  { m: 'مارس', v: 70 },
  { m: 'أبريل', v: 58 },
  { m: 'مايو', v: 76 },
  { m: 'يونيو', v: 84 },
  { m: 'يوليو', v: 100 },
  { m: 'أغسطس', v: 92 },
  { m: 'سبتمبر', v: 78 },
  { m: 'أكتوبر', v: 88 },
  { m: 'نوفمبر', v: 95 },
  { m: 'ديسمبر', v: 82 },
];

const TOP_DRIVERS = [
  { name: 'سارة العتيبي', rides: 312, revenue: '٢٤٬٦٥٠ ﷼', rating: '٤.٩' },
  { name: 'هند الدوسري', rides: 298, revenue: '٢٢٬٤١٠ ﷼', rating: '٤.٩' },
  { name: 'عبير الشمري', rides: 276, revenue: '٢٠٬٨٨٠ ﷼', rating: '٤.٨' },
  { name: 'منى الزهراني', rides: 254, revenue: '١٩٬٣٢٠ ﷼', rating: '٤.٨' },
  { name: 'دانة الحربي', rides: 241, revenue: '١٨٬٠٥٠ ﷼', rating: '٤.٧' },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900 dark:text-brand-50">التقارير</h1>
        <p className="text-sm text-brand-500 dark:text-brand-300">تحليلات الإيرادات والرحلات وأداء المنصّة</p>
      </div>

      {/* تبويبات */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t, i) => (
          <button
            key={t}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              i === 0
                ? 'bg-accent-500 text-white'
                : 'bg-white text-brand-600 hover:bg-brand-100 dark:bg-brand-800 dark:text-brand-200 dark:hover:bg-brand-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* نطاق التاريخ + تصدير */}
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-brand-200 bg-white p-4 dark:border-brand-700 dark:bg-brand-800">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs text-brand-500 dark:text-brand-300">من تاريخ</label>
            <input
              type="date"
              defaultValue="2026-01-01"
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-800 dark:border-brand-600 dark:bg-brand-900 dark:text-brand-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-brand-500 dark:text-brand-300">إلى تاريخ</label>
            <input
              type="date"
              defaultValue="2026-07-12"
              className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-800 dark:border-brand-600 dark:bg-brand-900 dark:text-brand-100"
            />
          </div>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-600">
          <Download size={16} />
          تصدير CSV
        </button>
      </div>

      {/* بطاقات المؤشرات */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="إجمالي الإيرادات" value="٢٤٨٬٥٠٠ ﷼" delta="+14%" icon={Wallet} />
        <StatCard label="عدد الرحلات" value="٩٬٦٤٠" delta="+9%" icon={Navigation} />
        <StatCard label="متوسط قيمة الرحلة" value="٢٥.٨٠ ﷼" delta="+4%" icon={Receipt} />
        <StatCard label="معدل الإلغاء" value="٣.٢٪" delta="+1%" icon={XCircle} />
      </div>

      {/* رسم الإيرادات الشهرية */}
      <div className="rounded-xl border border-brand-200 bg-white p-5 dark:border-brand-700 dark:bg-brand-800">
        <h2 className="mb-4 font-semibold text-brand-800 dark:text-brand-100">الإيرادات الشهرية</h2>
        <div className="flex h-56 items-end justify-between gap-1.5">
          {MONTHS.map((b) => (
            <div key={b.m} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`w-full rounded-t-md transition-all ${
                    b.v === 100 ? 'bg-accent-500' : 'bg-accent-500/60 hover:bg-accent-500'
                  }`}
                  style={{ height: `${b.v}%` }}
                />
              </div>
              <span className="text-[10px] text-brand-400">{b.m}</span>
            </div>
          ))}
        </div>
      </div>

      {/* أفضل السائقات */}
      <div className="overflow-hidden rounded-xl border border-brand-200 bg-white dark:border-brand-700 dark:bg-brand-800">
        <div className="border-b border-brand-200 px-5 py-4 dark:border-brand-700">
          <h2 className="font-semibold text-brand-800 dark:text-brand-100">أفضل السائقات</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-brand-50 text-brand-500 dark:bg-brand-900/50 dark:text-brand-300">
              <tr>
                <th className="px-5 py-3 font-medium">الاسم</th>
                <th className="px-5 py-3 font-medium">الرحلات</th>
                <th className="px-5 py-3 font-medium">الإيراد</th>
                <th className="px-5 py-3 font-medium">التقييم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100 dark:divide-brand-700">
              {TOP_DRIVERS.map((d) => (
                <tr key={d.name} className="text-brand-700 dark:text-brand-200">
                  <td className="px-5 py-3 font-medium">{d.name}</td>
                  <td className="px-5 py-3">{d.rides}</td>
                  <td className="px-5 py-3">{d.revenue}</td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-1 text-brand-700 dark:text-brand-200">
                      <Star size={14} className="fill-accent-500 text-accent-500" />
                      {d.rating}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
