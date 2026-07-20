'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Smartphone,
  Upload,
  Plus,
  X,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  Download,
  Tag,
  CircleCheck,
  Pencil,
  ExternalLink,
  Star,
  Link2,
} from 'lucide-react';
import {
  listReleases,
  createRelease,
  createUploadTicket,
  publicUrlFor,
  nextVersionCode,
  setReleasePublished,
  deleteRelease,
  updateRelease,
  listAppReviews,
  setReviewVisible,
  type ReleaseRow,
  type ReleaseApp,
  type ReleaseReview,
} from './actions';
import { Button } from '@/components/ui/Button';
import { ActionDialog } from '@/components/ActionDialog';
import { FilterToolbar, type FilterConfig } from '@/components/ui/FilterToolbar';
import { DateRangePicker, type DateRange } from '@/components/ui/DateRangePicker';
import { supabase } from '@/lib/supabase/client';
import { notify } from '@/lib/toast';

/**
 * إصدارات التطبيقات — رفع ملفّ APK وتسجيل رقم البناء.
 *
 * التطبيقات المثبَّتة تقارن رقمها بأحدث إصدار منشور عند كل إقلاع، فتظهر
 * لصاحبته نافذة «تحديث متاح» مع رابط التنزيل. التعديلات الخفيفة (JS) لا تمرّ
 * من هنا — تصل تلقائيًّا عبر EAS Update.
 */

/** يزيل بادئة v الزائدة إن كتبتها الإدارة (v0.3.0 ← 0.3.0). */
const cleanVersion = (v: string) => v.replace(/^v/i, '');

const APP_LABEL: Record<ReleaseApp, string> = {
  passenger: 'تطبيق الراكبة',
  driver: 'تطبيق السائقة',
};

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} ميجابايت`;
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Tag;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon size={18} />
      </span>
      <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/** بداية/نهاية اليوم — لجعل مدى التاريخ شاملًا لطرفيه. */
const dayStart = (d: Date) => new Date(d).setHours(0, 0, 0, 0);
const dayEnd = (d: Date) => new Date(d).setHours(23, 59, 59, 999);

export default function ReleasesPage() {
  const [rows, setRows] = useState<ReleaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReleaseRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewTarget, setViewTarget] = useState<ReleaseRow | null>(null);
  const [editTarget, setEditTarget] = useState<ReleaseRow | null>(null);
  const [publishTarget, setPublishTarget] = useState<ReleaseRow | null>(null);
  const [publishing, setPublishing] = useState(false);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'versionCode' | 'downloads'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [appFilter, setAppFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });

  const refresh = useCallback(async () => {
    setLoading(true);
    setRows(await listReleases());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filterConfigs: FilterConfig[] = [
    {
      key: 'app',
      label: 'كل التطبيقات',
      icon: Smartphone,
      value: appFilter,
      options: [
        { value: 'passenger', label: APP_LABEL.passenger },
        { value: 'driver', label: APP_LABEL.driver },
      ],
    },
    {
      key: 'status',
      label: 'كل الحالات',
      icon: CircleCheck,
      value: statusFilter,
      options: [
        { value: 'published', label: 'منشور' },
        { value: 'hidden', label: 'مخفي' },
        { value: 'mandatory', label: 'إلزامي' },
      ],
    },
  ];

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateRange.from ? dayStart(dateRange.from) : null;
    const to = dateRange.to ? dayEnd(dateRange.to) : null;

    const list = rows.filter((r) => {
      if (appFilter && r.app !== appFilter) return false;
      if (statusFilter === 'published' && !r.published) return false;
      if (statusFilter === 'hidden' && r.published) return false;
      if (statusFilter === 'mandatory' && !r.mandatory) return false;

      const at = new Date(r.createdAt).getTime();
      if (from != null && at < from) return false;
      if (to != null && at > to) return false;

      if (!q) return true;
      return (
        r.versionName.toLowerCase().includes(q) ||
        String(r.versionCode).includes(q) ||
        APP_LABEL[r.app].includes(q) ||
        (r.notes ?? '').toLowerCase().includes(q)
      );
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      if (sortBy === 'versionCode') return (a.versionCode - b.versionCode) * dir;
      if (sortBy === 'downloads')
        return (a.installs + a.updates - (b.installs + b.updates)) * dir;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    });
  }, [rows, search, appFilter, statusFilter, dateRange, sortBy, sortDir]);

  const totals = useMemo(
    () =>
      visible.reduce(
        (acc, r) => ({
          installs: acc.installs + r.installs,
          updates: acc.updates + r.updates,
        }),
        { installs: 0, updates: 0 },
      ),
    [visible],
  );

  async function confirmTogglePublished() {
    if (!publishTarget) return;
    setPublishing(true);
    const ok = await setReleasePublished(publishTarget.id, !publishTarget.published);
    setPublishing(false);
    if (!ok) return notify.error('تعذّر تغيير حالة النشر');
    notify.success(publishTarget.published ? 'أُخفي الإصدار' : 'نُشر الإصدار');
    setPublishTarget(null);
    void refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const ok = await deleteRelease(deleteTarget.id);
    setDeleting(false);
    if (!ok) return notify.error('تعذّر حذف الإصدار');
    notify.success('حُذف الإصدار');
    setDeleteTarget(null);
    void refresh();
  }

  return (
    <div dir="rtl" className="space-y-4">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Smartphone className="h-6 w-6 shrink-0 text-primary" />
          إصدارات التطبيقات
          <span className="hidden text-muted-foreground/30 md:inline">/</span>
          <span className="mt-0 text-sm font-normal text-muted-foreground">
            رفع ملفّات APK وإدارة نافذة التحديث
          </span>
        </h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={18} className="ms-1" />
          إصدار جديد
        </Button>
      </div>

      {/* إجماليات المدى المعروض */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="إصدارات معروضة" value={visible.length} icon={Tag} />
        <StatCard label="تثبيت أوّل" value={totals.installs} icon={Download} />
        <StatCard label="تحديث" value={totals.updates} icon={CircleCheck} />
      </div>

      {/* شريط الفلاتر — بطاقة مستقلّة عن الجدول كي تطفو القوائم بلا قصّ */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="ابحثي برقم الإصدار أو البناء أو الملاحظات…"
          sortOptions={[
            { value: 'date', label: 'التاريخ' },
            { value: 'versionCode', label: 'رقم البناء' },
            { value: 'downloads', label: 'التنزيلات' },
          ]}
          sort={{ value: sortBy, dir: sortDir }}
          onSortChange={(v) => setSortBy(v as typeof sortBy)}
          onSortDirToggle={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          filters={filterConfigs}
          onFilterChange={(key, value) => {
            if (key === 'app') setAppFilter(value);
            else if (key === 'status') setStatusFilter(value);
          }}
          filterLead={
            <DateRangePicker value={dateRange} onChange={setDateRange} lang="ar" isRtl />
          }
          defaultOpen
          lang="ar"
          isRtl
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          {rows.length === 0 ? 'لا توجد إصدارات مسجَّلة بعد.' : 'لا نتائج مطابقة للفلاتر.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">التطبيق</th>
                <th className="px-5 py-3 font-medium">الإصدار</th>
                <th className="px-5 py-3 font-medium">رقم البناء</th>
                <th className="px-5 py-3 font-medium">تثبيت</th>
                <th className="px-5 py-3 font-medium">تحديث</th>
                <th className="px-5 py-3 font-medium">الحالة</th>
                <th className="px-5 py-3 font-medium">التعليقات</th>
                <th className="px-5 py-3 font-medium">التاريخ</th>
                <th className="px-5 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="px-5 py-3 text-foreground">{APP_LABEL[r.app]}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{cleanVersion(r.versionName)}</td>
                  <td className="px-5 py-3 tabular-nums text-muted-foreground">{r.versionCode}</td>
                  <td className="px-5 py-3 tabular-nums font-medium text-foreground">{r.installs}</td>
                  <td className="px-5 py-3 tabular-nums font-medium text-foreground">{r.updates}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.published
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {r.published ? 'منشور' : 'مخفي'}
                    </span>
                    {r.mandatory && (
                      <span className="me-2 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                        إلزامي
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {r.reviewsTotal === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <button
                        onClick={() => setViewTarget(r)}
                        title="عرض الآراء"
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm hover:bg-accent"
                      >
                        <Star size={14} className="fill-amber-400 text-amber-400" />
                        <span className="font-medium tabular-nums text-foreground">
                          {r.reviewsVisible}
                        </span>
                        {r.reviewsTotal > r.reviewsVisible && (
                          <span className="text-xs text-muted-foreground">
                            من {r.reviewsTotal}
                          </span>
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString('ar-SA', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewTarget(r)}
                        title="عرض التفاصيل"
                        className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => setEditTarget(r)}
                        title="تعديل"
                        className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Pencil size={16} />
                      </button>
                      <a
                        href={r.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="تنزيل الملفّ"
                        className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Download size={16} />
                      </a>
                      <button
                        onClick={() => setPublishTarget(r)}
                        title={r.published ? 'إخفاء عن المستخدمات' : 'نشر للمستخدمات'}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        {r.published ? <EyeOff size={16} /> : <CircleCheck size={16} />}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(r)}
                        title="حذف"
                        className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <ActionDialog
        open={deleteTarget != null}
        title="حذف الإصدار"
        description={
          deleteTarget ? (
            <>
              سيُحذف <b>{APP_LABEL[deleteTarget.app]}</b> إصدار{' '}
              <b>{deleteTarget.versionName}</b> (بناء {deleteTarget.versionCode}) من السجلّ.
              {deleteTarget.published && (
                <> وهو <b>منشور حاليًّا</b>، فستتوقّف نافذة التحديث عن الإشارة إليه فورًا.</>
              )}
              <br />
              ملفّ APK نفسه يبقى على رابطه ولا يُحذف.
            </>
          ) : null
        }
        variant="danger"
        confirmLabel="حذف نهائيًّا"
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleteTarget(null)}
      />

      <ActionDialog
        open={publishTarget != null}
        title={publishTarget?.published ? 'إخفاء الإصدار' : 'نشر الإصدار'}
        description={
          publishTarget ? (
            publishTarget.published ? (
              <>
                سيختفي <b>{APP_LABEL[publishTarget.app]}</b> إصدار{' '}
                <b>{publishTarget.versionName}</b> عن صفحة التحميل، وتتوقّف نافذة التحديث
                عن الإشارة إليه. من ثبّتته مسبقًا لن يتأثّر.
              </>
            ) : (
              <>
                سيظهر <b>{APP_LABEL[publishTarget.app]}</b> إصدار{' '}
                <b>{publishTarget.versionName}</b> على صفحة التحميل، وستظهر نافذة
                «تحديث متاح» لكل من لديها رقم بناء أقلّ من {publishTarget.versionCode}.
              </>
            )
          ) : null
        }
        variant={publishTarget?.published ? 'danger' : 'primary'}
        confirmLabel={publishTarget?.published ? 'إخفاء' : 'نشر'}
        loading={publishing}
        onConfirm={() => void confirmTogglePublished()}
        onClose={() => setPublishTarget(null)}
      />

      {viewTarget && (
        <ReleaseDetailsModal release={viewTarget} onClose={() => setViewTarget(null)} />
      )}

      {(modalOpen || editTarget) && (
        <ReleaseModal
          initial={editTarget ?? undefined}
          onClose={() => {
            setModalOpen(false);
            setEditTarget(null);
          }}
          onSaved={() => {
            setModalOpen(false);
            setEditTarget(null);
            void refresh();
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────── نافذة تفاصيل الإصدار ─────────────────────── */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 text-end text-sm font-medium text-foreground">{children}</span>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={13}
          className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}
        />
      ))}
    </span>
  );
}

/**
 * تفاصيل إصدار واحد + آراء مستخدمات التطبيق.
 *
 * الآراء مرتبطة بالتطبيق لا برقم البناء (المستخدمة تقيّم التطبيق لا الإصدار)،
 * فتُعرض هنا كاملةً — بما فيها المخفيّة — مع إمكانية إظهار أيّ رأي أو إخفائه
 * عن صفحة التحميل العامّة.
 */
function ReleaseDetailsModal({
  release,
  onClose,
}: {
  release: ReleaseRow;
  onClose: () => void;
}) {
  const [reviews, setReviews] = useState<ReleaseReview[] | null>(null);

  const load = useCallback(async () => {
    setReviews(await listAppReviews(release.app));
  }, [release.app]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleReview(r: ReleaseReview) {
    const ok = await setReviewVisible(r.id, !r.visible);
    if (!ok) return notify.error('تعذّر تغيير حالة الرأي');
    notify.success(r.visible ? 'أُخفي الرأي' : 'أُظهر الرأي');
    void load();
  }

  const notes = (release.notes ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const shown = reviews?.filter((r) => r.visible) ?? [];
  const avg = shown.length
    ? (shown.reduce((a, r) => a + r.rating, 0) / shown.length).toFixed(1)
    : '—';

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* الترويسة خارج منطقة التمرير: العمود المتدفّق يجعل الجسم وحده هو
          الذي يمرّر، فيبقى العنوان وزرّ الإغلاق ثابتين مهما طال المحتوى. */}
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl duration-200 animate-in fade-in zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-card px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {APP_LABEL[release.app]} — {cleanVersion(release.versionName)}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              رقم البناء {release.versionCode}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="تثبيت أوّل" value={release.installs} icon={Download} />
          <StatCard label="تحديث" value={release.updates} icon={CircleCheck} />
          <div className="rounded-xl border border-border bg-card p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/10 text-amber-500">
              <Star size={18} />
            </span>
            <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">{avg}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">متوسّط التقييم</p>
          </div>
        </div>

        <div className="mt-6">
          <Row label="الحالة">
            {release.mandatory && (
              <span className="me-2 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                إلزامي
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                release.published
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {release.published ? 'منشور' : 'مخفي'}
            </span>
          </Row>
          <Row label="تاريخ التسجيل">
            {new Date(release.createdAt).toLocaleString('ar-SA', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}
          </Row>
          <Row label="رابط التنزيل">
            <a
              href={release.downloadUrl}
              target="_blank"
              rel="noreferrer"
              dir="ltr"
              className="inline-flex max-w-[22rem] items-center gap-1.5 truncate text-primary hover:underline"
            >
              <Link2 size={14} className="shrink-0" />
              <span className="truncate">{release.downloadUrl}</span>
              <ExternalLink size={13} className="shrink-0" />
            </a>
          </Row>
        </div>

        {notes.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-bold text-foreground">ما الجديد</h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {notes.map((n) => (
                <li key={n} className="text-sm text-muted-foreground">
                  · {n}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 border-t border-border pt-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Star size={15} className="fill-amber-400 text-amber-400" />
            آراء مستخدمات {APP_LABEL[release.app]}
            {reviews && reviews.length > 0 && (
              <span className="font-normal text-muted-foreground">
                — {shown.length} ظاهر من {reviews.length}
              </span>
            )}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            الآراء المخفيّة لا تظهر للزوّار على صفحة التحميل، ولا تدخل في متوسّط التقييم.
          </p>

          {reviews === null ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد آراء بعد.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className={`rounded-xl border p-4 ${
                    r.visible
                      ? 'border-border bg-card'
                      : 'border-dashed border-border bg-muted/40'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="text-sm font-bold text-foreground">{r.name}</span>
                    <Stars value={r.rating} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString('ar-SA')}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        r.visible
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {r.visible ? 'ظاهر للجميع' : 'مخفي'}
                    </span>
                  </div>

                  {r.comment ? (
                    <p className="mt-2.5 text-sm leading-relaxed text-foreground/90">
                      {r.comment}
                    </p>
                  ) : (
                    <p className="mt-2.5 text-sm italic text-muted-foreground">
                      تقييم بلا تعليق
                    </p>
                  )}

                  <div className="mt-3 flex justify-end border-t border-border/60 pt-3">
                    <button
                      onClick={() => void toggleReview(r)}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        r.visible
                          ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                    >
                      {r.visible ? <EyeOff size={15} /> : <Eye size={15} />}
                      {r.visible ? 'إخفاء' : 'إظهار'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

function ReleaseModal({
  initial,
  onClose,
  onSaved,
}: {
  /** عند تمريره تعمل النافذة في وضع التعديل بدل الإنشاء. */
  initial?: ReleaseRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = initial != null;
  const [app, setApp] = useState<ReleaseApp>(initial?.app ?? 'passenger');
  const [versionCode, setVersionCode] = useState(
    initial ? String(initial.versionCode) : '',
  );

  // في الإنشاء يُقترح رقم البناء آليًّا (آخر رقم + 1) فلا حاجة لتذكّره؛
  // وفي التعديل نُبقي رقم الإصدار كما هو حتى لا نكسر مطابقته للنسخ المثبَّتة.
  useEffect(() => {
    if (editing) return;
    let alive = true;
    void nextVersionCode(app).then((n) => {
      if (!alive) return;
      setVersionCode(String(n.code));
      setVersionName(n.name);
    });
    return () => {
      alive = false;
    };
  }, [app, editing]);
  const [versionName, setVersionName] = useState(initial?.versionName ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [mandatory, setMandatory] = useState(initial?.mandatory ?? false);
  const [published, setPublished] = useState(initial?.published ?? true);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'upload' | 'link'>(editing ? 'link' : 'upload');
  const [link, setLink] = useState(initial?.downloadUrl ?? '');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  // يُرفع بأوّل تفاعل حقيقي فقط. المقارنة بالقيم وحدها لا تكفي: النموذج يُعبَّأ
  // آليًّا (رقم البناء واسم الإصدار)، فيبدو «معدَّلًا» قبل أن تلمسه المستخدمة.
  const [touched, setTouched] = useState(false);

  /** هل أدخلت المستخدمة شيئًا يستحقّ التحذير عند الإغلاق؟ */
  const changed = editing
    ? versionName !== initial.versionName ||
      notes !== (initial.notes ?? '') ||
      link !== initial.downloadUrl ||
      mandatory !== initial.mandatory ||
      published !== initial.published ||
      file != null
    : versionName.trim() !== '' || notes.trim() !== '' || link.trim() !== '' || file != null;
  const dirty = touched && changed;

  /** الإغلاق يمرّ من هنا: يمنع الخروج أثناء الرفع، ويحذّر إن كان هناك عمل غير محفوظ. */
  function requestClose() {
    if (busy) return;
    if (dirty) {
      setConfirmClose(true);
      return;
    }
    onClose();
  }

  // الخروج بمفتاح Escape يتبع نفس الحماية.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // تحذير المتصفّح عند إغلاق التبويب أثناء الرفع أو مع تعديلات غير محفوظة.
  useEffect(() => {
    if (!busy && !dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [busy, dirty]);

  async function submit() {
    if (mode === 'upload' && !file) return notify.error('اختاري ملفّ APK أولًا');
    if (mode === 'link' && !link.trim()) return notify.error('الصقي رابط التنزيل');

    setBusy(true);
    try {
      let downloadUrl = link.trim();

      if (mode === 'upload' && file) {
        // الرفع من المتصفّح مباشرةً إلى المستودع — لا يمرّ الملفّ عبر الخادم.
        setStage('جارٍ تجهيز الرفع…');
        const ticket = await createUploadTicket(app, Number(versionCode));
        if (!ticket.ok) {
          notify.error(ticket.error);
          return;
        }

        setStage(`جارٍ رفع ${formatSize(file.size)}…`);
        const { error } = await supabase.storage
          .from('app-releases')
          .uploadToSignedUrl(ticket.path, ticket.token, file, {
            contentType: 'application/vnd.android.package-archive',
          });

        if (error) {
          notify.error(
            `تعذّر الرفع: ${error.message} — إن كان الملفّ أكبر من حدّ التخزين، استخدمي «رابط خارجي».`,
          );
          return;
        }
        downloadUrl = await publicUrlFor(ticket.path);
      }

      setStage('جارٍ حفظ الإصدار…');
      const payload = {
        app,
        versionCode: Number(versionCode),
        versionName,
        notes,
        mandatory,
        published,
        downloadUrl,
      };
      const res = editing
        ? await updateRelease(initial.id, payload)
        : await createRelease(payload);
      if (!res.ok) {
        notify.error(res.error);
        return;
      }
      notify.success(editing ? 'حُفظ التعديل' : 'حُفظ الإصدار بنجاح');
      onSaved();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'حدث خطأ أثناء الرفع');
    } finally {
      setBusy(false);
      setStage('');
    }
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={requestClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl duration-200 animate-in fade-in zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">
            {editing ? 'تعديل الإصدار' : 'إصدار جديد'}
          </h2>
          <button
            onClick={requestClose}
            disabled={busy}
            aria-label="إغلاق"
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
        {/* fieldset يجمّد كل الحقول والأزرار داخله أثناء الرفع بلا تكرار disabled */}
        <fieldset
          disabled={busy}
          className="space-y-4 transition-opacity disabled:opacity-60"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">التطبيق</label>
            <div className="flex gap-2">
              {(['passenger', 'driver'] as ReleaseApp[]).map((a) => (
                <button
                  key={a}
                  onClick={() => !editing && setApp(a)}
                  disabled={editing}
                  className={`flex-1 rounded-lg border px-3 py-2.5 text-sm transition-colors sm:px-4 ${
                    app === a
                      ? 'border-primary bg-primary/10 font-medium text-primary'
                      : 'border-input text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {APP_LABEL[a]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                اسم الإصدار
              </label>
              <input
                value={versionName}
                onChange={(e) => { setTouched(true); setVersionName(e.target.value); }}
                placeholder="0.2.0"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">يظهر للمستخدمات</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">رقم البناء</label>
              <input
                value={versionCode}
                onChange={(e) => { setTouched(true); setVersionCode(e.target.value.replace(/\D/g, '')); }}
                inputMode="numeric"
                disabled={editing}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground disabled:opacity-60"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {editing ? 'غير قابل للتعديل — تعتمد عليه النسخ المثبَّتة' : 'مقترح آليًّا — يجب أن يطابق app.json'}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              ما الجديد <span className="text-muted-foreground">(سطر لكل بند)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => { setTouched(true); setNotes(e.target.value); }}
              rows={4}
              placeholder={'تحسينات في الخريطة\nإصلاح إشعارات الطلبات'}
              className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">ملفّ APK</label>
              <button
                onClick={() => setMode(mode === 'upload' ? 'link' : 'upload')}
                className="text-xs font-medium text-primary hover:underline"
              >
                {mode === 'upload' ? 'استخدام رابط خارجي بدلًا من الرفع' : 'رفع ملفّ بدلًا من الرابط'}
              </button>
            </div>

            {mode === 'upload' ? (
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input p-4 hover:bg-accent">
                <Upload size={18} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {file ? `${file.name} — ${formatSize(file.size)}` : 'اضغطي لاختيار الملفّ'}
                </span>
                <input
                  type="file"
                  accept=".apk"
                  className="hidden"
                  onChange={(e) => { setTouched(true); setFile(e.target.files?.[0] ?? null); }}
                />
              </label>
            ) : (
              <>
                <input
                  value={link}
                  onChange={(e) => { setTouched(true); setLink(e.target.value); }}
                  dir="ltr"
                  placeholder="https://github.com/…/amana-passenger.apk"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  رابط مباشر لملفّ ‎.apk‎ — مناسب للملفّات التي تتجاوز حدّ التخزين.
                </p>
              </>
            )}
          </div>

          <label className="flex items-center gap-2.5 text-sm text-foreground">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => { setTouched(true); setPublished(e.target.checked); }}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            نشر الإصدار مباشرة
          </label>

          <label className="flex items-center gap-2.5 text-sm text-foreground">
            <input
              type="checkbox"
              checked={mandatory}
              onChange={(e) => { setTouched(true); setMandatory(e.target.checked); }}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            تحديث إلزامي <span className="text-muted-foreground">(لا يمكن تأجيله)</span>
          </label>
        </fieldset>

        {stage && (
          <p
            role="status"
            aria-live="polite"
            className="mt-4 flex items-center justify-center gap-2 pb-1 text-sm text-muted-foreground"
          >
            <Loader2 size={15} className="animate-spin" />
            {stage}
          </p>
        )}

        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card px-6 py-4 sm:flex-row">
          <Button onClick={() => void submit()} loading={busy} fullWidth>
            {editing ? 'حفظ التعديل' : 'حفظ ورفع'}
          </Button>
          <Button variant="outline" onClick={requestClose} disabled={busy}>
            إلغاء
          </Button>
        </div>
      </div>

      <ActionDialog
        open={confirmClose}
        title="تعديلات لم تُحفظ"
        description="لم يُحفظ الإصدار بعد. إن أغلقتِ النافذة ستفقدين ما أدخلتِه، وسيلزم اختيار الملفّ من جديد."
        variant="danger"
        confirmLabel="إغلاق دون حفظ"
        onConfirm={onClose}
        onClose={() => setConfirmClose(false)}
      />
    </div>
  );
}
