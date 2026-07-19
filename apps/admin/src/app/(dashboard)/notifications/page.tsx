'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Radio, Send, Plus, Users, X, Search, Loader2, Tag, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  createAnnouncement,
  getAnnouncementStats,
  listAnnouncements,
  listRecipientsForPicker,
  type AnnouncementRow,
  type AnnouncementAudience,
  type AnnouncementType,
  type AnnouncementStats,
  type RecipientOption,
} from './actions';
import { FilterToolbar, type FilterConfig, type SortState } from '@/components/ui/FilterToolbar';
import { DateRangePicker, type DateRange } from '@/components/ui/DateRangePicker';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/toast';

/**
 * صفحة الإعلانات والتنبيهات — بيانات حقيقية (جدول announcements):
 * إحصاءات (إجمالي المرسل/المستلمين) بمحدِّد تاريخ + شريط فلاتر موحّد + نموذج إنشاء
 * في نافذة منبثقة (زر «إضافة») مع إمكانية الإرسال لمستخدم محدّد. أنثراسايت + ذهبي، RTL.
 */

function dayStart(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}
function dayEnd(d: Date): string {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon size={20} />
      </span>
      <p className="mt-4 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export default function NotificationsPage() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const isRtl = lang === 'ar';
  const ar = lang === 'ar';

  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [stats, setStats] = useState<AnnouncementStats>({ totalSent: 0, totalRecipients: 0 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>({ value: 'date', dir: 'desc' });
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });

  const [modalOpen, setModalOpen] = useState(false);

  const fromISO = dateRange.from ? dayStart(dateRange.from) : null;
  const toISO = dateRange.to ? dayEnd(dateRange.to) : null;

  const load = useCallback(async () => {
    setLoading(true);
    const [list, st] = await Promise.all([
      listAnnouncements(fromISO, toISO),
      getAnnouncementStats(fromISO, toISO),
    ]);
    setRows(list);
    setStats(st);
    setLoading(false);
  }, [fromISO, toISO]);

  useEffect(() => {
    void load();
  }, [load]);

  const AUDIENCE_LABEL: Record<AnnouncementAudience, string> = useMemo(
    () => ({
      all: ar ? 'الكل' : 'All',
      passengers: ar ? 'الراكبات' : 'Passengers',
      drivers: ar ? 'السائقات' : 'Drivers',
      specific: ar ? 'مستخدم محدّد' : 'Specific user',
    }),
    [ar],
  );
  const TYPE_LABEL: Record<AnnouncementType, string> = useMemo(
    () => ({
      announcement: ar ? 'إعلان عام' : 'Announcement',
      maintenance: ar ? 'صيانة' : 'Maintenance',
      update: ar ? 'تحديث' : 'Update',
    }),
    [ar],
  );

  // فلترة + ترتيب على العميل.
  const view = useMemo(() => {
    let out = rows;
    if (typeFilter !== 'all') out = out.filter((r) => r.type === typeFilter);
    const q = search.trim().toLowerCase();
    if (q) out = out.filter((r) => r.title.toLowerCase().includes(q) || (r.body ?? '').toLowerCase().includes(q));
    const dir = sort.dir === 'asc' ? 1 : -1;
    out = [...out].sort((a, b) =>
      sort.value === 'title'
        ? a.title.localeCompare(b.title) * dir
        : (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir,
    );
    return out;
  }, [rows, typeFilter, search, sort]);

  const sortOptions = [
    { value: 'date', label: ar ? 'التاريخ' : 'Date' },
    { value: 'title', label: ar ? 'العنوان' : 'Title' },
  ];
  const filters: FilterConfig[] = [
    {
      key: 'type',
      label: ar ? 'كل الأنواع' : 'All types',
      icon: Tag,
      value: typeFilter,
      options: [
        { value: 'all', label: ar ? 'كل الأنواع' : 'All types' },
        { value: 'announcement', label: TYPE_LABEL.announcement },
        { value: 'maintenance', label: TYPE_LABEL.maintenance },
        { value: 'update', label: TYPE_LABEL.update },
      ],
    },
  ];

  const fmtDate = (v: string) => new Date(v).toLocaleDateString(ar ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* العنوان + زر الإضافة */}
      <div className="mb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Radio className="h-6 w-6 shrink-0 text-primary" />
          {ar ? 'الإعلانات والتنبيهات' : 'Announcements'}
          <span className="hidden text-muted-foreground/30 md:inline">/</span>
          <span className="text-sm font-normal text-muted-foreground">
            {ar ? 'مراسلة الراكبات والسائقات' : 'Message passengers & drivers'}
          </span>
        </h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          <Plus size={16} />
          {ar ? 'إضافة إشعار' : 'Add notification'}
        </button>
      </div>

      {/* الإحصاءات */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label={ar ? 'إجمالي المُرسَل' : 'Total sent'} value={String(stats.totalSent)} icon={Send} />
        <StatCard label={ar ? 'إجمالي المستلمين' : 'Total recipients'} value={String(stats.totalRecipients)} icon={Users} />
      </div>

      {/* شريط الفلاتر (يحوي محدِّد التاريخ) */}
      <div className="rounded-xl border border-border bg-card p-4">
        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={ar ? 'ابحث في العنوان أو النص…' : 'Search title or body…'}
          sortOptions={sortOptions}
          sort={sort}
          onSortChange={(value) => setSort((s) => ({ ...s, value }))}
          onSortDirToggle={() => setSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))}
          filters={filters}
          onFilterChange={(_key, value) => setTypeFilter(value)}
          filterLead={<DateRangePicker value={dateRange} onChange={setDateRange} lang={lang} isRtl={isRtl} />}
          lang={lang}
          isRtl={isRtl}
        />
      </div>

      {/* الجدول */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">{ar ? 'العنوان' : 'Title'}</th>
                <th className="px-5 py-3 font-medium">{ar ? 'النوع' : 'Type'}</th>
                <th className="px-5 py-3 font-medium">{ar ? 'الجمهور' : 'Audience'}</th>
                <th className="px-5 py-3 font-medium">{ar ? 'المستلمون' : 'Recipients'}</th>
                <th className="px-5 py-3 font-medium">{ar ? 'التاريخ' : 'Date'}</th>
                <th className="px-5 py-3 font-medium">{ar ? 'ينتهي في' : 'Expires At'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : view.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                    {ar ? 'لا توجد إشعارات بعد.' : 'No notifications yet.'}
                  </td>
                </tr>
              ) : (
                view.map((n) => (
                  <tr key={n.id} className="text-foreground transition-colors hover:bg-muted/50">
                    <td className="px-5 py-3 font-medium">{n.title}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {TYPE_LABEL[n.type]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {n.audience === 'specific' ? n.targetName ?? AUDIENCE_LABEL.specific : AUDIENCE_LABEL[n.audience]}
                    </td>
                    <td className="px-5 py-3 font-mono text-muted-foreground">{n.recipientCount}</td>
                    <td className="px-5 py-3 font-mono text-muted-foreground">{fmtDate(n.createdAt)}</td>
                    <td className="px-5 py-3 font-mono text-muted-foreground">{fmtDate(n.expiresAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen ? (
        <CreateModal
          ar={ar}
          audienceLabel={AUDIENCE_LABEL}
          typeLabel={TYPE_LABEL}
          createdBy={user?.id ?? null}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------- نافذة الإنشاء ------------------------------- */
function CreateModal({
  ar,
  audienceLabel,
  typeLabel,
  createdBy,
  onClose,
  onCreated,
}: {
  ar: boolean;
  audienceLabel: Record<AnnouncementAudience, string>;
  typeLabel: Record<AnnouncementType, string>;
  createdBy: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<AnnouncementType>('announcement');
  const [audience, setAudience] = useState<AnnouncementAudience>('all');
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  
  // Default to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [expiresAtDate, setExpiresAtDate] = useState(tomorrow.toISOString().split('T')[0]);

  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // تحميل قائمة المستخدمين عند اختيار «مستخدم محدّد».
  useEffect(() => {
    if (audience !== 'specific' || recipients.length) return;
    void listRecipientsForPicker().then(setRecipients);
  }, [audience, recipients.length]);

  const filteredRecipients = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    const list = q
      ? recipients.filter((r) => r.name.toLowerCase().includes(q) || (r.phone ?? '').includes(q))
      : recipients;
    return list.slice(0, 50);
  }, [recipients, recipientSearch]);

  const canSubmit =
    title.trim().length >= 3 && (audience !== 'specific' || !!targetUserId) && !submitting;

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    
    // Convert YYYY-MM-DD to ISO at end of day
    const expiresAt = new Date(expiresAtDate);
    expiresAt.setHours(23, 59, 59, 999);
    
    const res = await createAnnouncement({ title, body, type, audience, targetUserId, createdBy, expiresAt: expiresAt.toISOString() });
    setSubmitting(false);
    if (!res.ok) {
      notify.error(res.error ?? (ar ? 'تعذّر الإرسال' : 'Failed to send'));
      return;
    }
    notify.success(ar ? 'تم إرسال الإشعار' : 'Notification sent');
    onCreated();
  }

  const fieldCls =
    'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
        dir={ar ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{ar ? 'إشعار جديد' : 'New notification'}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{ar ? 'العنوان' : 'Title'}</label>
            <input className={fieldCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={ar ? 'أدخل عنوان الإشعار' : 'Notification title'} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{ar ? 'النوع' : 'Type'}</label>
            <select className={fieldCls} value={type} onChange={(e) => setType(e.target.value as AnnouncementType)}>
              {(['announcement', 'maintenance', 'update'] as AnnouncementType[]).map((v) => (
                <option key={v} value={v}>{typeLabel[v]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{ar ? 'نص الإشعار' : 'Body'}</label>
            <textarea className={`${fieldCls} resize-none`} rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder={ar ? 'اكتب محتوى الإشعار هنا' : 'Write the content here'} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{ar ? 'تاريخ الانتهاء' : 'Expiry Date'}</label>
            <input 
              type="date" 
              className={fieldCls} 
              value={expiresAtDate} 
              onChange={(e) => setExpiresAtDate(e.target.value)} 
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {ar ? 'لن يظهر الإشعار للمستخدمين بعد هذا التاريخ.' : 'The notification will not be shown after this date.'}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{ar ? 'الجمهور' : 'Audience'}</label>
            <select
              className={fieldCls}
              value={audience}
              onChange={(e) => {
                setAudience(e.target.value as AnnouncementAudience);
                setTargetUserId(null);
              }}
            >
              {(['all', 'passengers', 'drivers', 'specific'] as AnnouncementAudience[]).map((v) => (
                <option key={v} value={v}>{audienceLabel[v]}</option>
              ))}
            </select>
          </div>

          {/* اختيار مستخدم محدّد */}
          {audience === 'specific' ? (
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{ar ? 'اختر المستخدم' : 'Select user'}</label>
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-background px-3">
                <Search size={15} className="text-muted-foreground" />
                <input
                  className="w-full bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  placeholder={ar ? 'ابحث بالاسم أو الجوال…' : 'Search name or phone…'}
                />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                {recipients.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  </p>
                ) : filteredRecipients.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">{ar ? 'لا نتائج' : 'No results'}</p>
                ) : (
                  filteredRecipients.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setTargetUserId(r.id)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-right text-sm transition hover:bg-muted ${
                        targetUserId === r.id ? 'bg-primary/10 text-primary' : 'text-foreground'
                      }`}
                    >
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.role === 'driver' ? (ar ? 'سائقة' : 'Driver') : ar ? 'راكبة' : 'Passenger'}
                        {r.phone ? ` · ${r.phone}` : ''}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
              {ar ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={onSubmit}
              disabled={!canSubmit}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {ar ? 'إرسال' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
