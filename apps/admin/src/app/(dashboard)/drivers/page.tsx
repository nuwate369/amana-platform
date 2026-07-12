'use client';

import { useEffect, useState } from 'react';
import { Car, FileText, Image as ImageIcon, Check, X, ShieldCheck, Star } from 'lucide-react';
import { listDrivers, type DriverRow } from '@/app/actions/admin';

/**
 * صفحة إدارة السائقات — بيانات حقيقية (Supabase)، هوية أنثراسايت + ذهبي، RTL، دعم الوضع الداكن.
 */

const FILTERS = ['الكل', 'نشطة', 'قيد المراجعة', 'موقوفة'] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_LABELS: Record<string, string> = {
  approved: 'نشطة',
  pending: 'قيد المراجعة',
  rejected: 'موقوفة',
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    نشطة: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    'قيد المراجعة': 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300',
    موقوفة: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? ''}`}>
      {status}
    </span>
  );
}

export default function DriversPage() {
  const [active, setActive] = useState<Filter>('الكل');
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listDrivers();
        if (alive) setDrivers(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const rows =
    active === 'الكل'
      ? drivers
      : drivers.filter((d) => STATUS_LABELS[d.status] === active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900 dark:text-brand-50">إدارة السائقات</h1>
        <p className="text-sm text-brand-500 dark:text-brand-300">
          مراجعة طلبات الانضمام، متابعة الحالة، وإدارة السائقات المسجّلات
        </p>
      </div>

      {/* بطاقة طلبات KYC معلّقة */}
      {/* TODO: بيانات حقيقية */}
      <div className="rounded-xl border border-brand-200 bg-white p-5 dark:border-brand-700 dark:bg-brand-800">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500/15 text-accent-600 dark:text-accent-400">
            <ShieldCheck size={18} />
          </span>
          <h2 className="font-semibold text-brand-800 dark:text-brand-100">طلبات KYC معلّقة</h2>
          <span className="rounded-full bg-accent-500/15 px-2 py-0.5 text-xs font-medium text-accent-600 dark:text-accent-400">
            ٣
          </span>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-brand-200 p-4 dark:border-brand-700 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-medium text-brand-900 dark:text-brand-50">عبير الشمري</p>
            <p className="text-sm text-brand-500 dark:text-brand-300">تقدّمت بطلب انضمام كسائقة · ٠٥٠٤٤٥٥٦٦٧</p>
          </div>

          {/* صور المستندات (عناصر نائبة) */}
          <div className="flex items-center gap-3">
            {[
              { label: 'الهوية', icon: ImageIcon },
              { label: 'الرخصة', icon: ImageIcon },
              { label: 'استمارة المركبة', icon: FileText },
            ].map((doc) => (
              <div key={doc.label} className="flex flex-col items-center gap-1">
                <div className="flex h-16 w-20 items-center justify-center rounded-md border border-dashed border-brand-300 bg-brand-50 text-brand-400 dark:border-brand-600 dark:bg-brand-900/50">
                  <doc.icon size={20} />
                </div>
                <span className="text-[11px] text-brand-500 dark:text-brand-300">{doc.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
              <Check size={16} />
              موافقة
            </button>
            <button className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20">
              <X size={16} />
              رفض
            </button>
          </div>
        </div>
      </div>

      {/* شرائح التصفية */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActive(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              active === f
                ? 'bg-accent-500 text-white'
                : 'border border-brand-200 bg-white text-brand-600 hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-800 dark:text-brand-300 dark:hover:bg-brand-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* جدول السائقات */}
      <div className="overflow-hidden rounded-xl border border-brand-200 bg-white dark:border-brand-700 dark:bg-brand-800">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-brand-50 text-brand-500 dark:bg-brand-900/50 dark:text-brand-300">
              <tr>
                <th className="px-5 py-3 font-medium">الاسم</th>
                <th className="px-5 py-3 font-medium">الجوال</th>
                <th className="px-5 py-3 font-medium">المركبة</th>
                <th className="px-5 py-3 font-medium">التقييم</th>
                <th className="px-5 py-3 font-medium">الحالة</th>
                <th className="px-5 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100 dark:divide-brand-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-brand-500 dark:text-brand-300">
                    جارٍ التحميل…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-brand-500 dark:text-brand-300">
                    لا توجد بيانات
                  </td>
                </tr>
              ) : (
                rows.map((d) => {
                  const label = STATUS_LABELS[d.status] ?? d.status;
                  return (
                    <tr key={d.id} className="text-brand-700 dark:text-brand-200">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-500 dark:bg-brand-700 dark:text-brand-300">
                            <Car size={15} />
                          </span>
                          <span className="font-medium text-brand-900 dark:text-brand-50">
                            {d.fullName ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-brand-500 dark:text-brand-300">
                        {d.phone ?? '—'}
                      </td>
                      <td className="px-5 py-3">{d.vehicle}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1">
                          <Star size={14} className="text-accent-500" />
                          —
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={label} />
                      </td>
                      <td className="px-5 py-3">
                        {label === 'قيد المراجعة' ? (
                          <button className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-600">
                            مراجعة KYC
                          </button>
                        ) : (
                          <button className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-700">
                            عرض
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
