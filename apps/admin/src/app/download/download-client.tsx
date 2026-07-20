'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Download,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Smartphone,
  Star,
  Loader2,
} from 'lucide-react';
import { submitReview, type AppStats, type ReviewRow } from './actions';

/**
 * واجهة صفحة التحميل العامّة.
 *
 * تبويب لكل تطبيق بدل بطاقتين متجاورتين: بعد إضافة الإحصاءات والآراء صار
 * لكل تطبيق محتوى كامل، وعرضهما معًا يضاعف طول الصفحة على الجوال بلا فائدة.
 * ثنائية اللغة (عربي RTL / إنجليزي LTR) على نمط صفحة الهبوط.
 */

export interface PublicRelease {
  app: 'passenger' | 'driver';
  versionName: string;
  versionCode: number;
  notes: string | null;
  releasedAt: string;
}

export interface AppBundle {
  release: PublicRelease | null;
  stats: AppStats;
  reviews: ReviewRow[];
}

type Lang = 'ar' | 'en';
type AppId = 'passenger' | 'driver';

const STR = {
  ar: {
    dir: 'rtl' as const,
    home: 'الصفحة الرئيسية',
    badge: 'نسخة تجريبية — أندرويد',
    h1: 'حمّلي تطبيق أمانة',
    sub: 'اختاري التطبيق الذي يناسبكِ. التحميل مباشر من خوادمنا، ولا يحتاج حسابًا في أيّ متجر.',
    tabs: { passenger: 'تطبيق الراكبة', driver: 'تطبيق السائقة' },
    tagline: {
      passenger: 'اطلبي رحلتكِ مع سائقة موثّقة، وتتبّعي طريقكِ لحظة بلحظة.',
      driver: 'استقبلي الطلبات القريبة، وأديري رحلاتكِ ودخلكِ من مكان واحد.',
    },
    perks: {
      passenger: ['سائقات موثّقات ١٠٠٪', 'تتبّع لحظي للرحلة', 'زرّ طوارئ ومشاركة الرحلة'],
      driver: ['طلبات قريبة فورية', 'سجلّ رحلات ودخل', 'دعم فنّي مباشر'],
    },
    download: 'تحميل التطبيق',
    downloading: 'جارٍ التحميل…',
    version: 'الإصدار',
    androidReq: 'أندرويد ٧ فأحدث',
    none: 'لا يوجد إصدار متاح بعد',
    stats: { installs: 'تنزيل', updates: 'تحديث', rating: 'التقييم' },
    whatsNew: 'ما الجديد',
    stepsTitle: 'طريقة التحميل والتثبيت',
    steps: [
      'اضغطي زرّ التحميل — سيُنزَّل ملفّ بامتداد ‎.apk‎',
      'افتحي الملفّ من شريط الإشعارات أو من مجلّد التنزيلات',
      'إن ظهرت رسالة «مصادر غير معروفة»، اسمحي للمتصفّح بالتثبيت مرّة واحدة',
      'اضغطي «تثبيت» ثمّ «فتح» — وسجّلي دخولكِ برقم جوّالكِ',
    ],
    stepsNote:
      'رسالة «مصادر غير معروفة» طبيعية لأنّ التطبيق يُوزَّع مباشرةً في هذه المرحلة، وليست تحذيرًا من التطبيق نفسه. نسخة المتاجر الرسمية قريبًا.',
    termsTitle: 'اتفاقية الاستخدام',
    termsHint: 'بتحميلكِ التطبيق فأنتِ توافقين على هذه الشروط',
    terms: [
      {
        h: 'الأهلية والحساب',
        b: 'الخدمة مخصّصة للنساء داخل المملكة العربية السعودية. تلتزمين بتقديم بيانات صحيحة عند التسجيل، وأنتِ المسؤولة عن الحفاظ على سرّية حسابكِ وكل ما يجري من خلاله.',
      },
      {
        h: 'استخدام الخدمة',
        b: 'يُمنع استخدام التطبيق لأيّ غرض مخالف للأنظمة، أو إزعاج المستخدمات الأخريات، أو محاولة التحايل على آليّات الأمان أو التسعير. ويحقّ لنا إيقاف أيّ حساب يخالف ذلك.',
      },
      {
        h: 'الأجرة والدفع',
        b: 'تُحتسب الأجرة حسب المسافة والزمن وفئة الرحلة، وتُعرض قبل التأكيد كلّما كانت الوجهة محدّدة. الرحلات بلا وجهة محدّدة تُحتسب عند انتهائها.',
      },
      {
        h: 'الخصوصية والبيانات',
        b: 'نجمع الموقع وبيانات الرحلة لتشغيل الخدمة وسلامتكِ فقط، ولا نبيع بياناتكِ لأيّ طرف ثالث. تُعالَج البيانات وفق نظام حماية البيانات الشخصية في المملكة.',
      },
      {
        h: 'السلامة والطوارئ',
        b: 'زرّ الطوارئ ومشاركة الرحلة أدوات مساندة ولا تُغني عن الاتصال بالجهات المختصّة عند الخطر. توثيق السائقات إجراء وقائي لا ضمانًا مطلقًا.',
      },
      {
        h: 'النسخة التجريبية',
        b: 'التطبيق في مرحلة تجريبية، وقد تظهر أعطال أو تتغيّر مزايا دون إشعار مسبق. ملاحظاتكِ خلال هذه المرحلة جزء أساسي من تطوير الخدمة.',
      },
    ],
    reviewsTitle: 'آراء المستخدمات',
    noReviews: 'لا توجد آراء بعد — كوني الأولى.',
    formTitle: 'شاركينا رأيكِ',
    fName: 'الاسم',
    fNamePh: 'اسمكِ أو لقبكِ',
    fRating: 'تقييمكِ',
    fComment: 'تعليقكِ',
    fCommentPh: 'ما الذي أعجبكِ؟ وما الذي تتمنّين تحسينه؟',
    send: 'إرسال',
    sending: 'جارٍ الإرسال…',
    thanks: 'شكرًا لكِ! نُشر رأيكِ.',
    footer: 'أمانة — منصّة تنقّل نسائية · المملكة العربية السعودية',
    toggle: 'EN',
  },
  en: {
    dir: 'ltr' as const,
    home: 'Home',
    badge: 'Beta — Android',
    h1: 'Download the Amana app',
    sub: 'Pick the app that suits you. Downloads come straight from our servers — no store account needed.',
    tabs: { passenger: 'Passenger app', driver: 'Driver app' },
    tagline: {
      passenger: 'Book a ride with a verified woman driver and follow your route in real time.',
      driver: 'Accept nearby requests and manage your rides and earnings in one place.',
    },
    perks: {
      passenger: ['100% verified women drivers', 'Real-time ride tracking', 'SOS button and ride sharing'],
      driver: ['Instant nearby requests', 'Ride and earnings history', 'Direct support'],
    },
    download: 'Download app',
    downloading: 'Downloading…',
    version: 'Version',
    androidReq: 'Android 7 and above',
    none: 'No release available yet',
    stats: { installs: 'downloads', updates: 'updates', rating: 'Rating' },
    whatsNew: "What's new",
    stepsTitle: 'How to download and install',
    steps: [
      'Tap the download button — an ‎.apk‎ file will be saved',
      'Open the file from your notifications or the Downloads folder',
      'If “unknown sources” appears, allow your browser to install this once',
      'Tap Install, then Open — and sign in with your phone number',
    ],
    stepsNote:
      'The “unknown sources” message is expected because the app is distributed directly at this stage. It is not a warning about the app itself. Official store releases are coming soon.',
    termsTitle: 'Terms of use',
    termsHint: 'By downloading the app you agree to these terms',
    terms: [
      {
        h: 'Eligibility and account',
        b: 'The service is for women in Saudi Arabia. You agree to provide accurate details when registering, and you are responsible for keeping your account secure and for activity carried out through it.',
      },
      {
        h: 'Using the service',
        b: 'The app may not be used for unlawful purposes, to harass other users, or to circumvent safety or pricing mechanisms. We may suspend any account that breaches this.',
      },
      {
        h: 'Fares and payment',
        b: 'Fares are calculated from distance, time, and ride class, and are shown before you confirm whenever a destination is set. Rides without a set destination are calculated on completion.',
      },
      {
        h: 'Privacy and data',
        b: 'We collect location and ride data solely to operate the service and keep you safe. We do not sell your data to third parties. Data is processed under Saudi personal data protection law.',
      },
      {
        h: 'Safety and emergencies',
        b: 'The SOS button and ride sharing are supporting tools and do not replace contacting the authorities in an emergency. Driver verification is a preventive measure, not an absolute guarantee.',
      },
      {
        h: 'Beta release',
        b: 'The app is in beta. Faults may occur and features may change without prior notice. Your feedback during this stage is a core part of building the service.',
      },
    ],
    reviewsTitle: 'What users say',
    noReviews: 'No reviews yet — be the first.',
    formTitle: 'Share your feedback',
    fName: 'Name',
    fNamePh: 'Your name or nickname',
    fRating: 'Your rating',
    fComment: 'Your comment',
    fCommentPh: 'What did you like? What would you improve?',
    send: 'Send',
    sending: 'Sending…',
    thanks: 'Thank you! Your review is live.',
    footer: 'Amana — women-only ride-hailing · Saudi Arabia',
    toggle: 'ع',
  },
};

type Strings = (typeof STR)['ar'] | (typeof STR)['en'];

const ACCENT: Record<AppId, { color: string; soft: string }> = {
  passenger: { color: '#7C3AED', soft: 'rgba(124,58,237,.10)' },
  driver: { color: '#254594', soft: 'rgba(37,69,148,.10)' },
};

export default function DownloadClient({
  passenger,
  driver,
}: {
  passenger: AppBundle;
  driver: AppBundle;
}) {
  const [lang, setLang] = useState<Lang>('ar');
  const [active, setActive] = useState<AppId>('passenger');

  useEffect(() => {
    const saved = window.localStorage.getItem('amana_lang');
    if (saved === 'en' || saved === 'ar') setLang(saved);
    if (window.location.hash === '#driver') setActive('driver');
  }, []);

  const t = STR[lang];
  const bundle = active === 'passenger' ? passenger : driver;
  const accent = ACCENT[active];
  const Chevron = lang === 'ar' ? ChevronLeft : ChevronRight;

  function toggleLang() {
    setLang((p) => {
      const n: Lang = p === 'ar' ? 'en' : 'ar';
      try {
        window.localStorage.setItem('amana_lang', n);
      } catch {
        /* ignore */
      }
      return n;
    });
  }

  return (
    <div
      dir={t.dir}
      lang={lang}
      className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100"
    >
      <header className="border-b border-purple-100/60 dark:border-purple-900/20">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo-amana.png" alt="" width={34} height={34} className="rounded-xl" />
            <span className="text-lg font-bold text-purple-700 dark:text-purple-300">أمانة</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleLang}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {t.toggle}
            </button>
            <Link
              href="/"
              className="hidden items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-slate-500 transition hover:text-purple-600 dark:text-slate-400 sm:flex"
            >
              {t.home}
              <Chevron size={15} />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-14">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3.5 py-1.5 text-xs font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
            <ShieldCheck size={14} />
            {t.badge}
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
            {t.h1}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-500 dark:text-slate-400 sm:text-base">
            {t.sub}
          </p>
        </div>

        {/* اختيار التطبيق */}
        <div
          role="tablist"
          className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900"
        >
          {(['passenger', 'driver'] as AppId[]).map((id) => (
            <button
              key={id}
              role="tab"
              aria-selected={active === id}
              onClick={() => setActive(id)}
              className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                active === id
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
              style={active === id ? { color: ACCENT[id].color } : undefined}
            >
              {t.tabs[id]}
            </button>
          ))}
        </div>

        <AppPanel key={active} app={active} bundle={bundle} t={t} accent={accent} lang={lang} />

        {/* خطوات التثبيت */}
        <section className="mt-12 rounded-2xl border border-slate-200 p-5 dark:border-slate-800 sm:p-7">
          <h2 className="flex items-center gap-2.5 text-base font-bold sm:text-lg">
            <Smartphone size={19} className="text-purple-600 dark:text-purple-400" />
            {t.stepsTitle}
          </h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2">
            {t.steps.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-50 text-xs font-bold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                >
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {step}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-6 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:text-sm">
            {t.stepsNote}
          </p>
        </section>

        {/* اتفاقية الاستخدام */}
        <section className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 sm:p-7">
              <span>
                <h2 className="text-base font-bold sm:text-lg">{t.termsTitle}</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                  {t.termsHint}
                </p>
              </span>
              <ChevronDown
                size={20}
                className="shrink-0 text-slate-400 transition group-open:rotate-180"
              />
            </summary>
            <div className="flex flex-col gap-5 border-t border-slate-200 px-5 py-6 dark:border-slate-800 sm:px-7">
              {t.terms.map((s, i) => (
                <div key={s.h}>
                  <h3 className="text-sm font-bold text-purple-700 dark:text-purple-300">
                    {i + 1}. {s.h}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {s.b}
                  </p>
                </div>
              ))}
            </div>
          </details>
        </section>
      </main>

      <footer className="border-t border-purple-100/60 py-7 text-center text-xs text-slate-500 dark:border-purple-900/20 dark:text-slate-400 sm:text-sm">
        {t.footer}
      </footer>
    </div>
  );
}

/* ------------------------------ لوحة التطبيق ------------------------------ */
function AppPanel({
  app,
  bundle,
  t,
  accent,
  lang,
}: {
  app: AppId;
  bundle: AppBundle;
  t: Strings;
  accent: { color: string; soft: string };
  lang: Lang;
}) {
  const [busy, setBusy] = useState(false);
  const { release, stats, reviews } = bundle;
  const nf = new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-US');

  const notes = (release?.notes ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <>
      <section className="mt-6 rounded-2xl border border-slate-200 p-5 dark:border-slate-800 sm:p-7">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex-1">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: accent.soft, color: accent.color }}
            >
              <Smartphone size={22} />
            </div>
            <h2 className="mt-4 text-lg font-bold sm:text-xl">{t.tabs[app]}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {t.tagline[app]}
            </p>
            <ul className="mt-4 flex flex-col gap-2">
              {t.perks[app].map((p) => (
                <li
                  key={p}
                  className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300"
                >
                  <CheckCircle2 size={15} style={{ color: accent.color }} className="shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="w-full sm:w-64">
            {release ? (
              <>
                <a
                  href={`/api/download/${app}`}
                  onClick={() => setBusy(true)}
                  className="flex items-center justify-center gap-2.5 rounded-xl py-3.5 font-bold text-white transition hover:opacity-90"
                  style={{ background: accent.color }}
                >
                  <Download size={19} />
                  {busy ? t.downloading : t.download}
                </a>
                <p className="mt-2.5 text-center text-xs text-slate-400">
                  {t.version} {release.versionName} · {t.androidReq}
                </p>

                <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-slate-200 text-center dark:bg-slate-800">
                  <Stat v={nf.format(stats.installs)} l={t.stats.installs} />
                  <Stat v={nf.format(stats.updates)} l={t.stats.updates} />
                  <Stat
                    v={stats.ratingAvg != null ? nf.format(stats.ratingAvg) : '—'}
                    l={t.stats.rating}
                  />
                </dl>

                {notes.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {t.whatsNew}
                    </p>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {notes.map((n) => (
                        <li
                          key={n}
                          className="text-xs leading-relaxed text-slate-500 dark:text-slate-400"
                        >
                          · {n}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl bg-slate-50 py-4 text-center text-sm text-slate-400 dark:bg-slate-900">
                {t.none}
              </div>
            )}
          </div>
        </div>
      </section>

      <Reviews app={app} reviews={reviews} t={t} accent={accent} lang={lang} />
    </>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div className="bg-white py-3 dark:bg-slate-950">
      <dd className="text-base font-bold tabular-nums">{v}</dd>
      <dt className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{l}</dt>
    </div>
  );
}

/* --------------------------------- الآراء --------------------------------- */
function Reviews({
  app,
  reviews,
  t,
  accent,
  lang,
}: {
  app: AppId;
  reviews: ReviewRow[];
  t: Strings;
  accent: { color: string; soft: string };
  lang: Lang;
}) {
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  function send() {
    setError('');
    start(async () => {
      const res = await submitReview({ app, name, rating, comment });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      setName('');
      setComment('');
      setRating(5);
    });
  }

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 p-5 dark:border-slate-800 sm:p-7">
      <h2 className="flex items-center gap-2.5 text-base font-bold sm:text-lg">
        <Star size={19} style={{ color: accent.color }} />
        {t.reviewsTitle}
      </h2>

      {reviews.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t.noReviews}</p>
      ) : (
        <ul className="mt-5 flex flex-col gap-4">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-slate-100 pb-4 last:border-0 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-bold">{r.name}</span>
                <Stars value={r.rating} color={accent.color} />
                <span className="text-xs text-slate-400">
                  {new Date(r.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB')}
                </span>
              </div>
              {r.comment && (
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {r.comment}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800">
        {done ? (
          <p className="text-sm font-medium" style={{ color: accent.color }}>
            {t.thanks}
          </p>
        ) : (
          <>
            <h3 className="text-sm font-bold">{t.formTitle}</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t.fName}
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.fNamePh}
                  maxLength={60}
                  className="h-10 rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"
                />
              </label>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t.fRating}
                </span>
                <div className="flex h-10 items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      aria-label={`${n}`}
                      className="rounded p-0.5 transition hover:scale-110"
                    >
                      <Star
                        size={22}
                        style={{ color: accent.color }}
                        fill={n <= rating ? accent.color : 'none'}
                        strokeWidth={1.8}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="mt-4 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t.fComment}
              </span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t.fCommentPh}
                rows={3}
                maxLength={600}
                className="rounded-lg border border-slate-200 bg-transparent p-3 text-sm dark:border-slate-700"
              />
            </label>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              onClick={send}
              disabled={pending}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60 sm:w-auto sm:px-8"
              style={{ background: accent.color }}
            >
              {pending && <Loader2 size={16} className="animate-spin" />}
              {pending ? t.sending : t.send}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function Stars({ value, color }: { value: number; color: string }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={13} style={{ color }} fill={n <= value ? color : 'none'} strokeWidth={2} />
      ))}
    </span>
  );
}
