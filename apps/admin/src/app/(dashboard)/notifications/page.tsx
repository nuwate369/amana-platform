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
    مُرسل: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    مجدول: 'bg-primary/10 text-primary',
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
        <h1 className="text-2xl font-bold text-foreground">الإعلانات والتنبيهات العامة</h1>
        <p className="text-sm text-muted-foreground">إرسال رسائل تظهر داخل تطبيقي الراكبة والسائقة</p>
      </div>

      {/* بطاقة الإنشاء */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 font-semibold text-foreground">إنشاء إشعار جديد</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">العنوان</label>
            <input
              type="text"
              placeholder="أدخل عنوان الإشعار"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">النوع</label>
            <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none">
              <option value="announcement">إعلان عام</option>
              <option value="maintenance">صيانة</option>
              <option value="update">تحديث</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">نص الإشعار</label>
            <textarea
              rows={4}
              placeholder="اكتب محتوى الإشعار هنا"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="w-full sm:w-64">
              <label className="mb-1 block text-sm text-muted-foreground">الجمهور</label>
              <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none">
                <option>الكل</option>
                <option>الراكبات</option>
                <option>السائقات</option>
              </select>
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
              <Send size={16} />
              إرسال
            </button>
          </div>
        </div>

        {/* ملاحظة تحذيرية ثابتة */}
        <div className="mt-5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
          هذه رسائل إخبارية فقط ولا تُطبّق أي خصم أو تغيير سعر فعلي. نظام العروض الفعلية سيُضاف في مرحلة لاحقة.
        </div>
      </div>

      {/* الإشعارات المرسلة */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground">الإشعارات المرسلة</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">العنوان</th>
                <th className="px-5 py-3 font-medium">الجمهور</th>
                <th className="px-5 py-3 font-medium">التاريخ</th>
                <th className="px-5 py-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SENT.map((n) => (
                <tr key={n.title} className="text-foreground hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-3 font-medium">{n.title}</td>
                  <td className="px-5 py-3">{n.audience}</td>
                  <td className="px-5 py-3 font-mono text-muted-foreground">{n.date}</td>
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
