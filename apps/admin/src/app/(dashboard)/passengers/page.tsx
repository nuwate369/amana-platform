'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, User, Ban, RotateCcw, Lock, Eye, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { listPassengers, type ProfileRow } from '@/app/actions/admin';
import { banUser, unbanUser } from '@/app/actions/moderation';
import { ActionDialog } from '@/components/ActionDialog';
import { UserDetailsModal } from '@/components/UserDetailsModal';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import { notify } from '@/lib/toast';
import type { UserType } from '@amana/shared-types';

/**
 * إدارة الراكبات — بيانات حقيقية (Supabase): بحث + حظر/رفع حظر مع تسجيل الحركة.
 * هوية أنثراسايت + ذهبي، RTL، دعم الوضع الداكن.
 */

type BanTarget = { row: ProfileRow; mode: 'ban' | 'unban' };

export default function PassengersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [passengers, setPassengers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banTarget, setBanTarget] = useState<BanTarget | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  // فتح تفاصيل مستخدم محدد عند القدوم من إشعار (?highlight=<id>).
  const searchParams = useSearchParams();
  useEffect(() => {
    const h = searchParams.get('highlight');
    if (h) setDetailsId(h);
  }, [searchParams]);

  const actorName =
    (user?.user_metadata?.full_name as string | undefined) || user?.email || 'مسؤول';

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listPassengers();
        if (alive) setPassengers(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error?.code === '42703') { setCanManage(true); return; }
        setCanManage((data?.user_type as UserType) === 'super_admin');
      });
  }, [user]);

  const rows = useMemo(() => {
    const q = query.trim();
    if (!q) return passengers;
    return passengers.filter(
      (p) => (p.fullName ?? '').includes(q) || (p.phone ?? '').includes(q),
    );
  }, [passengers, query]);

  async function reload() {
    setPassengers(await listPassengers());
  }

  async function doBan(reason: string) {
    if (!banTarget) return;
    setBusy(true);
    const { row, mode } = banTarget;
    const res =
      mode === 'ban'
        ? await banUser(row.id, user?.id ?? null, reason)
        : await unbanUser(row.id, user?.id ?? null);
    setBusy(false);
    if (!res.success) { notify.error(res.error); return; }
    notify.success(mode === 'ban' ? t('moderation.banSuccess', 'تم حظر الحساب') : t('moderation.unbanSuccess', 'تم رفع الحظر'));
    setBanTarget(null);
    await reload();
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center">
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Users className="h-6 w-6 text-primary shrink-0" />
          {t('passengers.title', 'إدارة الراكبات')}
          <span className="hidden text-muted-foreground/30 md:inline">/</span>
          <span className="text-sm font-normal text-muted-foreground mt-0">{t('passengers.subtitle', 'قائمة الراكبات المسجّلات ونشاطهنّ')}</span>
        </h1>
      </div>

      {/* جدول الراكبات */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {/* شريط أدوات الجدول (Toolbar) */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-card">
          <div className="relative w-full max-w-sm">
            <Search
              size={18}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('passengers.searchPlaceholder', 'ابحثي بالاسم أو رقم الجوال…')}
              className="w-full rounded-lg border border-border bg-background py-2 pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">{t('passengers.table.name', 'الاسم')}</th>
                <th className="px-5 py-3 font-medium">{t('passengers.table.phone', 'الجوال')}</th>
                <th className="px-5 py-3 font-medium">{t('passengers.table.status', 'الحالة')}</th>
                <th className="px-5 py-3 font-medium">{t('passengers.table.joinDate', 'تاريخ الانضمام')}</th>
                <th className="px-5 py-3 font-medium">{t('passengers.table.actions', 'إجراءات')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                    {t('common.loading', 'جارٍ التحميل…')}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                    {t('common.noData', 'لا توجد بيانات')}
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr key={p.id} className="text-foreground hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <User size={15} />
                        </span>
                        <span className="font-medium text-foreground flex items-center gap-1.5">
                          {p.isProtected && <Lock size={13} className="text-amber-500" />}
                          {p.fullName ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-muted-foreground">{p.phone ?? '—'}</td>
                    <td className="px-5 py-3">
                      {p.isActive ? (
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          {t('passengers.status.active', 'نشطة')}
                        </span>
                      ) : (
                        <span
                          className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive"
                          title={p.banReason ?? undefined}
                        >
                          {t('passengers.status.banned', 'محظورة')}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setDetailsId(p.id)}
                          title={t('common.viewDetails', 'عرض التفاصيل')}
                          className="inline-flex items-center justify-center rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                        >
                          <Eye size={15} />
                        </button>
                        {!canManage ? null : p.isProtected ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                            <Lock size={13} /> {t('common.protected', 'محمي')}
                          </span>
                        ) : p.isActive ? (
                          <button
                            onClick={() => setBanTarget({ row: p, mode: 'ban' })}
                            className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                          >
                            <Ban size={14} /> {t('passengers.actions.ban', 'حظر')}
                          </button>
                        ) : (
                          <button
                            onClick={() => setBanTarget({ row: p, mode: 'unban' })}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/10"
                          >
                            <RotateCcw size={14} /> {t('passengers.actions.unban', 'رفع الحظر')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ActionDialog
        open={!!banTarget}
        title={banTarget?.mode === 'ban' ? t('passengers.ban.title', 'حظر الراكبة') : t('passengers.unban.title', 'رفع الحظر')}
        variant={banTarget?.mode === 'ban' ? 'danger' : 'primary'}
        targetName={banTarget?.row.fullName}
        actorName={actorName}
        requireReason={banTarget?.mode === 'ban'}
        reasonLabel={t('passengers.ban.reasonLabel', 'سبب الحظر')}
        reasonPlaceholder={t('passengers.ban.reasonPlaceholder', 'مثال: سلوك مخالف لشروط الاستخدام…')}
        description={
          banTarget?.mode === 'unban' ? (
            <>{t('passengers.unban.confirmDesc', 'هل تريد رفع الحظر عن ')}<strong>{banTarget?.row.fullName ?? t('passengers.unban.thisAccount', 'هذا الحساب')}</strong>{t('passengers.unban.confirmDescSuffix', ' وإعادة تفعيله؟')}</>
          ) : undefined
        }
        confirmLabel={banTarget?.mode === 'ban' ? t('passengers.ban.confirmBtn', 'تأكيد الحظر') : t('passengers.unban.confirmBtn', 'رفع الحظر')}
        loading={busy}
        onConfirm={doBan}
        onClose={() => setBanTarget(null)}
      />

      {/* نافذة التفاصيل */}
      <UserDetailsModal userId={detailsId} kind="passenger" onClose={() => setDetailsId(null)} />
    </div>
  );
}
