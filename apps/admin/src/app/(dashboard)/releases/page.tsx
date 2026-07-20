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
} from 'lucide-react';
import {
  listReleases,
  createRelease,
  createUploadTicket,
  publicUrlFor,
  nextVersionCode,
  setReleasePublished,
  deleteRelease,
  type ReleaseRow,
  type ReleaseApp,
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

  async function togglePublished(row: ReleaseRow) {
    const ok = await setReleasePublished(row.id, !row.published);
    if (!ok) return notify.error('تعذّر تغيير حالة النشر');
    notify.success(row.published ? 'أُخفي الإصدار' : 'نُشر الإصدار');
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
                <th className="px-5 py-3 font-medium">التاريخ</th>
                <th className="px-5 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="px-5 py-3 text-foreground">{APP_LABEL[r.app]}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{r.versionName}</td>
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
                  <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString('ar-SA', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <a
                        href={r.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="تنزيل"
                        className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Download size={16} />
                      </a>
                      <button
                        onClick={() => void togglePublished(r)}
                        title={r.published ? 'إخفاء' : 'نشر'}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        {r.published ? <EyeOff size={16} /> : <Eye size={16} />}
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

      {modalOpen && (
        <ReleaseModal
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            void refresh();
          }}
        />
      )}
    </div>
  );
}

function ReleaseModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [app, setApp] = useState<ReleaseApp>('passenger');
  const [versionCode, setVersionCode] = useState('');

  // رقم البناء يُقترح آليًّا لكل تطبيق (آخر رقم + 1) ويبقى قابلًا للتعديل،
  // فلا حاجة لتذكّره أو استخراجه من app.json في كل مرّة.
  useEffect(() => {
    let alive = true;
    void nextVersionCode(app).then((n) => {
      if (alive) setVersionCode(String(n));
    });
    return () => {
      alive = false;
    };
  }, [app]);
  const [versionName, setVersionName] = useState('');
  const [notes, setNotes] = useState('');
  const [mandatory, setMandatory] = useState(false);
  const [published, setPublished] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'upload' | 'link'>('upload');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);

  /** هل أدخلت المستخدمة شيئًا يستحقّ التحذير عند الإغلاق؟ */
  const dirty =
    versionName.trim() !== '' || notes.trim() !== '' || link.trim() !== '' || file != null;

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
      const res = await createRelease({
        app,
        versionCode: Number(versionCode),
        versionName,
        notes,
        mandatory,
        published,
        downloadUrl,
      });
      if (!res.ok) {
        notify.error(res.error);
        return;
      }
      notify.success('حُفظ الإصدار بنجاح');
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={requestClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">إصدار جديد</h2>
          <button
            onClick={requestClose}
            disabled={busy}
            aria-label="إغلاق"
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        {/* fieldset يجمّد كل الحقول والأزرار داخله أثناء الرفع بلا تكرار disabled */}
        <fieldset
          disabled={busy}
          className="mt-5 space-y-4 transition-opacity disabled:opacity-60"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">التطبيق</label>
            <div className="flex gap-2">
              {(['passenger', 'driver'] as ReleaseApp[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setApp(a)}
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
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="0.2.0"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">يظهر للمستخدمات</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">رقم البناء</label>
              <input
                value={versionCode}
                onChange={(e) => setVersionCode(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">مقترح آليًّا — يجب أن يطابق app.json</p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              ما الجديد <span className="text-muted-foreground">(سطر لكل بند)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            ) : (
              <>
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
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
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            نشر الإصدار مباشرة
          </label>

          <label className="flex items-center gap-2.5 text-sm text-foreground">
            <input
              type="checkbox"
              checked={mandatory}
              onChange={(e) => setMandatory(e.target.checked)}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            تحديث إلزامي <span className="text-muted-foreground">(لا يمكن تأجيله)</span>
          </label>
        </fieldset>

        {stage && (
          <p
            role="status"
            aria-live="polite"
            className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 size={15} className="animate-spin" />
            {stage}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => void submit()} loading={busy} fullWidth>
            حفظ ورفع
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
