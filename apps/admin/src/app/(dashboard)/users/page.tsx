'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Shield, Eye, BarChart3 } from 'lucide-react';
import { listAdmins, type ProfileRow } from '@/app/actions/admin';

/**
 * صفحة المستخدمون والصلاحيات — بيانات حقيقية (Supabase)، هوية أنثراسايت + ذهبي، RTL، دعم الوضع الداكن.
 */

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
  const [members, setMembers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listAdmins();
        if (alive) setMembers(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

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
                <th className="px-5 py-3 font-medium">الجوال</th>
                <th className="px-5 py-3 font-medium">الدور</th>
                <th className="px-5 py-3 font-medium">تاريخ الإضافة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100 dark:divide-brand-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-brand-500 dark:text-brand-300">
                    جارٍ التحميل…
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-brand-500 dark:text-brand-300">
                    لا يوجد مستخدمون بعد
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="text-brand-700 dark:text-brand-200">
                    <td className="px-5 py-3 font-medium text-brand-900 dark:text-brand-50">
                      {m.fullName ?? '—'}
                    </td>
                    <td className="px-5 py-3 font-mono text-brand-500 dark:text-brand-300">
                      {m.phone ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <RoleBadge role="مدير" />
                    </td>
                    <td className="px-5 py-3 text-brand-500 dark:text-brand-300">
                      {new Date(m.createdAt).toLocaleDateString('ar-SA')}
                    </td>
                  </tr>
                ))
              )}
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
