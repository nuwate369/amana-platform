'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Star, Plus, X, Pencil, Trash2, ShieldAlert, Car, User, Eye, Lock,
  ToggleLeft, ToggleRight, MessageSquareQuote, Smartphone, Check,
  BarChart3, AlertTriangle, CalendarClock, Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { can, type UserType } from '@amana/shared-types';
import {
  listRatingQuestions,
  createRatingQuestion,
  updateRatingQuestion,
  deleteRatingQuestion,
  getQuestionStats,
  type RatingQuestionRow,
  type RatingRow,
  type RatingsOverview,
  type QuestionStats,
  type QuestionTarget,
} from '@/app/actions/ratings';
import { ActionDialog } from '@/components/ActionDialog';
import { PrimaryButton, CancelButton } from '@/components/ui/ActionButtons';
import { FilterToolbar, type FilterConfig } from '@/components/ui/FilterToolbar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import { notify } from '@/lib/toast';

/**
 * إدارة التقييمات:
 * ١) تقرير مؤشرات عامة (متوسطات، تقييمات منخفضة…) لدعم اتخاذ القرار.
 * ٢) أسئلة التقييم — إضافة/تعديل/تفعيل/حذف + إحصائيات لكل سؤال (زر العين).
 *    قواعد سلامة البيانات: سؤال له إجابات لا يُحذف ولا تتغيّر وجهته.
 * ٣) آخر التقييمات الواردة من التطبيقات (بيانات حقيقية).
 */

const TARGET_META: Record<QuestionTarget, { label: string; app: string; icon: typeof Car; className: string }> = {
  driver: {
    label: 'تقييم السائقة',
    app: 'تجيب عنه الراكبة في تطبيقها',
    icon: Car,
    className: 'bg-primary/10 text-primary',
  },
  passenger: {
    label: 'تقييم الراكبة',
    app: 'تجيب عنه السائقة في تطبيقها',
    icon: User,
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
};

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} className={i <= value ? 'fill-primary text-primary' : 'text-border'} />
      ))}
    </span>
  );
}

function fmtDate(value: string | null | undefined, withTime = false): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' as const } : {}),
  });
}

/** بطاقة مؤشر في التقرير العلوي. */
function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: typeof Star;
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            tone === 'warning' ? 'bg-destructive/10 text-destructive' : 'bg-primary/15 text-primary'
          }`}
        >
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className={`text-xl font-bold ${tone === 'warning' ? 'text-destructive' : 'text-foreground'}`}>
            {value}
          </p>
        </div>
      </div>
      {hint && <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

type QuestionForm = {
  id: string | null; // null = إضافة
  question: string;
  target: QuestionTarget;
  sortOrder: number;
  isActive: boolean;
  /** عدد إجابات السؤال (للتعديل) — يقفل تغيير الوجهة. */
  answersCount: number;
};

const EMPTY_FORM: QuestionForm = {
  id: null, question: '', target: 'driver', sortOrder: 0, isActive: true, answersCount: 0,
};

export default function RatingsClient({
  initialQuestions,
  initialRatings,
  overview,
  migrationNeeded,
}: {
  initialQuestions: RatingQuestionRow[];
  initialRatings: RatingRow[];
  overview: RatingsOverview;
  migrationNeeded: boolean;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const isRtl = lang === 'ar';
  const { user } = useAuth();
  const router = useRouter();
  const [questions, setQuestions] = useState(initialQuestions);

  // فلترة «آخر التقييمات الواردة» فقط — بحث/ترتيب/شرائح
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'stars'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [raterFilter, setRaterFilter] = useState('');
  const [starsFilter, setStarsFilter] = useState('');
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [form, setForm] = useState<QuestionForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RatingQuestionRow | null>(null);
  const [busy, setBusy] = useState(false);

  // نافذة إحصائيات السؤال
  const [statsId, setStatsId] = useState<string | null>(null);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const actorName =
    (user?.user_metadata?.full_name as string | undefined) || user?.email || 'مسؤول';

  useEffect(() => setQuestions(initialQuestions), [initialQuestions]);

  // بوابة الصلاحية: view_ratings (عرض) + manage_ratings (إدارة)
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error?.code === '42703') { setAllowed(true); setCanManage(true); return; }
        const ut = data?.user_type as UserType | undefined;
        setAllowed(ut ? can(ut, 'view_ratings') : true);
        setCanManage(ut ? can(ut, 'manage_ratings') : false);
      });
  }, [user]);

  // تحميل إحصائيات السؤال عند فتح النافذة
  useEffect(() => {
    if (!statsId) { setStats(null); return; }
    let alive = true;
    setStatsLoading(true);
    getQuestionStats(statsId)
      .then((s) => { if (alive) setStats(s); })
      .finally(() => { if (alive) setStatsLoading(false); });
    return () => { alive = false; };
  }, [statsId]);

  async function reloadQuestions() {
    const { questions: q } = await listRatingQuestions();
    setQuestions(q);
    router.refresh();
  }

  async function submitForm() {
    if (!form) return;
    setBusy(true);
    const res = form.id
      ? await updateRatingQuestion(user?.id ?? null, form.id, {
          question: form.question,
          target: form.target,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        })
      : await createRatingQuestion(user?.id ?? null, {
          question: form.question,
          target: form.target,
          sortOrder: form.sortOrder,
        });
    setBusy(false);
    if (!res.success) { notify.error(res.error); return; }
    notify.success(form.id ? 'تم تعديل السؤال' : 'تمت إضافة السؤال');
    setForm(null);
    await reloadQuestions();
  }

  async function toggleActive(q: RatingQuestionRow) {
    setBusy(true);
    const res = await updateRatingQuestion(user?.id ?? null, q.id, {
      question: q.question,
      target: q.target,
      sortOrder: q.sortOrder,
      isActive: !q.isActive,
    });
    setBusy(false);
    if (!res.success) { notify.error(res.error); return; }
    notify.success(q.isActive ? 'تم إيقاف السؤال' : 'تم تفعيل السؤال');
    await reloadQuestions();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await deleteRatingQuestion(user?.id ?? null, deleteTarget.id);
    setBusy(false);
    if (!res.success) { notify.error(res.error); return; }
    notify.success('تم حذف السؤال');
    setDeleteTarget(null);
    await reloadQuestions();
  }

  // تصفية وترتيب «آخر التقييمات الواردة» (لا يمسّ الأسئلة ولا المؤشرات)
  const filteredRatings = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = initialRatings.filter((r) => {
      if (q) {
        const hit =
          (r.raterName ?? '').toLowerCase().includes(q) ||
          (r.rateeName ?? '').toLowerCase().includes(q) ||
          (r.comment ?? '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (raterFilter && r.raterType !== raterFilter) return false;
      if (starsFilter && r.stars !== Number(starsFilter)) return false;
      return true;
    });
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortBy === 'stars') cmp = a.stars - b.stars;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [initialRatings, search, raterFilter, starsFilter, sortBy, sortDir]);

  const ratingsFiltersActive = Boolean(search.trim() || raterFilter || starsFilter);

  const ratingSortOptions = [
    { value: 'date', label: lang === 'ar' ? 'التاريخ' : 'Date' },
    { value: 'stars', label: lang === 'ar' ? 'التقييم' : 'Rating' },
  ];

  const ratingFilterConfigs: FilterConfig[] = [
    {
      key: 'rater',
      label: lang === 'ar' ? 'كل المُقيِّمين' : 'All raters',
      icon: Users,
      value: raterFilter,
      options: [
        { value: 'passenger', label: lang === 'ar' ? 'من راكبة' : 'From passenger' },
        { value: 'driver', label: lang === 'ar' ? 'من سائقة' : 'From driver' },
      ],
    },
    {
      key: 'stars',
      label: lang === 'ar' ? 'كل النجوم' : 'All ratings',
      icon: Star,
      value: starsFilter,
      options: [
        { value: '5', label: lang === 'ar' ? '5 نجوم' : '5 stars' },
        { value: '4', label: lang === 'ar' ? '4 نجوم' : '4 stars' },
        { value: '3', label: lang === 'ar' ? '3 نجوم' : '3 stars' },
        { value: '2', label: lang === 'ar' ? 'نجمتان' : '2 stars' },
        { value: '1', label: lang === 'ar' ? 'نجمة واحدة' : '1 star' },
      ],
    },
  ];

  function onRatingFilterChange(key: string, value: string) {
    if (key === 'rater') setRaterFilter(value);
    else if (key === 'stars') setStarsFilter(value);
  }

  if (allowed === false) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <p className="font-semibold text-foreground">لا تملك صلاحية عرض التقييمات</p>
        <p className="text-sm text-muted-foreground">هذه الصفحة متاحة للمدير العام والمدير فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* الرأس */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Star className="h-6 w-6 text-primary shrink-0" />
            {t('ratings.title', 'التقييمات')}
            <span className="hidden text-muted-foreground/30 md:inline">/</span>
            <span className="text-sm font-normal text-muted-foreground mt-0">{t('ratings.subtitle', 'تقرير مؤشرات، إدارة أسئلة التقييم، ومتابعة آخر التقييمات الواردة.')}</span>
          </h1>
        </div>
        {canManage && !migrationNeeded && (
          <button
            onClick={() => setForm(EMPTY_FORM)}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-semibold transition-colors w-full sm:w-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            سؤال جديد
          </button>
        )}
      </div>

      {/* تنبيه الهجرة */}
      {migrationNeeded && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              جداول أسئلة التقييم غير موجودة بعد
            </p>
            <p className="text-amber-700 dark:text-amber-300 mt-1">
              طبّق الهجرة <code className="font-mono">0014_rating_questions.sql</code> في
              Supabase SQL Editor لتفعيل إدارة الأسئلة (تُنشأ الأسئلة الافتراضية تلقائيًا).
            </p>
          </div>
        </div>
      )}

      {/* ===== التقرير: مؤشرات عامة لدعم القرار ===== */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard icon={BarChart3} label="إجمالي التقييمات" value={`${overview.totalRatings}`} />
        <KpiCard
          icon={Car}
          label="متوسط تقييم السائقات"
          value={overview.driverAvg !== null ? `${overview.driverAvg} ⭐` : '—'}
          hint="ما تمنحه الراكبات للسائقات"
        />
        <KpiCard
          icon={User}
          label="متوسط تقييم الراكبات"
          value={overview.passengerAvg !== null ? `${overview.passengerAvg} ⭐` : '—'}
          hint="ما تمنحه السائقات للراكبات"
        />
        <KpiCard icon={MessageSquareQuote} label="إجابات الأسئلة" value={`${overview.totalAnswers}`} />
        <KpiCard
          icon={AlertTriangle}
          label="تقييمات منخفضة (1–2 ⭐)"
          value={`${overview.lowStarsCount}`}
          hint={overview.lowStarsCount > 0 ? 'تستحق المراجعة' : undefined}
          tone={overview.lowStarsCount > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* جدول الأسئلة */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <MessageSquareQuote size={15} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">أسئلة التقييم</h2>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            {questions.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">{t('ratings.table.question', 'السؤال')}</th>
                <th className="px-5 py-3 font-medium">{t('ratings.table.target', 'الوجهة')}</th>
                <th className="px-5 py-3 font-medium">{t('ratings.table.answers', 'الإجابات')}</th>
                <th className="px-5 py-3 font-medium">{t('ratings.table.average', 'المتوسط')}</th>
                <th className="px-5 py-3 font-medium">{t('ratings.table.lastAnswer', 'آخر إجابة')}</th>
                <th className="px-5 py-3 font-medium">{t('ratings.table.status', 'الحالة')}</th>
                <th className="px-5 py-3 font-medium text-center">{t('ratings.table.actions', 'إجراءات')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {questions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                    {migrationNeeded ? 'بانتظار تطبيق الهجرة 0014' : 'لا توجد أسئلة — أضف أول سؤال'}
                  </td>
                </tr>
              ) : (
                questions.map((q) => {
                  const tm = TARGET_META[q.target];
                  const TIcon = tm.icon;
                  return (
                    <tr key={q.id} className="text-foreground hover:bg-muted/50 transition-colors">
                      <td className="px-5 py-3 font-medium">{q.question}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${tm.className}`}>
                            <TIcon size={12} />
                            {tm.label}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Smartphone size={10} />
                            {tm.app}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">
                          {q.answersCount}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {q.avgStars !== null ? (
                          <span className="inline-flex items-center gap-1 text-sm font-medium">
                            {q.avgStars}
                            <Star size={13} className="fill-primary text-primary" />
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(q.lastAnswerAt)}
                      </td>
                      <td className="px-5 py-3">
                        {q.isActive ? (
                          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            مفعّل
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            موقوف
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {/* إحصائيات السؤال — متاح للجميع */}
                          <button
                            onClick={() => setStatsId(q.id)}
                            title="عرض إحصائيات السؤال"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => setForm({
                                  id: q.id, question: q.question, target: q.target,
                                  sortOrder: q.sortOrder, isActive: q.isActive,
                                  answersCount: q.answersCount,
                                })}
                                title="تعديل"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => toggleActive(q)}
                                disabled={busy}
                                title={q.isActive ? 'إيقاف' : 'تفعيل'}
                                className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                              >
                                {q.isActive ? (
                                  <ToggleRight className="w-5 h-5 text-emerald-500" />
                                ) : (
                                  <ToggleLeft className="w-5 h-5 text-red-400" />
                                )}
                              </button>
                              {q.answersCount > 0 ? (
                                <span
                                  title={`لا يُحذف سؤال له ${q.answersCount} إجابة — أوقفه بدلًا من ذلك`}
                                  className="p-1.5 text-muted-foreground/40 cursor-not-allowed"
                                >
                                  <Lock className="w-4 h-4" />
                                </span>
                              ) : (
                                <button
                                  onClick={() => setDeleteTarget(q)}
                                  title="حذف"
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* شريط فلاتر «آخر التقييمات» — بطاقة مستقلّة كي تطفو القوائم بلا قصّ (الجدول overflow-hidden) */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-4">
        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={lang === 'ar' ? 'ابحثي في التقييمات…' : 'Search ratings…'}
          sortOptions={ratingSortOptions}
          sort={{ value: sortBy, dir: sortDir }}
          onSortChange={(v) => setSortBy(v as typeof sortBy)}
          onSortDirToggle={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          filters={ratingFilterConfigs}
          onFilterChange={onRatingFilterChange}
          defaultOpen
          lang={lang}
          isRtl={isRtl}
        />
      </div>

      {/* آخر التقييمات */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Star size={15} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">آخر التقييمات الواردة</h2>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            {filteredRatings.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">المقيِّم</th>
                <th className="px-5 py-3 font-medium">المقيَّم</th>
                <th className="px-5 py-3 font-medium">الإجمالي</th>
                <th className="px-5 py-3 font-medium">تفاصيل الأسئلة</th>
                <th className="px-5 py-3 font-medium">التعليق</th>
                <th className="px-5 py-3 font-medium">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRatings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                    {ratingsFiltersActive ? 'لا توجد تقييمات تطابق البحث' : 'لا توجد تقييمات بعد'}
                  </td>
                </tr>
              ) : (
                filteredRatings.map((r) => {
                  const raterIsPassenger = r.raterType === 'passenger';
                  return (
                    <tr key={r.id} className="text-foreground hover:bg-muted/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            {raterIsPassenger ? <User size={13} /> : <Car size={13} />}
                          </span>
                          <div className="flex flex-col">
                            <span className="font-medium">{r.raterName ?? '—'}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {raterIsPassenger ? 'راكبة' : 'سائقة'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{r.rateeName ?? '—'}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {r.rateeType === 'driver' ? 'سائقة' : 'راكبة'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3"><Stars value={r.stars} /></td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {r.answersCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs">
                            {r.answersCount} أسئلة · متوسط {r.answersAvg}
                            <Star size={11} className="fill-primary text-primary" />
                          </span>
                        ) : (
                          <span className="text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground max-w-[220px] truncate" title={r.comment ?? undefined}>
                        {r.comment ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap text-xs">
                        {fmtDate(r.createdAt, true)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Modal: إضافة/تعديل سؤال ===== */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-border">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {form.id ? 'تعديل سؤال التقييم' : 'سؤال تقييم جديد'}
              </h2>
              <button
                onClick={() => setForm(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">نص السؤال</label>
                <input
                  type="text"
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  placeholder="مثال: نظافة المركبة"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
                />
              </div>

              {/* اختيار الوجهة — سؤال مباشر وخياران واضحان جنبًا إلى جنب */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">مَن يُقيَّم بهذا السؤال؟</label>
                {form.id && form.answersCount > 0 ? (
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TARGET_META[form.target].className}`}>
                      {(() => { const I = TARGET_META[form.target].icon; return <I size={12} />; })()}
                      {TARGET_META[form.target].label}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground" title="السؤال له إجابات مسجّلة — تغيير الوجهة يفسد دلالة البيانات التاريخية">
                      <Lock size={11} />
                      مقفلة ({form.answersCount} إجابة)
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(TARGET_META) as QuestionTarget[]).map((t) => {
                      const tm = TARGET_META[t];
                      const TIcon = tm.icon;
                      const selected = form.target === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm({ ...form, target: t })}
                          className={`relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-colors ${
                            selected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground/30 hover:bg-muted'
                          }`}
                        >
                          {selected && (
                            <span className="absolute top-2 start-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check size={11} strokeWidth={3} />
                            </span>
                          )}
                          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tm.className}`}>
                            <TIcon size={17} />
                          </span>
                          <span className="text-sm font-semibold text-foreground">{tm.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* شرح الوجهة المختارة — سطر واحد واضح */}
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
                  <Smartphone size={12} className="shrink-0" />
                  {TARGET_META[form.target].app}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">الترتيب</label>
                  <input
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
                  />
                </div>
                {form.id && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">الحالة</label>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, isActive: !form.isActive })}
                      className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      <span className="text-foreground">{form.isActive ? 'مفعّل' : 'موقوف'}</span>
                      {form.isActive ? (
                        <ToggleRight className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-red-400" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <PrimaryButton
                  onClick={submitForm}
                  loading={busy}
                  fullWidth
                >
                  {form.id ? 'حفظ التعديلات' : 'إضافة السؤال'}
                </PrimaryButton>
                <CancelButton
                  onClick={() => setForm(null)}
                  fullWidth
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal: إحصائيات السؤال ===== */}
      {statsId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200 border border-border flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-foreground">إحصائيات السؤال</h2>
              <button
                onClick={() => setStatsId(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {statsLoading || !stats ? (
                <div className="flex h-40 items-center justify-center gap-3 text-muted-foreground">
                  {statsLoading ? (
                    <>
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                      جارٍ التحميل…
                    </>
                  ) : 'تعذّر تحميل الإحصائيات'}
                </div>
              ) : (
                <>
                  {/* رأس: نص السؤال + الوجهة */}
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="font-semibold text-foreground">{stats.question}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TARGET_META[stats.target].className}`}>
                        {(() => { const I = TARGET_META[stats.target].icon; return <I size={12} />; })()}
                        {TARGET_META[stats.target].label}
                      </span>
                      {stats.isActive ? (
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">مفعّل</span>
                      ) : (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">موقوف</span>
                      )}
                    </div>
                  </div>

                  {/* مؤشرات */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border p-3 text-center">
                      <p className="text-2xl font-bold text-primary">{stats.answersCount}</p>
                      <p className="text-xs text-muted-foreground">إجابة</p>
                    </div>
                    <div className="rounded-xl border border-border p-3 text-center">
                      <p className="text-2xl font-bold text-primary">
                        {stats.avgStars !== null ? stats.avgStars : '—'}
                        {stats.avgStars !== null && <span className="text-sm"> ⭐</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">متوسط النجوم</p>
                    </div>
                  </div>

                  {/* توزيع النجوم */}
                  <div className="rounded-xl border border-border p-4">
                    <h3 className="mb-3 text-xs font-semibold text-muted-foreground">توزيع الإجابات</h3>
                    <div className="space-y-1.5">
                      {([5, 4, 3, 2, 1] as const).map((s) => {
                        const count = stats.distribution[s];
                        const pct = stats.answersCount ? Math.round((count / stats.answersCount) * 100) : 0;
                        return (
                          <div key={s} className="flex items-center gap-2 text-xs">
                            <span className="flex w-8 items-center gap-0.5 text-muted-foreground shrink-0" dir="ltr">
                              {s}<Star size={10} className="fill-primary text-primary" />
                            </span>
                            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full ${s <= 2 ? 'bg-destructive' : 'bg-primary'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-12 text-left text-muted-foreground shrink-0">{count} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* تواريخ الإجابات */}
                  <div className="flex items-center justify-between rounded-xl border border-border p-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarClock size={13} />
                      أول إجابة: <strong className="text-foreground">{fmtDate(stats.firstAnswerAt)}</strong>
                    </span>
                    <span>
                      آخر إجابة: <strong className="text-foreground">{fmtDate(stats.lastAnswerAt)}</strong>
                    </span>
                  </div>

                  {/* آخر الإجابات */}
                  <div className="overflow-hidden rounded-xl border border-border">
                    <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground">
                      آخر الإجابات
                    </div>
                    {stats.recent.length === 0 ? (
                      <p className="px-4 py-5 text-center text-sm text-muted-foreground">لا توجد إجابات بعد</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {stats.recent.map((a) => (
                          <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                            <span className="min-w-0 truncate text-foreground">
                              {a.raterName ?? '—'}
                              <span className="text-muted-foreground"> ← {a.rateeName ?? '—'}</span>
                            </span>
                            <span className="flex items-center gap-3 shrink-0">
                              <Stars value={a.stars} />
                              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                {fmtDate(a.createdAt)}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* حوار حذف السؤال — إعادة استخدام ActionDialog (للأسئلة بلا إجابات فقط) */}
      <ActionDialog
        open={!!deleteTarget}
        title="حذف سؤال التقييم"
        variant="danger"
        actorName={actorName}
        description={
          <>
            هل أنت متأكد من حذف السؤال <strong>«{deleteTarget?.question}»</strong>؟
            لا يمكن التراجع عن هذا الإجراء.
          </>
        }
        confirmLabel="نعم، حذف"
        loading={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
