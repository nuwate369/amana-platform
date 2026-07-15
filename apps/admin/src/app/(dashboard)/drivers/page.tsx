'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Car, Ban, RotateCcw, Lock, Eye, ShieldCheck, Trash2, FileSearch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { listDrivers, type DriverRow } from '@/app/actions/admin';
import { banUser, unbanUser, approveDriver, rejectDriver, deleteUser } from '@/app/actions/moderation';
import { ActionDialog } from '@/components/ActionDialog';
import { UserDetailsModal } from '@/components/UserDetailsModal';
import { FilterToolbar, type FilterConfig } from '@/components/ui/FilterToolbar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import { notify } from '@/lib/toast';
import type { UserType } from '@amana/shared-types';

/**
 * إدارة السائقات — بيانات حقيقية (Supabase): مراجعة KYC (قبول/رفض) + حظر/رفع حظر،
 * كل حركة تُسجَّل في audit_logs. هوية أنثراسايت + ذهبي، RTL، دعم الوضع الداكن.
 */

export default function DriversPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const isRtl = lang === 'ar';

  // خريطة الحالة المعروضة → التسمية. «مسودّة» حالة اشتقاقية (pending لم تُرسَل بعد).
  const STATUS_LABELS: Record<string, string> = {
    approved: t('drivers.filters.active', 'نشطة'),
    pending: t('drivers.filters.pending', 'قيد المراجعة'),
    draft: t('drivers.filters.draft', 'مسودّة'),
    rejected: t('drivers.filters.rejected', 'مرفوضة'),
  };

  // الحالة المعروضة: سائقة pending لم تضغط «إرسال» بعد ⇒ «مسودّة» لا «قيد المراجعة».
  const displayStatusOf = (d: DriverRow): string =>
    d.status === 'pending' && !d.submitted ? 'draft' : d.status;

function StatusBadge({ label }: { label: string }) {
  const map: Record<string, string> = {
    نشطة: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    'قيد المراجعة': 'bg-primary/10 text-primary',
    مسودّة: 'bg-muted text-muted-foreground',
    مرفوضة: 'bg-destructive/10 text-destructive',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[label] ?? 'bg-muted text-muted-foreground'}`}>
      {label}
    </span>
  );
}

type BanTarget = { row: DriverRow; mode: 'ban' | 'unban' };
type KycTarget = { row: DriverRow; mode: 'approve' | 'reject' };
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'status'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState('');
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [busy, setBusy] = useState(false);

  const [banTarget, setBanTarget] = useState<BanTarget | null>(null);
  const [kycTarget, setKycTarget] = useState<KycTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriverRow | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  // فتح تفاصيل مستخدم محدد عند القدوم من إشعار (?highlight=<id>).
  const searchParams = useSearchParams();
  useEffect(() => {
    const h = searchParams.get('highlight');
    if (h) setDetailsId(h);
  }, [searchParams]);

  const actorName =
    (user?.user_metadata?.full_name as string | undefined) || user?.email || 'مسؤول';

  async function reload() {
    const data = await listDrivers();
    setDrivers(data);
  }

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

  // صلاحية الإدارة: super_admin فقط (متسامح قبل تطبيق الهجرة)
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

  // تصفية + بحث + ترتيب على جانب العميل.
  const filtered = useMemo(() => {
    let result = drivers;

    if (statusFilter) {
      result =
        statusFilter === 'banned'
          ? result.filter((d) => !d.isActive)
          : result.filter((d) => displayStatusOf(d) === statusFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (d) =>
          (d.fullName ?? '').toLowerCase().includes(q) ||
          (d.phone ?? '').toLowerCase().includes(q),
      );
    }

    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = (a.fullName ?? '').localeCompare(b.fullName ?? '', 'ar');
      else if (sortBy === 'status') cmp = (a.status ?? '').localeCompare(b.status ?? '', 'ar');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [drivers, statusFilter, search, sortBy, sortDir]);

  // خيارات الترتيب لشريط الأدوات (لا يوجد حقل تاريخ في DriverRow).
  const sortOptions = [
    { value: 'name', label: lang === 'ar' ? 'الاسم' : 'Name' },
    { value: 'status', label: lang === 'ar' ? 'الحالة' : 'Status' },
  ];

  // شريحة فلتر الحالة (نشطة/قيد المراجعة/مرفوضة/محظورة).
  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: lang === 'ar' ? 'كل الحالات' : 'All statuses',
      icon: ShieldCheck,
      value: statusFilter,
      options: [
        { value: 'approved', label: lang === 'ar' ? 'نشطة' : 'Active' },
        { value: 'pending', label: lang === 'ar' ? 'قيد المراجعة' : 'Under review' },
        { value: 'draft', label: lang === 'ar' ? 'مسودّة' : 'Draft' },
        { value: 'rejected', label: lang === 'ar' ? 'مرفوضة' : 'Rejected' },
        { value: 'banned', label: lang === 'ar' ? 'محظورة' : 'Banned' },
      ],
    },
  ];

  const hasActiveFilters = Boolean(search.trim() || statusFilter);

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

  async function doKyc(reason: string) {
    if (!kycTarget) return;
    setBusy(true);
    const { row, mode } = kycTarget;
    const res =
      mode === 'approve'
        ? await approveDriver(row.id, user?.id ?? null)
        : await rejectDriver(row.id, user?.id ?? null, reason);
    setBusy(false);
    if (!res.success) { notify.error(res.error); return; }
    notify.success(mode === 'approve' ? t('drivers.kyc.approveSuccess', 'تم قبول السائقة') : t('drivers.kyc.rejectSuccess', 'تم رفض الطلب'));
    setKycTarget(null);
    await reload();
  }

  // قبول/رفض من داخل نافذة مراجعة المستندات: نغلق النافذة ونفتح حوار التأكيد/السبب.
  function reviewDecision(mode: 'approve' | 'reject') {
    const row = drivers.find((d) => d.id === detailsId);
    if (!row) return;
    setDetailsId(null);
    setKycTarget({ row, mode });
  }

  async function doDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await deleteUser(deleteTarget.id, user?.id ?? null);
    setBusy(false);
    if (!res.success) { notify.error(res.error); return; }
    notify.success(t('drivers.delete.success', 'تم حذف الحساب نهائيًا'));
    setDeleteTarget(null);
    await reload();
  }

  return (
    <div className="space-y-4">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center">
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Car className="h-6 w-6 text-primary shrink-0" />
          {t('drivers.title', 'إدارة السائقات')}
          <span className="hidden text-muted-foreground/30 md:inline">/</span>
          <span className="text-sm font-normal text-muted-foreground mt-0">{t('drivers.subtitle', 'إدارة طلبات وسائقات المنصة')}</span>
        </h1>
      </div>

      {/* شريط الفلاتر — بطاقة مستقلّة عن الجدول كي تطفو القوائم بلا قصّ */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-4">
        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={lang === 'ar' ? 'ابحثي بالاسم أو الجوال…' : 'Search by name or phone…'}
          sortOptions={sortOptions}
          sort={{ value: sortBy, dir: sortDir }}
          onSortChange={(v) => setSortBy(v as typeof sortBy)}
          onSortDirToggle={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          filters={filterConfigs}
          onFilterChange={(key, value) => {
            if (key === 'status') setStatusFilter(value);
          }}
          defaultOpen
          lang={lang}
          isRtl={isRtl}
        />
      </div>

      {/* جدول السائقات */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">{t('drivers.table.name', 'الاسم')}</th>
                <th className="px-5 py-3 font-medium">{t('drivers.table.phone', 'الجوال')}</th>
                <th className="px-5 py-3 font-medium">{t('drivers.table.vehicle', 'المركبة')}</th>
                <th className="px-5 py-3 font-medium">{t('drivers.table.status', 'الحالة')}</th>
                <th className="px-5 py-3 font-medium">{t('drivers.table.actions', 'إجراءات')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                    {t('common.loading', 'جارٍ التحميل…')}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                    {hasActiveFilters
                      ? (lang === 'ar' ? 'لا توجد نتائج تطابق البحث.' : 'No results match your filters.')
                      : t('common.noData', 'لا توجد بيانات')}
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="text-foreground hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Car size={15} />
                        </span>
                        <span className="font-medium text-foreground flex items-center gap-1.5">
                          {d.isProtected && <Lock size={13} className="text-amber-500" />}
                          {d.fullName ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-muted-foreground">{d.phone ?? '—'}</td>
                    <td className="px-5 py-3">{d.vehicle}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge label={STATUS_LABELS[displayStatusOf(d)] ?? d.status} />
                        {!d.isActive && (
                          <span
                            className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive"
                            title={d.banReason ?? undefined}
                          >
                            {t('drivers.status.banned', 'محظورة')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {d.status === 'approved' || displayStatusOf(d) === 'draft' ? (
                          <button
                            onClick={() => setDetailsId(d.id)}
                            title={t('common.viewDetails', 'عرض التفاصيل')}
                            className="inline-flex items-center justify-center rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                          >
                            <Eye size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setDetailsId(d.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                          >
                            <FileSearch size={14} /> {t('drivers.kyc.reviewDocsBtn', 'مراجعة المستندات')}
                          </button>
                        )}
                        {!canManage ? null : d.isProtected ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                            <Lock size={13} /> {t('common.protected', 'محمي')}
                          </span>
                        ) : (
                          <>
                            {d.isActive ? (
                              <button
                                onClick={() => setBanTarget({ row: d, mode: 'ban' })}
                                className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                              >
                                <Ban size={14} /> {t('drivers.actions.ban', 'حظر')}
                              </button>
                            ) : (
                              <button
                                onClick={() => setBanTarget({ row: d, mode: 'unban' })}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/10"
                              >
                                <RotateCcw size={14} /> {t('drivers.actions.unban', 'رفع الحظر')}
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteTarget(d)}
                              title={t('common.deletePermanent', 'حذف نهائي')}
                              className="inline-flex items-center justify-center rounded-lg border border-destructive/30 p-1.5 text-destructive transition-colors hover:bg-destructive hover:text-white"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
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

      {/* حوار الحظر / رفع الحظر */}
      <ActionDialog
        open={!!banTarget}
        title={banTarget?.mode === 'ban' ? t('drivers.ban.title', 'حظر السائقة') : t('drivers.unban.title', 'رفع الحظر')}
        variant={banTarget?.mode === 'ban' ? 'danger' : 'primary'}
        targetName={banTarget?.row.fullName}
        actorName={actorName}
        requireReason={banTarget?.mode === 'ban'}
        reasonLabel={t('drivers.ban.reasonLabel', 'سبب الحظر')}
        reasonPlaceholder={t('drivers.ban.reasonPlaceholder', 'مثال: مخالفة شروط الاستخدام…')}
        description={
          banTarget?.mode === 'unban' ? (
            <>{t('drivers.unban.confirmDesc', 'هل تريد رفع الحظر عن ')}<strong>{banTarget?.row.fullName ?? t('drivers.unban.thisAccount', 'هذا الحساب')}</strong>{t('drivers.unban.confirmDescSuffix', ' وإعادة تفعيله؟')}</>
          ) : undefined
        }
        confirmLabel={banTarget?.mode === 'ban' ? t('drivers.ban.confirmBtn', 'تأكيد الحظر') : t('drivers.unban.confirmBtn', 'رفع الحظر')}
        loading={busy}
        onConfirm={doBan}
        onClose={() => setBanTarget(null)}
      />

      {/* حوار قبول / رفض KYC */}
      <ActionDialog
        open={!!kycTarget}
        title={kycTarget?.mode === 'approve' ? t('drivers.kyc.approveTitle', 'قبول السائقة') : t('drivers.kyc.rejectTitle', 'رفض طلب KYC')}
        variant={kycTarget?.mode === 'approve' ? 'primary' : 'danger'}
        targetName={kycTarget?.row.fullName}
        actorName={actorName}
        requireReason={kycTarget?.mode === 'reject'}
        reasonLabel={t('drivers.kyc.rejectReasonLabel', 'سبب الرفض')}
        reasonPlaceholder={t('drivers.kyc.rejectReasonPlaceholder', 'مثال: المستندات غير واضحة…')}
        description={
          kycTarget?.mode === 'approve' ? (
            <>{t('drivers.kyc.approveConfirmDesc', 'هل تريد قبول ')}<strong>{kycTarget?.row.fullName ?? t('drivers.kyc.thisDriver', 'هذه السائقة')}</strong>{t('drivers.kyc.approveConfirmDescSuffix', ' وتفعيل حسابها؟')}</>
          ) : undefined
        }
        confirmLabel={kycTarget?.mode === 'approve' ? t('drivers.kyc.approveConfirmBtn', 'قبول') : t('drivers.kyc.rejectConfirmBtn', 'تأكيد الرفض')}
        loading={busy}
        onConfirm={doKyc}
        onClose={() => setKycTarget(null)}
      />

      {/* حوار الحذف النهائي */}
      <ActionDialog
        open={!!deleteTarget}
        title={t('drivers.delete.title', 'حذف السائقة نهائيًا')}
        variant="danger"
        targetName={deleteTarget?.fullName}
        actorName={actorName}
        requireReason={false}
        description={
          <>
            {t('drivers.delete.confirmDesc', 'سيُحذف ')}
            <strong>{deleteTarget?.fullName ?? t('common.thisAccount', 'هذا الحساب')}</strong>
            {t('drivers.delete.confirmDescSuffix', ' نهائيًا مع كل بياناته (المستندات، التقييمات، ارتباط الرحلات). لا يمكن التراجع عن هذا الإجراء.')}
          </>
        }
        confirmLabel={t('drivers.delete.confirmBtn', 'تأكيد الحذف النهائي')}
        loading={busy}
        onConfirm={doDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* نافذة مراجعة المستندات + قرار القبول/الرفض في أسفلها */}
      <UserDetailsModal
        userId={detailsId}
        kind="driver"
        onClose={() => setDetailsId(null)}
        onApprove={canManage ? () => reviewDecision('approve') : undefined}
        onReject={canManage ? () => reviewDecision('reject') : undefined}
      />
    </div>
  );
}
