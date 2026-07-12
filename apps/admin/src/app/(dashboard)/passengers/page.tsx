'use client';

import { Search, User } from 'lucide-react';

/**
 * صفحة إدارة الراكبات — بيانات ثابتة (mock)، هوية أنثراسايت + ذهبي، RTL، دعم الوضع الداكن.
 */

const PASSENGERS = [
  { id: 1, name: 'نورة الأحمد', phone: '٠٥٥١١٢٢٣٣٤', rides: '٤٨', joined: '١٤٤٦/٠٢/١٢', status: 'نشطة' },
  { id: 2, name: 'ريم القحطاني', phone: '٠٥٤٢٢٣٣٤٤٥', rides: '١٢٦', joined: '١٤٤٥/١١/٠٣', status: 'نشطة' },
  { id: 3, name: 'لمى السالم', phone: '٠٥٠٣٣٤٤٥٥٦', rides: '٧', joined: '١٤٤٦/٠٤/٢٠', status: 'نشطة' },
  { id: 4, name: 'دانة الحربي', phone: '٠٥٦٤٤٥٥٦٦٧', rides: '٣٤', joined: '١٤٤٦/٠١/٠٨', status: 'موقوفة' },
  { id: 5, name: 'جواهر المطيري', phone: '٠٥٩٥٥٦٦٧٧٨', rides: '٩١', joined: '١٤٤٥/٠٩/١٥', status: 'نشطة' },
  { id: 6, name: 'شهد الغامدي', phone: '٠٥٣٦٦٧٧٨٨٩', rides: '٢', joined: '١٤٤٦/٠٥/٠١', status: 'نشطة' },
  { id: 7, name: 'أروى البقمي', phone: '٠٥٥٧٧٨٨٩٩٠', rides: '٦٣', joined: '١٤٤٥/١٢/٢٢', status: 'نشطة' },
  { id: 8, name: 'بشائر العنزي', phone: '٠٥٠٨٨٩٩٠٠١', rides: '١٩', joined: '١٤٤٦/٠٣/١٠', status: 'موقوفة' },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    نشطة: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    موقوفة: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? ''}`}>
      {status}
    </span>
  );
}

export default function PassengersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900 dark:text-brand-50">إدارة الراكبات</h1>
        <p className="text-sm text-brand-500 dark:text-brand-300">
          قائمة الراكبات المسجّلات في المنصّة ونشاطهنّ
        </p>
      </div>

      {/* البحث */}
      <div className="relative max-w-md">
        <Search
          size={18}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-brand-400"
        />
        <input
          type="text"
          placeholder="ابحثي بالاسم أو رقم الجوال…"
          className="w-full rounded-lg border border-brand-200 bg-white py-2.5 pr-10 pl-4 text-sm text-brand-900 placeholder:text-brand-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 dark:border-brand-700 dark:bg-brand-800 dark:text-brand-50"
        />
      </div>

      {/* جدول الراكبات */}
      <div className="overflow-hidden rounded-xl border border-brand-200 bg-white dark:border-brand-700 dark:bg-brand-800">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-brand-50 text-brand-500 dark:bg-brand-900/50 dark:text-brand-300">
              <tr>
                <th className="px-5 py-3 font-medium">الاسم</th>
                <th className="px-5 py-3 font-medium">الجوال</th>
                <th className="px-5 py-3 font-medium">عدد الرحلات</th>
                <th className="px-5 py-3 font-medium">تاريخ الانضمام</th>
                <th className="px-5 py-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100 dark:divide-brand-700">
              {PASSENGERS.map((p) => (
                <tr key={p.id} className="text-brand-700 dark:text-brand-200">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-500 dark:bg-brand-700 dark:text-brand-300">
                        <User size={15} />
                      </span>
                      <span className="font-medium text-brand-900 dark:text-brand-50">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-brand-500 dark:text-brand-300">{p.phone}</td>
                  <td className="px-5 py-3">{p.rides}</td>
                  <td className="px-5 py-3 text-brand-500 dark:text-brand-300">{p.joined}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={p.status} />
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
