'use client';

import { UsersRound, Users, ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">مجموعات النقل المشتركة</h1>
        <p className="text-sm text-muted-foreground">
          مجموعات تنسيق الرحلات بين الراكبات — للمراقبة والإشراف فقط
        </p>
      </div>

      {/* مؤشرات */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="المجموعات النشطة" value="١٨" icon={UsersRound} />
        <StatCard label="إجمالي العضوات" value="٧٣٠" icon={Users} />
        <StatCard label="طلبات قيد المراجعة" value="٣" icon={UsersRound} />
      </div>

      {/* جدول المجموعات */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground">جميع المجموعات</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">اسم المجموعة</th>
                <th className="px-5 py-3 font-medium">المالكة</th>
                <th className="px-5 py-3 font-medium">عدد العضوات</th>
                <th className="px-5 py-3 font-medium">الحالة</th>
                <th className="px-5 py-3 font-medium">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {GROUPS.map((g) => (
                <tr key={g.id} className="text-foreground hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium">{g.name}</td>
                  <td className="px-5 py-3.5">{g.owner}</td>
                  <td className="px-5 py-3.5">{g.members.toLocaleString('ar-SA')}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={g.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/25"
                    >
                      مراجعة
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
