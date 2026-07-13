'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollText, Search, RefreshCw, ShieldAlert } from 'lucide-react';
import { can, STAFF_TYPE_LABELS, type UserType } from '@amana/shared-types';
import { listAuditLog, type AuditLogRow } from '@/app/actions/moderation';
import { auditActionMeta } from '@/lib/audit-meta';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'ban_user', label: 'حظر' },
  { key: 'unban_user', label: 'رفع حظر' },
  { key: 'approve_driver', label: 'قبول سائقة' },
  { key: 'reject_driver', label: 'رفض KYC' },
  { key: 'staff', label: 'إدارة الموظفين' },
  { key: 'rating', label: 'أسئلة التقييم' },
] as const;

/** فلاتر مجمّعة: staff/rating تطابق مجموعة أنواع. */
function matchesFilter(action: string, filter: string): boolean {
  if (filter === 'all') return true;
  if (filter === 'staff')
    return ['invite_staff', 'edit_staff', 'toggle_staff', 'resend_invite', 'delete_staff'].includes(action);
  if (filter === 'rating') return action.endsWith('_rating_question');
  return action === filter;
}

export default function AuditLogClient({ initial }: { initial: AuditLogRow[] }) {
  const { user } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => setRows(initial), [initial]);

  // بوابة الصلاحية: view_audit_log (super_admin + admin). متسامح قبل الهجرة.
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error?.code === '42703') { setAllowed(true); return; }
        const ut = data?.user_type as UserType | undefined;
        setAllowed(ut ? can(ut, 'view_audit_log') : true);
      });
  }, [user]);

  const filtered = useMemo(() => {
    const q = query.trim();
    return rows.filter((r) => {
      if (!matchesFilter(r.action, filter)) return false;
      if (!q) return true;
      return (
        (r.actorName ?? '').includes(q) ||
        (r.targetName ?? '').includes(q) ||
        (r.reason ?? '').includes(q)
      );
    });
  }, [rows, filter, query]);

  async function refresh() {
    setRefreshing(true);
    try {
      setRows(await listAuditLog());
      router.refresh();
    } finally {
      setRefreshing(false);
    }
  }

  if (allowed === false) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <p className="font-semibold text-foreground">لا تملك صلاحية عرض سجل الحركات</p>
        <p className="text-sm text-muted-foreground">هذه الصفحة متاحة للمدير العام والمدير فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <ScrollText className="h-6 w-6 text-primary shrink-0" />
            سجل الحركات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            سجلّ زمني لكل إجراء حسّاس على النظام — مَن نفّذه، على مَن، ولماذا.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          تحديث
        </button>
      </div>

      {/* أدوات التصفية */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-foreground hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search
            size={18}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث بالاسم أو السبب…"
            className="w-full rounded-lg border border-border bg-background py-2 pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* الجدول */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">الحركة</th>
                <th className="px-5 py-3 font-medium">المنفِّذ</th>
                <th className="px-5 py-3 font-medium">الهدف</th>
                <th className="px-5 py-3 font-medium">السبب</th>
                <th className="px-5 py-3 font-medium">الوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                    لا توجد حركات مسجّلة
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const meta = auditActionMeta(r.action);
                  const Icon = meta.icon;
                  return (
                    <tr key={r.id} className="text-foreground hover:bg-muted/50 transition-colors">
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
                          <Icon size={13} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{r.actorName ?? '—'}</span>
                          {r.actorType && (
                            <span className="text-xs text-muted-foreground">
                              {STAFF_TYPE_LABELS[r.actorType] ?? r.actorType}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-foreground">{r.targetName ?? '—'}</td>
                      <td className="px-5 py-3 text-muted-foreground max-w-xs truncate" title={r.reason ?? undefined}>
                        {r.reason ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleString('ar-SA', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
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
