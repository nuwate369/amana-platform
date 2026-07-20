'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Smartphone,
  Upload,
  Plus,
  X,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  Download,
} from 'lucide-react';
import {
  listReleases,
  createRelease,
  setReleasePublished,
  deleteRelease,
  type ReleaseRow,
  type ReleaseApp,
} from './actions';
import { Button } from '@/components/ui/Button';
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

/** يحوّل ملفًّا إلى base64 دون الترويسة `data:...;base64,`. */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('تعذّرت قراءة الملفّ'));
    reader.readAsDataURL(file);
  });
}

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} ميجابايت`;
}

export default function ReleasesPage() {
  const [rows, setRows] = useState<ReleaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setRows(await listReleases());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function togglePublished(row: ReleaseRow) {
    const ok = await setReleasePublished(row.id, !row.published);
    if (!ok) return notify.error('تعذّر تغيير حالة النشر');
    notify.success(row.published ? 'أُخفي الإصدار' : 'نُشر الإصدار');
    void refresh();
  }

  async function remove(row: ReleaseRow) {
    const ok = await deleteRelease(row.id);
    if (!ok) return notify.error('تعذّر حذف الإصدار');
    notify.success('حُذف الإصدار');
    void refresh();
  }

  return (
    <div dir="rtl" className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Smartphone size={24} className="text-primary" />
            إصدارات التطبيقات
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ارفعي ملفّ APK وسجّلي رقم البناء — تظهر نافذة التحديث تلقائيًّا لمن لديها نسخة أقدم.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={18} className="ms-1" />
          إصدار جديد
        </Button>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
        <p>
          استخدمي هذه الصفحة فقط عند تغيير الكود الأصلي (مكتبة native، أذونات، أيقونة، ترقية SDK).
          تعديلات الواجهات والنصوص والمنطق تصل للمستخدمات تلقائيًّا عبر EAS Update دون رفع ملفّ.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          لا توجد إصدارات مسجَّلة بعد.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-right text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">التطبيق</th>
                <th className="px-4 py-3 font-medium">الإصدار</th>
                <th className="px-4 py-3 font-medium">رقم البناء</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium">التاريخ</th>
                <th className="px-4 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 text-foreground">{APP_LABEL[r.app]}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{r.versionName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.versionCode}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        r.published
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {r.published ? 'منشور' : 'مخفي'}
                    </span>
                    {r.mandatory && (
                      <span className="me-2 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600">
                        إلزامي
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-4 py-3">
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
                        onClick={() => void remove(r)}
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
      )}

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
  const [versionName, setVersionName] = useState('');
  const [notes, setNotes] = useState('');
  const [mandatory, setMandatory] = useState(false);
  const [published, setPublished] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!file) return notify.error('اختاري ملفّ APK أولًا');
    setBusy(true);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await createRelease({
        app,
        versionCode: Number(versionCode),
        versionName,
        notes,
        mandatory,
        published,
        fileName: file.name,
        fileBase64,
      });
      if (!res.ok) {
        notify.error(res.error);
        return;
      }
      notify.success('حُفظ الإصدار بنجاح');
      onSaved();
    } catch {
      notify.error('حدث خطأ أثناء الرفع');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">إصدار جديد</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">التطبيق</label>
            <div className="flex gap-2">
              {(['passenger', 'driver'] as ReleaseApp[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setApp(a)}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
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

          <div className="grid grid-cols-2 gap-3">
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
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">رقم البناء</label>
              <input
                value={versionCode}
                onChange={(e) => setVersionCode(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                placeholder="2"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              />
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
            <label className="mb-1.5 block text-sm font-medium text-foreground">ملفّ APK</label>
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
        </div>

        <div className="mt-6 flex gap-2">
          <Button onClick={() => void submit()} loading={busy} fullWidth>
            حفظ ورفع
          </Button>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  );
}
