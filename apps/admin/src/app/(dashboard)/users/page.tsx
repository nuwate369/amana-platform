'use client';

import { UserPlus, Shield, Eye, BarChart3 } from 'lucide-react';

/**
 * صفحة المستخدمون والصلاحيات — بيانات ثابتة (mock)، هوية أنثراسايت + ذهبي، RTL، دعم الوضع الداكن.
 */

const MEMBERS = [
  { id: 1, name: 'أحمد الطيّاح', email: 'ahmed@amana.sa', role: 'مدير', last: 'قبل ٥ دقائق' },
  { id: 2, name: 'فاطمة العلي', email: 'fatima@amana.sa', role: 'مشرف', last: 'قبل ساعة' },
  { id: 3, name: 'خالد الرشيد', email: 'khalid@amana.sa', role: 'مشرف', last: 'اليوم ٩:٤٠ ص' },
  { id: 4, name: 'سلمى الناصر', email: 'salma@amana.sa', role: 'محلل', last: 'أمس' },
  { id: 5, name: 'يوسف الحمد', email: 'yousef@amana.sa', role: 'محلل', last: 'قبل ٣ أيام' },
];

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    مدير: 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300',
    مشرف: 'bg-brand-100 text-brand-700 dark:bg-brand-700 dark:text-brand-200',
    محلل: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[role] ?? ''}`}>
      {role}
    </span>
  );
}

const LEGEND = [
  {
    role: 'مدير',
    icon: Shield,
    desc: 'صلاحيات كاملة: إدارة المستخدمين، التسعير، والإعدادات',
  },
  {
    role: 'مشرف',
    icon: Eye,
    desc: 'متابعة الرحلات والسائقات ومراجعة طلبات KYC',
  },
  {
    role: 'محلل',
    icon: BarChart3,
    desc: 'اطّلاع على التقارير ولوحات المؤشرات فقط',
  },
];

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-900 dark:text-brand-50">المستخدمون والصلاحيات</h1>
          <p className="text-sm text-brand-500 dark:text-brand-300">
            إدارة أعضاء الفريق وأدوارهم داخل لوحة التحكّم
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-600">
          <UserPlus size={18} />
          إضافة مستخدم
        </button>
      </div>

      {/* جدول أعضاء الفريق */}
      <div className="overflow-hidden rounded-xl border border-brand-200 bg-white dark:border-brand-700 dark:bg-brand-800">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-brand-50 text-brand-500 dark:bg-brand-900/50 dark:text-brand-300">
              <tr>
                <th className="px-5 py-3 font-medium">الاسم</th>
                <th className="px-5 py-3 font-medium">البريد</th>
                <th className="px-5 py-3 font-medium">الدور</th>
                <th className="px-5 py-3 font-medium">آخر دخول</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100 dark:divide-brand-700">
              {MEMBERS.map((m) => (
                <tr key={m.id} className="text-brand-700 dark:text-brand-200">
                  <td className="px-5 py-3 font-medium text-brand-900 dark:text-brand-50">{m.name}</td>
                  <td className="px-5 py-3 font-mono text-brand-500 dark:text-brand-300">{m.email}</td>
                  <td className="px-5 py-3">
                    <RoleBadge role={m.role} />
                  </td>
                  <td className="px-5 py-3 text-brand-500 dark:text-brand-300">{m.last}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* دليل الأدوار والصلاحيات */}
      <div className="rounded-xl border border-brand-200 bg-white p-5 dark:border-brand-700 dark:bg-brand-800">
        <h2 className="mb-4 font-semibold text-brand-800 dark:text-brand-100">الأدوار والصلاحيات</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {LEGEND.map((l) => (
            <div
              key={l.role}
              className="rounded-lg border border-brand-200 p-4 dark:border-brand-700"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/15 text-accent-600 dark:text-accent-400">
                  <l.icon size={16} />
                </span>
                <RoleBadge role={l.role} />
              </div>
              <p className="text-sm text-brand-500 dark:text-brand-300">{l.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
