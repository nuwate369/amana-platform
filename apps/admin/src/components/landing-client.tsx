'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

/**
 * صفحة الهبوط العامّة (مكوّن عميل) — تدعم:
 *  - لغتين (عربي RTL / إنجليزي LTR) عبر حالة محلّية + قاموس نصوص، مع حفظ التفضيل.
 *  - الوضعين الفاتح/الداكن عبر next-themes (نفس مزوّد اللوحة، class على <html>).
 * صفحة تسويقية مستقلّة — لا تلمس مسار المصادقة؛ لوحة الإدارة تبقى على /dashboard.
 */

type Lang = 'ar' | 'en';

/* ----------------------------- قاموس النصوص ----------------------------- */
const STR = {
  ar: {
    dir: 'rtl' as const,
    nav: { features: 'المزايا', how: 'كيف تعمل', safety: 'الأمان', download: 'التطبيق', admin: 'دخول الإدارة', cta: 'ابدئي الآن' },
    hero: {
      badge: 'منصّة تنقّل مصمّمة للمرأة',
      t1: 'تنقّلي بأمان،',
      t2: 'رحلتكِ بين يديكِ.',
      sub: 'سائقات موثّقات، تتبّع مباشر لحظة بلحظة، وزرّ طوارئ يصلكِ بمن تحبّين — مع مساعدة ذكيّة تقترح وجهتكِ القادمة. أمانة تنقلكِ حيث تريدين، وأنتِ مطمئنّة.',
      c1: 'سائقات موثّقات ١٠٠٪', c2: 'دعم على مدار الساعة', c3: 'تتبّع حيّ للرحلة',
      cardTitle: 'أمانة', cardSub: 'التنقّل الذكيّ والآمن',
      destLabel: 'وجهتكِ', destVal: 'سائقتكِ في الطريق إليكِ', eta: '٣ دقائق',
      rateLabel: 'تقييم سائقتكِ', rateVal: '٤٫٩ من ٥ — موثّقة',
    },
    stats: [
      { k: '١٠٠٪', v: 'سائقات موثّقات' }, { k: '٢٤/٧', v: 'دعم فنيّ متواصل' },
      { k: 'مباشر', v: 'تتبّع حيّ للرحلة' }, { k: 'ذكيّ', v: 'اقتراح وجهات بالـ AI' },
    ],
    feat: {
      tag: 'لماذا أمانة', h: 'كلّ ما تحتاجينه لرحلة مطمئنّة',
      sub: 'صُمّمت أمانة من الألف إلى الياء حول أمانكِ وراحتكِ — تقنية حديثة في خدمة ثقتكِ.',
      items: [
        { t: 'سائقات موثّقات', d: 'كلّ سائقة تمرّ بتوثيق كامل للهوية والوثائق قبل استقبال أيّ رحلة — راحة بال منذ اللحظة الأولى.' },
        { t: 'الأمان أوّلًا', d: 'زرّ طوارئ فوريّ، مشاركة رحلتكِ مع من تحبّين، وتقييم مزدوج بعد كلّ رحلة يحافظ على جودة الخدمة.' },
        { t: 'مساعدة ذكيّة للوجهات', d: 'حائرة أين تذهبين؟ مساعِدة أمانة الذكيّة تقترح عليكِ وجهات تناسب مزاجكِ ومناسبتكِ.' },
        { t: 'نقل تشاركيّ', d: 'شاركي رحلتكِ مع أخريات في طريقكِ ووفّري التكلفة — بأمان وخصوصية تامّة.' },
        { t: 'تسعير عادل وشفّاف', d: 'تعرفين تكلفة رحلتكِ قبل انطلاقها — بلا مفاجآت، وبأسعار محسوبة بعدل حسب المسافة.' },
        { t: 'دعم فنيّ ذكيّ', d: 'مساعِدة دعم تجيبكِ فورًا، وتُصعّد لموظف بشريّ عند الحاجة — مساعدة حقيقية في كلّ وقت.' },
      ],
    },
    how: {
      tag: 'بثلاث خطوات', h: 'رحلتكِ تبدأ بلمسة',
      items: [
        { t: 'اطلبي رحلتكِ', d: 'حدّدي وجهتكِ على الخريطة واعرفي التكلفة قبل التأكيد.' },
        { t: 'تتبّعي سائقتكِ', d: 'تابعي موقع سائقتكِ الموثّقة لحظة بلحظة حتى وصولها إليكِ.' },
        { t: 'وصلتِ بأمان', d: 'استمتعي برحلتكِ، وقيّمي تجربتكِ في النهاية لنحافظ على الجودة.' },
      ],
    },
    safety: {
      badge: 'أمانكِ مسؤوليّتنا', h: 'صُمّمت لتشعري بالأمان في كلّ لحظة',
      sub: 'لم نضِف الأمان لاحقًا — بنينا أمانة عليه. من توثيق السائقات إلى زرّ الطوارئ، كلّ تفصيلة تخدم طمأنينتكِ.',
      items: [
        { t: 'توثيق كامل للسائقات', d: 'هوية ووثائق مُراجَعة قبل أيّ رحلة.' },
        { t: 'زرّ الطوارئ SOS', d: 'مساعدة فورية بضغطة واحدة عند الحاجة.' },
        { t: 'مشاركة الرحلة', d: 'شاركي مسار رحلتكِ مباشرةً مع عائلتكِ.' },
        { t: 'تقييم مزدوج', d: 'تقييم بعد كلّ رحلة يرفع جودة الخدمة باستمرار.' },
      ],
    },
    dl: { h: 'جاهزة لرحلتكِ الأولى؟', sub: 'حمّلي تطبيق أمانة الآن وابدئي التنقّل بثقة وطمأنينة. متاح قريبًا على متجرَي التطبيقات.' },
    store: { from: 'حمّلي من' },
    footer: {
      tagline: 'منصّة تنقّل ذكيّة وآمنة مصمّمة للمرأة — رحلتكِ بين يديكِ.',
      cPlatform: 'المنصّة', cCompany: 'الشركة', cLegal: 'قانونيّ',
      about: 'من نحن', joinDriver: 'انضمّي كسائقة', contact: 'تواصلي معنا',
      terms: 'الشروط والأحكام', privacy: 'سياسة الخصوصية',
      rights: '© ٢٠٢٦ أمانة. جميع الحقوق محفوظة.', admin: 'لوحة الإدارة',
    },
    toggle: { lang: 'EN', theme: 'تبديل الوضع' },
  },
  en: {
    dir: 'ltr' as const,
    nav: { features: 'Features', how: 'How it works', safety: 'Safety', download: 'App', admin: 'Admin', cta: 'Get started' },
    hero: {
      badge: 'A ride-hailing platform built for women',
      t1: 'Move safely,',
      t2: 'your ride in your hands.',
      sub: 'Verified women drivers, real-time tracking, and an SOS button that connects you to your loved ones — plus a smart assistant to suggest your next destination. Amana takes you where you want, with peace of mind.',
      c1: '100% verified drivers', c2: 'Round-the-clock support', c3: 'Live ride tracking',
      cardTitle: 'Amana', cardSub: 'Smart & safe mobility',
      destLabel: 'Your destination', destVal: 'Your driver is on the way', eta: '3 min',
      rateLabel: 'Driver rating', rateVal: '4.9 / 5 — verified',
    },
    stats: [
      { k: '100%', v: 'Verified drivers' }, { k: '24/7', v: 'Continuous support' },
      { k: 'Live', v: 'Real-time tracking' }, { k: 'AI', v: 'Smart destination tips' },
    ],
    feat: {
      tag: 'Why Amana', h: 'Everything you need for a worry-free ride',
      sub: 'Amana was designed end to end around your safety and comfort — modern technology in service of your trust.',
      items: [
        { t: 'Verified women drivers', d: 'Every driver passes full identity and document verification before taking any ride — peace of mind from the first moment.' },
        { t: 'Safety first', d: 'An instant SOS button, ride sharing with loved ones, and dual ratings after every trip keep service quality high.' },
        { t: 'Smart destination help', d: 'Not sure where to go? Amana’s smart assistant suggests destinations that fit your mood and occasion.' },
        { t: 'Shared rides', d: 'Share your ride with others heading your way and save on cost — safely and with full privacy.' },
        { t: 'Fair, transparent pricing', d: 'Know your fare before you go — no surprises, priced fairly by distance.' },
        { t: 'Smart support', d: 'A support assistant answers you instantly and escalates to a human when needed — real help, any time.' },
      ],
    },
    how: {
      tag: 'In three steps', h: 'Your ride starts with a tap',
      items: [
        { t: 'Request your ride', d: 'Set your destination on the map and see the fare before confirming.' },
        { t: 'Track your driver', d: 'Follow your verified driver’s location in real time until she arrives.' },
        { t: 'Arrive safely', d: 'Enjoy your ride, and rate your experience at the end to keep quality high.' },
      ],
    },
    safety: {
      badge: 'Your safety is our duty', h: 'Built to make you feel safe every moment',
      sub: 'We didn’t add safety later — we built Amana on it. From driver verification to the SOS button, every detail serves your peace of mind.',
      items: [
        { t: 'Full driver verification', d: 'Identity and documents reviewed before any ride.' },
        { t: 'SOS emergency button', d: 'Instant help with a single tap when you need it.' },
        { t: 'Ride sharing', d: 'Share your route live with your family.' },
        { t: 'Dual ratings', d: 'Ratings after every ride continuously raise service quality.' },
      ],
    },
    dl: { h: 'Ready for your first ride?', sub: 'Download the Amana app now and start moving with confidence. Coming soon to both app stores.' },
    store: { from: 'Download on' },
    footer: {
      tagline: 'A smart, safe ride-hailing platform built for women — your ride in your hands.',
      cPlatform: 'Platform', cCompany: 'Company', cLegal: 'Legal',
      about: 'About us', joinDriver: 'Become a driver', contact: 'Contact us',
      terms: 'Terms & Conditions', privacy: 'Privacy Policy',
      rights: '© 2026 Amana. All rights reserved.', admin: 'Admin panel',
    },
    toggle: { lang: 'ع', theme: 'Toggle theme' },
  },
};

/* ------------------------------- أيقونات SVG ------------------------------- */
function Icon({ path, className = 'h-7 w-7' }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={path} />
    </svg>
  );
}
const ICONS = {
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z M9 12l2 2 4-4',
  women: 'M12 8a3 3 0 100-6 3 3 0 000 6zM12 8v9m-3-3h6M12 21v-4',
  sparkles: 'M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z M5 16l.9 2.1L8 19l-2.1.9L5 22l-.9-2.1L2 19l2.1-.9L5 16z',
  share: 'M8.6 13.5l6.8 4M15.4 6.5l-6.8 4M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6z',
  tag: 'M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0l-7.4-7.4A2 2 0 013 11.8V5a2 2 0 012-2h6.8a2 2 0 011.4.6l7.4 7.4a2 2 0 010 2.8z M8 8h.01',
  headset: 'M4 14v-3a8 8 0 0116 0v3 M4 14a2 2 0 002 2h1v-5H6a2 2 0 00-2 2z M20 14a2 2 0 01-2 2h-1v-5h1a2 2 0 012 2z M18 16v1a3 3 0 01-3 3h-3',
  pin: 'M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z M12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  route: 'M6 19a2 2 0 100-4 2 2 0 000 4z M18 9a2 2 0 100-4 2 2 0 000 4z M8 17h6a3 3 0 003-3V9 M6 15V7a3 3 0 013-3h1',
  check: 'M20 6L9 17l-5-5',
  star: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.2l5.9-.9L12 3z',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 01-3.4 0',
  sun: 'M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z',
  moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18z M3 12h18 M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9s1-6.5 3.5-9z',
};
const FEAT_ICONS = [ICONS.women, ICONS.shield, ICONS.sparkles, ICONS.share, ICONS.tag, ICONS.headset];
const HOW_ICONS = [ICONS.pin, ICONS.route, ICONS.check];
const SAFETY_ICONS = [ICONS.women, ICONS.bell, ICONS.share, ICONS.star];

/* --------------------------------- مكوّنات --------------------------------- */
function AppBadge({ store, from }: { store: 'apple' | 'google'; from: string }) {
  return (
    <a
      href="#download"
      className="group flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3 text-white shadow-sm ring-1 ring-white/10 transition hover:bg-black dark:bg-white/10 dark:hover:bg-white/20"
    >
      {store === 'apple' ? (
        <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" aria-hidden>
          <path d="M16.7 12.6c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8s-1.7-.8-2.9-.8c-1.5 0-2.9.9-3.6 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1.1 1.6 2.3 2.7 2.2 1.1 0 1.5-.7 2.8-.7s1.7.7 2.9.7c1.2 0 1.9-1.1 2.6-2.1.8-1.2 1.2-2.4 1.2-2.5-.1 0-2.3-.9-2.3-3.5zM14.6 5.9c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.6.6-1 1.6-.9 2.6 1 .1 2-.5 2.5-1.2z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
          <path d="M3.6 2.4l10.3 9.6-2.6 2.5L3.6 2.4z" fill="#34D399" />
          <path d="M3.6 21.6l7.7-11.7 2.6 2.5L3.6 21.6z" fill="#60A5FA" />
          <path d="M17.9 9.3l2.9 1.7c.9.5.9 1.5 0 2l-2.9 1.7-3-2.7 3-2.7z" fill="#FBBF24" />
          <path d="M11.3 12l2.6-2.5 3 2.7-3 2.7-2.6-2.9z" fill="#F87171" />
        </svg>
      )}
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[10px] opacity-80">{from}</span>
        <span className="text-sm font-bold">{store === 'apple' ? 'App Store' : 'Google Play'}</span>
      </span>
    </a>
  );
}

/* --------------------------------- الصفحة --------------------------------- */
export default function LandingClient() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Lang>('ar');

  useEffect(() => {
    setMounted(true);
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('amana_lang') : null;
    if (saved === 'en' || saved === 'ar') setLang(saved);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';
  const t = STR[lang];

  const toggleLang = () => {
    setLang((p) => {
      const n: Lang = p === 'ar' ? 'en' : 'ar';
      try { window.localStorage.setItem('amana_lang', n); } catch { /* ignore */ }
      return n;
    });
  };

  return (
    <div
      dir={t.dir}
      lang={lang}
      className="min-h-screen scroll-smooth bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100"
    >
      {/* ============================ الشريط العلويّ ============================ */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-amana.png" alt="Amana" className="h-8 w-8 object-contain" />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">أمانة</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300 lg:flex">
            <a href="#features" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{t.nav.features}</a>
            <a href="#how" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{t.nav.how}</a>
            <a href="#safety" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{t.nav.safety}</a>
            <a href="#download" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{t.nav.download}</a>
          </nav>
          <div className="flex items-center gap-2">
            {/* مبدّل اللغة */}
            <button
              onClick={toggleLang}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-sm font-bold text-slate-600 transition hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-emerald-400"
              aria-label="Language"
              title="Language"
            >
              {t.toggle.lang}
            </button>
            {/* مبدّل الثيم */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-emerald-400"
              aria-label={t.toggle.theme}
              title={t.toggle.theme}
            >
              <Icon path={mounted && isDark ? ICONS.sun : ICONS.moon} className="h-[18px] w-[18px]" />
            </button>
            <a
              href="#download"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              {t.nav.cta}
            </a>
          </div>
        </div>
      </header>

      {/* =============================== البطل =============================== */}
      <section className="relative overflow-hidden scroll-mt-20">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(1200px 500px at 85% -10%, rgba(14,159,110,0.14), transparent 60%), radial-gradient(900px 500px at 0% 20%, rgba(246,115,155,0.08), transparent 55%)',
          }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Icon path={ICONS.shield} className="h-4 w-4" />
              {t.hero.badge}
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white md:text-5xl">
              {t.hero.t1}
              <br />
              <span className="text-emerald-600 dark:text-emerald-400">{t.hero.t2}</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-500 dark:text-slate-400">{t.hero.sub}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <AppBadge store="apple" from={t.store.from} />
              <AppBadge store="google" from={t.store.from} />
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-500 dark:text-slate-400">
              {[t.hero.c1, t.hero.c2, t.hero.c3].map((c) => (
                <span key={c} className="flex items-center gap-2">
                  <Icon path={ICONS.check} className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> {c}
                </span>
              ))}
            </div>
          </div>

          {/* بطاقة بصرية */}
          <div className="relative mx-auto w-full max-w-sm">
            <div
              className="relative overflow-hidden rounded-[2.5rem] p-8 shadow-2xl"
              style={{ background: 'linear-gradient(160deg, #0E9F6E 0%, #0B7A5E 60%, #1E2A4A 100%)' }}
            >
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
              <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/5" />
              <div className="relative flex flex-col items-center text-center text-white">
                <span className="flex h-28 w-28 items-center justify-center rounded-[1.75rem] bg-white shadow-lg ring-1 ring-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo-amana.png" alt="Amana" className="h-24 w-24 object-contain" />
                </span>
                <h3 className="mt-5 text-2xl font-extrabold">{t.hero.cardTitle}</h3>
                <p className="mt-1 text-sm text-white/80">{t.hero.cardSub}</p>
                <div className="mt-6 w-full space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 text-start backdrop-blur-sm">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 text-emerald-700">
                      <Icon path={ICONS.pin} className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-xs text-white/70">{t.hero.destLabel}</p>
                      <p className="text-sm font-bold">{t.hero.destVal}</p>
                    </div>
                    <span className="rounded-full bg-emerald-400/90 px-2.5 py-1 text-[11px] font-bold text-emerald-950">{t.hero.eta}</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 text-start backdrop-blur-sm">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 text-amber-500">
                      <Icon path={ICONS.star} className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-xs text-white/70">{t.hero.rateLabel}</p>
                      <p className="text-sm font-bold">{t.hero.rateVal}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ شريط الأرقام ============================ */}
      <section className="border-y border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-5 py-10 md:grid-cols-4">
          {t.stats.map((s) => (
            <div key={s.v} className="text-center">
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{s.k}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* =============================== المزايا =============================== */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="text-sm font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{t.feat.tag}</span>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white md:text-4xl">{t.feat.h}</h2>
          <p className="mt-4 text-slate-500 dark:text-slate-400">{t.feat.sub}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {t.feat.items.map((f, i) => (
            <div key={f.t} className="group rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_2px_20px_rgba(15,23,42,0.04)] transition hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(14,159,110,0.12)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none dark:hover:border-emerald-500/30">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-500/10 dark:text-emerald-400 dark:group-hover:bg-emerald-500 dark:group-hover:text-white">
                <Icon path={FEAT_ICONS[i]} />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{f.t}</h3>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================== كيف تعمل ============================== */}
      <section id="how" className="scroll-mt-20 bg-slate-50/60 py-20 dark:bg-slate-900/40">
        <div className="mx-auto max-w-5xl px-5">
          <div className="mb-16 text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{t.how.tag}</span>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white md:text-4xl">{t.how.h}</h2>
          </div>
          <div className="relative grid gap-12 md:grid-cols-3">
            <div className="absolute inset-x-[16%] top-10 hidden border-t-2 border-dashed border-emerald-200 dark:border-emerald-500/20 md:block" />
            {t.how.items.map((s, i) => (
              <div key={s.t} className="relative flex flex-col items-center text-center">
                <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white text-emerald-600 shadow-lg ring-8 ring-emerald-50 dark:bg-slate-900 dark:text-emerald-400 dark:ring-emerald-500/10">
                  <Icon path={HOW_ICONS[i]} className="h-9 w-9" />
                  <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">{i + 1}</span>
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{s.t}</h3>
                <p className="max-w-[220px] text-sm leading-relaxed text-slate-500 dark:text-slate-400">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =============================== الأمان =============================== */}
      <section id="safety" className="scroll-mt-20 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div
            className="overflow-hidden rounded-[2.5rem] px-8 py-14 text-white shadow-xl md:px-16"
            style={{ background: 'linear-gradient(150deg, #1E2A4A 0%, #16223d 100%)' }}
          >
            <div className="grid items-center gap-12 md:grid-cols-2">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-sm font-semibold text-emerald-300">
                  <Icon path={ICONS.shield} className="h-4 w-4" /> {t.safety.badge}
                </span>
                <h2 className="mt-5 text-3xl font-extrabold leading-tight md:text-4xl">{t.safety.h}</h2>
                <p className="mt-4 leading-relaxed text-white/70">{t.safety.sub}</p>
              </div>
              <ul className="space-y-4">
                {t.safety.items.map((f, i) => (
                  <li key={f.t} className="flex items-start gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                      <Icon path={SAFETY_ICONS[i]} className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="font-bold">{f.t}</p>
                      <p className="text-sm text-white/60">{f.d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== التحميل ============================== */}
      <section id="download" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-24">
        <div
          className="relative overflow-hidden rounded-[2.5rem] px-8 py-16 text-center shadow-xl"
          style={{ background: 'linear-gradient(135deg, #0E9F6E 0%, #0B7A5E 100%)' }}
        >
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-white/5" />
          <div className="relative mx-auto max-w-xl text-white">
            <h2 className="text-3xl font-extrabold md:text-4xl">{t.dl.h}</h2>
            <p className="mt-4 text-white/85">{t.dl.sub}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <AppBadge store="apple" from={t.store.from} />
              <AppBadge store="google" from={t.store.from} />
            </div>
          </div>
        </div>
      </section>

      {/* =============================== التذييل =============================== */}
      <footer className="border-t border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo-amana.png" alt="Amana" className="h-7 w-7 object-contain" />
                </span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white">أمانة</span>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t.footer.tagline}</p>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">{t.footer.cPlatform}</h4>
              <ul className="space-y-2.5 text-sm text-slate-500 dark:text-slate-400">
                <li><a href="#features" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{t.nav.features}</a></li>
                <li><a href="#how" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{t.nav.how}</a></li>
                <li><a href="#safety" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{t.nav.safety}</a></li>
                <li><a href="#download" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{t.nav.download}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">{t.footer.cCompany}</h4>
              <ul className="space-y-2.5 text-sm text-slate-500 dark:text-slate-400">
                <li><a href="#" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{t.footer.about}</a></li>
                <li><a href="#" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{t.footer.joinDriver}</a></li>
                <li><a href="#" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{t.footer.contact}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">{t.footer.cLegal}</h4>
              <ul className="space-y-2.5 text-sm text-slate-500 dark:text-slate-400">
                <li><a href="#" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{t.footer.terms}</a></li>
                <li><a href="#" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{t.footer.privacy}</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500 sm:flex-row">
            <p>{t.footer.rights}</p>
            <Link href="/dashboard" className="transition hover:text-slate-600 dark:hover:text-slate-300">{t.footer.admin}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
