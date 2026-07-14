'use client';

import { UsersRound, Users, ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * صفحة إدارة المجموعات المغلقة — جدول مجموعات مجتمعية ببيانات ثابتة (mock).
 * هوية أنثراسايت + ذهبي، RTL، دعم الوضع الداكن.
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
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon size={20} />
        </span>
        <div>
          <p className="text-xl font-bold text-foreground">{value}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

const GROUPS = [
  { id: 'g1', name: 'موظفات مستشفى الملك فيصل', owner: 'د. سارة العتيبي', members: 128, status: 'نشطة' },
  { id: 'g2', name: 'طالبات جامعة الأميرة نورة', owner: 'ريم القحطاني', members: 342, status: 'نشطة' },
  { id: 'g3', name: 'حي النرجس السكني', owner: 'هند الدوسري', members: 76, status: 'قيد المراجعة' },
  { id: 'g4', name: 'موظفات مجمّع الأعمال', owner: 'لمى السالم', members: 54, status: 'نشطة' },
  { id: 'g5', name: 'نادي القراءة النسائي', owner: 'دانة الحربي', members: 39, status: 'موقوفة' },
  { id: 'g6', name: 'معلمات مدارس الرواد', owner: 'أمل الغامدي', members: 91, status: 'نشطة' },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    نشطة: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    'قيد المراجعة': 'bg-primary/10 text-primary',
    موقوفة: 'bg-destructive/10 text-destructive',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? ''}`}>
      {status}
    </span>
  );
}

export default function GroupsPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center">
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <UsersRound className="h-6 w-6 text-primary shrink-0" />
          {t('groups.title', 'مجموعات النقل المشتركة')}
          <span className="hidden text-muted-foreground/30 md:inline">/</span>
          <span className="text-sm font-normal text-muted-foreground">{t('groups.subtitle', 'مجموعات تنسيق الرحلات بين الراكبات — للمراقبة والإشراف فقط')}</span>
        </h1>
      </div>

      {/* مؤشرات */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('groups.stats.active', 'المجموعات النشطة')} value="18" icon={UsersRound} />
        <StatCard label={t('groups.stats.members', 'إجمالي العضوات')} value="730" icon={Users} />
        <StatCard label={t('groups.stats.rides', 'طلبات قيد المراجعة')} value="3" icon={UsersRound} />
      </div>

      {/* جدول المجموعات */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground">{t('common.allGroups', 'جميع المجموعات')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">{t('groups.table.name', 'اسم المجموعة')}</th>
                <th className="px-5 py-3 font-medium">{t('groups.table.supervisor', 'المالكة')}</th>
                <th className="px-5 py-3 font-medium">{t('groups.table.members', 'عدد العضوات')}</th>
                <th className="px-5 py-3 font-medium">{t('groups.table.status', 'الحالة')}</th>
                <th className="px-5 py-3 font-medium">{t('groups.table.actions', 'إجراء')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {GROUPS.map((g) => (
                <tr key={g.id} className="text-foreground hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium">{g.name}</td>
                  <td className="px-5 py-3.5">{g.owner}</td>
                  <td className="px-5 py-3.5">{g.members.toLocaleString('en-US')}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={g.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/25"
                    >
                      {t('common.review', 'مراجعة')}
                      <ArrowLeft size={14} />
                    </button>
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
