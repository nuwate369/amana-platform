'use client';

import { useEffect, useState } from 'react';
import { Car, Users, Navigation, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getDashboardStats, type DashboardStats } from '@/app/actions/admin';

/**
 * صفحة النظرة العامة — المرجع التصميمي لبقية صفحات اللوحة.
 * هوية أنثراسايت + ذهبي، RTL، دعم الوضع الداكن. المؤشرات من بيانات حقيقية (Supabase).
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
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={20} />
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// TODO: بيانات حقيقية
const WEEK = [
  { d: 'السبت', v: 62 },
  { d: 'الأحد', v: 80 },
  { d: 'الاثنين', v: 55 },
  { d: 'الثلاثاء', v: 90 },
  { d: 'الأربعاء', v: 74 },
  { d: 'الخميس', v: 100 },
  { d: 'الجمعة', v: 48 },
];

// TODO: بيانات حقيقية
const RECENT = [
  { id: '#1042', passenger: 'نورة الأحمد', driver: 'سارة العتيبي', status: 'مكتملة', amount: '84.50' },
  { id: '#1041', passenger: 'ريم القحطاني', driver: 'هند الدوسري', status: 'جارية', amount: '—' },
  { id: '#1040', passenger: 'لمى السالم', driver: 'عبير الشمري', status: 'مكتملة', amount: '52.00' },
  { id: '#1039', passenger: 'دانة الحربي', driver: 'منى الزهراني', status: 'ملغاة', amount: '—' },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    مكتملة: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    جارية: 'bg-primary/10 text-primary border border-primary/20',
    ملغاة: 'bg-destructive/10 text-destructive border border-destructive/20',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? ''}`}>
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getDashboardStats();
        if (alive) setStats(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const dash = '…';
  const totalRides = loading || !stats ? dash : stats.totalRides.toLocaleString('ar-SA');
  const activeDrivers = loading || !stats ? dash : stats.activeDrivers.toLocaleString('ar-SA');
  const passengers = loading || !stats ? dash : stats.passengers.toLocaleString('ar-SA');
  const revenue = loading || !stats ? dash : `${stats.revenue.toLocaleString('ar-SA')} ﷼`;
  const pendingKyc = loading || !stats ? dash : stats.pendingKyc.toLocaleString('ar-SA');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">لوحة المعلومات</h1>
        <p className="text-sm text-muted-foreground">نظرة عامة على أداء المنصّة اليوم</p>
      </div>

      {/* بطاقات المؤشرات */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="الرحلات" value={totalRides} icon={Navigation} />
        <StatCard label="السائقات النشطات" value={activeDrivers} icon={Car} />
        <StatCard label="الراكبات" value={passengers} icon={Users} />
        <StatCard label="الإيرادات" value={revenue} icon={Wallet} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* رسم الرحلات الأسبوعي */}
        {/* TODO: بيانات حقيقية */}
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-foreground">الرحلات هذا الأسبوع</h2>
          <div className="flex h-48 items-end justify-between gap-2">
            {WEEK.map((b) => (
              <div key={b.d} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-primary/80 transition-all hover:bg-primary"
                    style={{ height: `${b.v}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{b.d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ملخص سريع */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 font-semibold text-foreground">ملخّص</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between">
              <span className="text-muted-foreground">طلبات KYC معلّقة</span>
              <span className="font-semibold text-primary">{pendingKyc}</span>
            </li>
            {/* TODO: بيانات حقيقية */}
            <li className="flex justify-between">
              <span className="text-muted-foreground">بلاغات طوارئ اليوم</span>
              <span className="font-semibold text-foreground">٠</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">متوسط التقييم</span>
              <span className="font-semibold text-foreground">٤.٩</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">مجموعات نشطة</span>
              <span className="font-semibold text-foreground">١٨</span>
            </li>
          </ul>
        </div>
      </div>

      {/* آخر الرحلات */}
      {/* TODO: بيانات حقيقية */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground">آخر الرحلات</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">الرقم</th>
                <th className="px-5 py-3 font-medium">الراكبة</th>
                <th className="px-5 py-3 font-medium">السائقة</th>
                <th className="px-5 py-3 font-medium">الحالة</th>
                <th className="px-5 py-3 font-medium">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {RECENT.map((r) => (
                <tr key={r.id} className="text-foreground">
                  <td className="px-5 py-3 font-mono text-muted-foreground">{r.id}</td>
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
