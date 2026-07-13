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
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon size={20} />
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
          <TrendingUp size={14} />
          {delta}
        </span>
      </div>
      <p className="mt-4 text-xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
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
        <h1 className="text-xl font-bold text-foreground">التقارير</h1>
        <p className="text-sm text-muted-foreground">تحليلات الإيرادات والرحلات وأداء المنصّة</p>
      </div>

      {/* تبويبات */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t, i) => (
          <button
            key={t}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              i === 0
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-foreground hover:bg-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* نطاق التاريخ + تصدير */}
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">من تاريخ</label>
            <input
              type="date"
              defaultValue="2026-01-01"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">إلى تاريخ</label>
            <input
              type="date"
              defaultValue="2026-07-12"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
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
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 font-semibold text-foreground">الإيرادات الشهرية</h2>
        <div className="flex h-56 items-end justify-between gap-1.5">
          {MONTHS.map((b) => (
            <div key={b.m} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`w-full rounded-t-md transition-all ${
                    b.v === 100 ? 'bg-primary' : 'bg-primary/60 hover:bg-primary'
                  }`}
                  style={{ height: `${b.v}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{b.m}</span>
            </div>
          ))}
        </div>
      </div>

      {/* أفضل السائقات */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground">أفضل السائقات</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">الاسم</th>
                <th className="px-5 py-3 font-medium">الرحلات</th>
                <th className="px-5 py-3 font-medium">الإيراد</th>
                <th className="px-5 py-3 font-medium">التقييم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {TOP_DRIVERS.map((d) => (
                <tr key={d.name} className="text-foreground hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-3 font-medium">{d.name}</td>
                  <td className="px-5 py-3">{d.rides}</td>
                  <td className="px-5 py-3">{d.revenue}</td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-1 text-foreground">
                      <Star size={14} className="fill-primary text-primary" />
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
