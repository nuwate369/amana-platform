'use client';

import { Send } from 'lucide-react';

/**
 * صفحة إرسال إشعارات للتطبيقات — بطاقة إنشاء إشعار + قائمة الإشعارات المرسلة.
 * تُستخدم لإرسال رسائل للمستخدمين النهائيين (الراكبات/السائقات).
 * مفصولة تماماً عن نظام الإشعارات الداخلي (system-notifications).
 * هوية أنثراسايت + ذهبي، RTL، دعم الوضع الداكن، بيانات ثابتة (mock).
 */

const SENT = [
  { title: 'تحديث سياسة الرحلات', audience: 'الكل', date: '2026-07-11', status: 'مُرسل' },
  { title: 'عرض نهاية الأسبوع للراكبات', audience: 'الراكبات', date: '2026-07-10', status: 'مُرسل' },
  { title: 'تذكير بتحديث الوثائق', audience: 'السائقات', date: '2026-07-09', status: 'مُرسل' },
  { title: 'صيانة مجدولة للتطبيق', audience: 'الكل', date: '2026-07-14', status: 'مجدول' },
  { title: 'مكافآت السائقات المتميزات', audience: 'السائقات', date: '2026-07-15', status: 'مجدول' },
  { title: 'استبيان رضا الراكبات', audience: 'الراكبات', date: '2026-07-08', status: 'مُرسل' },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    مُرسل: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    مجدول: 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? ''}`}>
      {status}
    </span>
  );
}

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900 dark:text-brand-50">الإعلانات والتنبيهات العامة</h1>
        <p className="text-sm text-brand-500 dark:text-brand-300">إرسال رسائل تظهر داخل تطبيقي الراكبة والسائقة</p>
      </div>

      {/* بطاقة الإنشاء */}
      <div className="rounded-xl border border-brand-200 bg-white p-5 dark:border-brand-700 dark:bg-brand-800">
        <h2 className="mb-4 font-semibold text-brand-800 dark:text-brand-100">إنشاء إشعار جديد</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-brand-600 dark:text-brand-200">العنوان</label>
            <input
              type="text"
              placeholder="أدخل عنوان الإشعار"
              className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-800 placeholder:text-brand-400 dark:border-brand-600 dark:bg-brand-900 dark:text-brand-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-brand-600 dark:text-brand-200">النوع</label>
            <select className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-800 dark:border-brand-600 dark:bg-brand-900 dark:text-brand-100">
              <option value="announcement">إعلان عام</option>
              <option value="maintenance">صيانة</option>
              <option value="update">تحديث</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-brand-600 dark:text-brand-200">نص الإشعار</label>
            <textarea
              rows={4}
              placeholder="اكتب محتوى الإشعار هنا"
              className="w-full resize-none rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-800 placeholder:text-brand-400 dark:border-brand-600 dark:bg-brand-900 dark:text-brand-100"
            />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="w-full sm:w-64">
              <label className="mb-1 block text-sm text-brand-600 dark:text-brand-200">الجمهور</label>
              <select className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-800 dark:border-brand-600 dark:bg-brand-900 dark:text-brand-100">
                <option>الكل</option>
                <option>الراكبات</option>
                <option>السائقات</option>
              </select>
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-accent-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-600">
              <Send size={16} />
              إرسال
            </button>
          </div>
        </div>

        {/* ملاحظة تحذيرية ثابتة */}
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          هذه رسائل إخبارية فقط ولا تُطبّق أي خصم أو تغيير سعر فعلي. نظام العروض الفعلية سيُضاف في مرحلة لاحقة.
        </div>
      </div>

      {/* الإشعارات المرسلة */}
      <div className="overflow-hidden rounded-xl border border-brand-200 bg-white dark:border-brand-700 dark:bg-brand-800">
        <div className="border-b border-brand-200 px-5 py-4 dark:border-brand-700">
          <h2 className="font-semibold text-brand-800 dark:text-brand-100">الإشعارات المرسلة</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-brand-50 text-brand-500 dark:bg-brand-900/50 dark:text-brand-300">
              <tr>
                <th className="px-5 py-3 font-medium">العنوان</th>
                <th className="px-5 py-3 font-medium">الجمهور</th>
                <th className="px-5 py-3 font-medium">التاريخ</th>
                <th className="px-5 py-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100 dark:divide-brand-700">
              {SENT.map((n) => (
                <tr key={n.title} className="text-brand-700 dark:text-brand-200">
                  <td className="px-5 py-3 font-medium">{n.title}</td>
                  <td className="px-5 py-3">{n.audience}</td>
                  <td className="px-5 py-3 font-mono text-brand-400">{n.date}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={n.status} />
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
