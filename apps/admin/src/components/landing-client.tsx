'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import { AiChatWidget } from '@/components/AiChatWidget';

type Lang = 'ar' | 'en';

/* ----------------------------- Text Dictionary ----------------------------- */
const STR = {
  ar: {
    dir: 'rtl' as const,
    nav: { features: 'المزايا الفريدة', how: 'كيف نعمل', safety: 'منظومة الأمان', groups: 'المجموعات', download: 'التطبيقات', cta: 'انضمّي إلينا' },
    hero: {
      badge: 'المنصّة السعودية الأولى للتمكين والتنقّل النسائي بالذكاء الاصطناعي',
      t1: 'رحلتكِ… بأمان مطلق',
      t2: 'وراحة لا تُضاهى.',
      sub: 'أمانة منصّة تنقّل نسائيّة 100% مصمّمة خصيصاً للمرأة في المملكة العربية السعودية تماشياً مع رؤية 2030. سائقات موثّقت بالكامل، مجموعات مغلقة للزميلات، اقتراح وجهات ذكي (AI Planner)، وأمان لحظي 24/7.',
      c1: 'سائقات موثّقات بالهوية والتحقق الجنائي', c2: 'ذكاء اصطناعي لاقتراح الوجهات وحساب الأجرة', c3: 'مجموعات نقل مشتركة مغلقة للجامعات والموظفات',
      cardTitle: 'أمانة', cardSub: 'منصّة التنقّل الذكية للمرأة',
      destLabel: 'الوجهة الحالية', destVal: 'سائقتكِ المعتمدة في الطريق إليكِ', eta: '٣ دقائق',
      rateLabel: 'تقييم السائقة', rateVal: '٤٫٩ من ٥ — موثّقة رسميًا',
    },
    stats: [
      { k: '١٠٠٪', v: 'سائقات سعوديات موثّقات' },
      { k: '٢٤/٧', v: 'غرفة طوارئ ودعم فني' },
      { k: 'AI', v: 'مساعد وجهات ذكي (Groq)' },
      { k: 'KSA', v: 'تغطية شاملة لمدن المملكة' },
    ],
    feat: {
      tag: 'ابتكار أمانة',
      h: 'منظومة تنقّل ذكية متكاملة تصنع الفرق',
      sub: 'صُمّمت أمانة لتلبي تطلّعات المرأة في السعودية بأعلى معايير الخصوصية، الذكاء، والاستدامة البيئية.',
      items: [
        { t: 'بيئة نسائية آمنة 100%', d: 'سائقات وراكبات نساء فقط — بيئة مريحة تضمن أعلى مستويات الخصوصية والراحة النفسية.' },
        { t: 'منظومة أمان متعددة الطبقات', d: 'توثيق جنائي كامل للهوية والرخصة، زر طوارئ SOS مباشر، ومشاركة فورية للمسار مع العائلة.' },
        { t: 'مساعد الوجهات الذكي (AI Planner)', d: 'يقترح لكِ أجمل الوجهات، الفعاليات والمطاعم بناءً على مزاجك وتفضيلاتك الشخصية.' },
        { t: 'مجموعات النقل المغلقة', d: 'ميزة اجتماعية تتيح إنشاء مجموعات نقل مشتركة مع زميلات العمل أو الدراسة بأمان تام.' },
        { t: 'تتبّع لحظي فائق الدقة', d: 'خرائط التوجيه المباشرة مع تحديث لحظي لموقع السائقة وخط السير بدقة عالية.' },
        { t: 'الأثر البيئي والبصمة الكربونية', d: 'احسبي وفر الكربون في كل رحلة وشاهدي مساهمتكِ في تحقيق الاستدامة البيئية.' },
      ],
    },
    how: {
      tag: 'تجربة سلسة', h: 'رحلتكِ تبدأ بثلاث خطوات بسيطة',
      items: [
        { t: 'حدّدي وجهتكِ أو استعيني بالذكاء الاصطناعي', d: 'اختاري موقعكِ أو دعي مساعد أمانة الذكي يقترح لكِ أفضل وجهة وتكلفة عادلة.' },
        { t: 'تابعي سائقتكِ المعتمدة لحظة بلحظة', d: 'اطلعي على بيانات المركبة والهوية الموثّقة وتابعي خط سيرها على الخريطة التفاعلية.' },
        { t: 'صلي بأمان وشاركي انطباعكِ', d: 'استمتعي برحلتكِ واحصلي على تقرير البصمة الكربونية وقيّمي التجربة للحفاظ على الجودة.' },
      ],
    },
    safety: {
      badge: 'معيار السلامة الأقصى',
      h: 'الأمان ليس مجرّد ميزة… إنه أساس أمانة',
      sub: 'طورنا بروتوكولات حماية متكاملة تضمن راحة بالكِ وعائلتكِ في كل كيلومتر تقطعينه.',
      items: [
        { t: 'تدقيق وثائق KYC الصارم', d: 'مراجعة الهوية الوطنية ورخصة القيادة وشهادة الخلو من السوابق لكل سائقة.' },
        { t: 'زر SOS للطوارئ المباشرة', d: 'ارتباط مباشر بغرفة العمليات والتنبيه الفوري لجهات الاتصال المحددة.' },
        { t: 'مشاركة الرحلة الحيّة', d: 'رابط تتبّع مباشر يمكن مشاركته مع أفراد الأسرة لمتابعة المسار لحظة بلحظة.' },
        { t: 'نظام التقييم الثنائي والدعم المستمر', d: 'تقييم شامل يضمن الحفاظ على بيئة راقية وسائقات رفيعات المستوى.' },
      ],
    },
    dl: { h: 'جاهزة لتجربة تنقّل نسائية فريدة؟', sub: 'حمّلي تطبيق الراكبة أو انضمّي كـ سائقة معتمدة في أمانة اليوم.' },
    store: { passenger: 'تطبيق الراكبة', driver: 'تطبيق السائقة', sub: 'تحميل مباشر · أندرويد' },
    footer: {
      tagline: 'منصّة تنقّل ذكيّة وموثوقة مصمّمة بتمكين وإتقان للمرأة في المملكة العربية السعودية.',
      cPlatform: 'المنصّة', cCompany: 'عن أمانة', cLegal: 'الشروط والخصوصية',
      about: 'رؤيتنا 2030', joinDriver: 'انضمّي كسائقة', contact: 'التواصل والدعم',
      terms: 'الشروط والأحكام', privacy: 'سياسة الخصوصية',
      rights: '© ٢٠٢٦ أمانة. جميع الحقوق محفوظة.', admin: 'بوابة الإدارة',
    },
    toggle: { lang: 'EN', theme: 'تبديل الوضع' },
  },
  en: {
    dir: 'ltr' as const,
    nav: { features: 'Unique Features', how: 'How it works', safety: 'Safety Standards', groups: 'Groups', download: 'Apps', cta: 'Get Started' },
    hero: {
      badge: 'Saudi Arabia\'s Premier AI-Powered Women Mobility Platform',
      t1: 'Your Journey…',
      t2: 'Utmost Safety & Comfort.',
      sub: 'Amana is a 100% women-only mobility platform designed for women in Saudi Arabia in line with Vision 2030. Verified drivers, closed commute groups, AI Destination Planner, and 24/7 live security monitoring.',
      c1: 'Background-checked verified women drivers', c2: 'AI Destination & Smart Fare Engine', c3: 'Closed commute groups for universities & workplaces',
      cardTitle: 'Amana', cardSub: 'Smart Mobility for Women',
      destLabel: 'Current Destination', destVal: 'Your verified driver is en route', eta: '3 min',
      rateLabel: 'Driver Rating', rateVal: '4.9 / 5 — Fully Verified',
    },
    stats: [
      { k: '100%', v: 'Verified Saudi Women Drivers' },
      { k: '24/7', v: 'Security Operations & Support' },
      { k: 'AI', v: 'Groq-powered Smart Destination Planner' },
      { k: 'KSA', v: 'Nationwide Kingdom Coverage' },
    ],
    feat: {
      tag: 'Amana Innovation', h: 'An Integrated Smart Ecosystem Making a Difference',
      sub: 'Crafted to fulfill women\'s expectations in Saudi Arabia with the highest standards of privacy, AI intelligence, and environmental sustainability.',
      items: [
        { t: '100% Women-Only Environment', d: 'Women drivers and passengers exclusively — guaranteeing total comfort and privacy.' },
        { t: 'Multi-Layered Security Protocol', d: 'Background verification, instant SOS emergency button, and live family route sharing.' },
        { t: 'Smart AI Destination Planner', d: 'Suggests handpicked destinations, events, and venues tailored to your mood and taste.' },
        { t: 'Closed Commute Groups', d: 'Social feature allowing safe carpooling groups for university students and colleagues.' },
        { t: 'Precision Live Tracking', d: 'Real-time high accuracy Mapbox routing and live driver position updates.' },
        { t: 'Eco Footprint & Carbon Tracking', d: 'Calculate carbon savings on every ride and observe your personal eco contribution.' },
      ],
    },
    how: {
      tag: 'Seamless Flow', h: 'Your Ride Begins in Three Simple Steps',
      items: [
        { t: 'Select Destination or Ask AI', d: 'Pick your location or let Amana\'s AI recommend ideal spots with transparent pricing.' },
        { t: 'Track Your Verified Driver Live', d: 'Inspect driver profile details and follow her exact car position on the interactive map.' },
        { t: 'Arrive Safely & Review Impact', d: 'Enjoy your comfortable ride, view your eco impact, and rate your experience.' },
      ],
    },
    safety: {
      badge: 'Uncompromising Safety Standards', h: 'Safety Isn\'t Just a Feature… It\'s Amana\'s Core',
      sub: 'We engineered comprehensive security protocols guaranteeing complete peace of mind for you and your family.',
      items: [
        { t: 'Rigorous KYC Verification', d: 'Thorough review of National ID, driver license, and official background checks.' },
        { t: 'Instant SOS Emergency Button', d: 'Direct link to security response team and instant alerts to emergency contacts.' },
        { t: 'Live Route Sharing', d: 'Shareable live GPS link letting your family follow your trip in real time.' },
        { t: 'Dual Rating System & Continuous QA', d: '360° feedback system maintaining premium service quality and top-rated drivers.' },
      ],
    },
    dl: { h: 'Ready to Experience Premium Women-Only Rides?', sub: 'Download the Passenger app or apply as a Verified Driver today.' },
    store: { passenger: 'Passenger App', driver: 'Driver App', sub: 'Direct Download · Android' },
    footer: {
      tagline: 'A smart, trusted mobility platform empowered and engineered for women in Saudi Arabia.',
      cPlatform: 'Platform', cCompany: 'About Amana', cLegal: 'Terms & Privacy',
      about: 'Vision 2030', joinDriver: 'Become a Driver', contact: 'Contact & Support',
      terms: 'Terms & Conditions', privacy: 'Privacy Policy',
      rights: '© 2026 Amana. All rights reserved.', admin: 'Admin Portal',
    },
    toggle: { lang: 'ع', theme: 'Toggle theme' },
  },
};

/* ------------------------------- SVG Icons ------------------------------- */
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
  ai: 'M12 2a2 2 0 012 2v1h4a2 2 0 012 2v4a2 2 0 01-2 2h-1v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4H6a2 2 0 01-2-2V7a2 2 0 012-2h4V4a2 2 0 012-2z M9 12h6',
};

const FEAT_ICONS = [ICONS.women, ICONS.shield, ICONS.ai, ICONS.tag, ICONS.route, ICONS.headset];
const HOW_ICONS = [ICONS.pin, ICONS.route, ICONS.check];
const SAFETY_ICONS = [ICONS.women, ICONS.bell, ICONS.share, ICONS.star];

/* --------------------------------- Components --------------------------------- */
function DownloadCard({
  app,
  label,
  sub,
  onDark = false,
}: {
  app: 'passenger' | 'driver';
  label: string;
  sub: string;
  onDark?: boolean;
}) {
  const isPassenger = app === 'passenger';
  
  return (
    <motion.a
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      href={`/download#${app}`}
      className={`group flex flex-1 items-center gap-4 rounded-2xl border p-4 transition duration-300 sm:min-w-[16rem] sm:flex-none ${
        onDark
          ? 'border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10'
          : 'border-slate-200 bg-white shadow-sm hover:shadow-lg dark:border-slate-800 dark:bg-slate-900'
      }`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
          isPassenger 
            ? 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' 
            : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
          <path d="M17.6 9.5H6.4v8.1c0 .6.5 1.1 1.1 1.1h1v3c0 .7.6 1.3 1.3 1.3s1.3-.6 1.3-1.3v-3h1.8v3c0 .7.6 1.3 1.3 1.3s1.3-.6 1.3-1.3v-3h1c.6 0 1.1-.5 1.1-1.1V9.5zM4.3 9.4c-.7 0-1.3.6-1.3 1.3v5.4c0 .7.6 1.3 1.3 1.3s1.3-.6 1.3-1.3v-5.4c0-.7-.6-1.3-1.3-1.3zm15.4 0c-.7 0-1.3.6-1.3 1.3v5.4c0 .7.6 1.3 1.3 1.3s1.3-.6 1.3-1.3v-5.4c0-.7-.6-1.3-1.3-1.3zM15.3 3.5l.9-1.6a.3.3 0 0 0-.5-.3l-.9 1.6a6.4 6.4 0 0 0-4.6 0L9.3 1.6a.3.3 0 1 0-.5.3l.9 1.6A5.3 5.3 0 0 0 6.4 8.2h11.2a5.3 5.3 0 0 0-2.3-4.7zM9.6 6.2a.6.6 0 1 1 0-1.2.6.6 0 0 1 0 1.2zm4.8 0a.6.6 0 1 1 0-1.2.6.6 0 0 1 0 1.2z" />
        </svg>
      </span>

      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className={`truncate text-sm font-bold ${onDark ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
          {label}
        </span>
        <span className={`truncate text-xs ${onDark ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'}`}>
          {sub}
        </span>
      </span>

      <svg
        viewBox="0 0 24 24"
        className={`h-5 w-5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 ${onDark ? 'text-white/60' : 'text-slate-300 dark:text-slate-600'}`}
        fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </motion.a>
  );
}

/* --------------------------------- main page --------------------------------- */
export default function LandingClient() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Lang>('ar');
  const [phoneState, setPhoneState] = useState<'matching' | 'tracking' | 'arrived'>('matching');

  // Loop through interactive phone mock states for hero
  useEffect(() => {
    const interval = setInterval(() => {
      setPhoneState((prev) => {
        if (prev === 'matching') return 'tracking';
        if (prev === 'tracking') return 'arrived';
        return 'matching';
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 100, damping: 15 }
    }
  };

  return (
    <div
      dir={t.dir}
      lang={lang}
      className="min-h-screen overflow-x-hidden bg-white text-slate-900 antialiased transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100"
    >
      {/* Dynamic Purple/Gold background glow fields */}
      <div className="absolute top-0 left-0 w-full overflow-hidden pointer-events-none -z-10 h-[1000px]">
        <div className="absolute -top-[300px] right-[-100px] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[120px] dark:bg-purple-900/15" />
        <div className="absolute top-[200px] left-[-200px] w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[120px] dark:bg-amber-500/5" />
      </div>

      {/* ============================ Header Navbar ============================ */}
      <header className="sticky top-0 z-50 border-b border-purple-100/60 bg-white/70 backdrop-blur-xl dark:border-purple-900/20 dark:bg-slate-950/70 transition-all duration-300">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow ring-1 ring-purple-100 dark:ring-purple-800/40">
              <img src="/amana-logo.jpg" alt="أمانة" className="h-10 w-10 object-cover" />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white bg-gradient-to-r from-purple-600 to-amber-500 dark:from-purple-400 dark:to-amber-400 bg-clip-text text-transparent">
              {lang === 'ar' ? 'أمانة' : 'Amana'}
            </span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300 lg:flex">
            <a href="#features" className="transition hover:text-purple-600 dark:hover:text-purple-400">{t.nav.features}</a>
            <a href="#how" className="transition hover:text-purple-600 dark:hover:text-purple-400">{t.nav.how}</a>
            <a href="#safety" className="transition hover:text-purple-600 dark:hover:text-purple-400">{t.nav.safety}</a>
            <a href="#download" className="transition hover:text-purple-600 dark:hover:text-purple-400">{t.nav.download}</a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-sm font-bold text-slate-600 transition hover:border-purple-400 hover:text-purple-600 dark:border-slate-800 dark:text-slate-300 dark:hover:text-purple-400"
              aria-label="Language"
            >
              {t.toggle.lang}
            </button>
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-purple-400 hover:text-purple-600 dark:border-slate-800 dark:text-slate-300 dark:hover:text-purple-400"
              aria-label={t.toggle.theme}
            >
              <Icon path={mounted && isDark ? ICONS.sun : ICONS.moon} className="h-[18px] w-[18px]" />
            </button>
            <a
              href="#download"
              className="rounded-xl px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:shadow-purple-500/20 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #EAB308 100%)' }}
            >
              {t.nav.cta}
            </a>
          </div>
        </div>
      </header>

      {/* =============================== Hero Section =============================== */}
      <section className="relative overflow-hidden scroll-mt-20 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 md:grid-cols-2">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.span 
              variants={itemVariants}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold border border-purple-100 bg-purple-50/50 text-purple-700 dark:border-purple-900/30 dark:bg-purple-950/30 dark:text-purple-300"
            >
              <Icon path={ICONS.shield} className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              {t.hero.badge}
            </motion.span>
            
            <motion.h1 
              variants={itemVariants}
              className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white md:text-6xl"
            >
              {t.hero.t1}
              <br />
              <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 bg-clip-text text-transparent">
                {t.hero.t2}
              </span>
            </motion.h1>
            
            <motion.p 
              variants={itemVariants}
              className="mt-6 max-w-lg text-lg leading-relaxed text-slate-500 dark:text-slate-400"
            >
              {t.hero.sub}
            </motion.p>
            
            <motion.div 
              variants={itemVariants}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4"
            >
              <DownloadCard app="passenger" label={t.store.passenger} sub={t.store.sub} />
              <DownloadCard app="driver" label={t.store.driver} sub={t.store.sub} />
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-500 dark:text-slate-400"
            >
              {[t.hero.c1, t.hero.c2, t.hero.c3].map((c) => (
                <span key={c} className="flex items-center gap-2">
                  <Icon path={ICONS.check} className="h-5 w-5 text-amber-500" /> {c}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Interactive Dynamic Smartphone Mockup */}
          <div className="relative mx-auto w-full max-w-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="relative overflow-hidden rounded-[3rem] p-6 shadow-2xl border-4 border-slate-900 dark:border-slate-800 bg-slate-950 aspect-[9/18.5] flex flex-col"
            >
              {/* Phone Speaker Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-900 rounded-full z-20 flex items-center justify-center">
                <div className="w-12 h-1 bg-slate-800 rounded-full" />
              </div>

              {/* Dynamic Interactive UI */}
              <div className="relative flex-1 rounded-[2.2rem] overflow-hidden bg-slate-900 p-4 flex flex-col justify-between border border-white/5 pt-8">
                {/* Header status bar */}
                <div className="flex justify-between items-center text-[10px] text-white/60 px-2">
                  <span>9:41 AM</span>
                  <div className="flex gap-1.5 items-center">
                    <span>5G</span>
                    <div className="w-5 h-2.5 border border-white/40 rounded-sm p-0.5"><div className="bg-white h-full w-full rounded-2xs" /></div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center items-center relative py-6">
                  {/* Matching State Screen */}
                  <AnimatePresence mode="wait">
                    {phoneState === 'matching' && (
                      <motion.div
                        key="matching"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.4 }}
                        className="text-center w-full"
                      >
                        <div className="relative flex justify-center items-center my-6">
                          <span className="absolute flex h-24 w-24 animate-ping rounded-full bg-purple-500/10 opacity-75" />
                          <span className="absolute flex h-16 w-16 animate-pulse rounded-full bg-purple-500/20" />
                          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30">
                            <Icon path={ICONS.sparkles} className="h-7 w-7" />
                          </div>
                        </div>
                        <h4 className="text-white text-md font-bold mt-2">
                          {lang === 'ar' ? 'البحث عن سائقة...' : 'Looking for a driver...'}
                        </h4>
                        <p className="text-xs text-white/50 mt-1">
                          {lang === 'ar' ? 'نبحث عن سائقة قريبة منكِ' : 'Looking for nearby drivers'}
                        </p>
                      </motion.div>
                    )}

                    {/* Tracking State Screen */}
                    {phoneState === 'tracking' && (
                      <motion.div
                        key="tracking"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.4 }}
                        className="w-full flex-1 flex flex-col justify-between"
                      >
                        {/* Fake map snippet */}
                        <div className="h-32 w-full rounded-2xl bg-slate-800/80 border border-white/5 relative overflow-hidden flex items-center justify-center">
                          {/* Map lines */}
                          <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M0,20 Q40,40 100,20 M10,0 C30,40 60,70 100,100 M0,80 L100,50" stroke="white" strokeWidth="2" fill="none" />
                          </svg>
                          {/* Pins */}
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="absolute top-8 left-12 w-4 h-4 bg-purple-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg"
                          >
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          </motion.div>
                          <motion.div
                            animate={{ x: [0, 40, 0], y: [0, 10, 0] }}
                            transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
                            className="absolute top-16 right-20 w-6 h-6 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg border border-white/20"
                          >
                            <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
                              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                            </svg>
                          </motion.div>
                        </div>
                        <div className="mt-4 text-center">
                          <h4 className="text-white text-sm font-bold">{t.hero.destVal}</h4>
                          <span className="inline-block mt-2 rounded-full px-3 py-1 text-xs font-bold text-amber-900 bg-amber-400">{t.hero.eta}</span>
                        </div>
                      </motion.div>
                    )}

                    {/* Arrived State Screen */}
                    {phoneState === 'arrived' && (
                      <motion.div
                        key="arrived"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.4 }}
                        className="text-center w-full"
                      >
                        <div className="relative flex justify-center items-center my-6">
                          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-green-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
                            <Icon path={ICONS.check} className="h-8 w-8" />
                          </div>
                        </div>
                        <h4 className="text-white text-md font-bold mt-2">
                          {lang === 'ar' ? 'وصلت سائقتكِ' : 'Driver Arrived'}
                        </h4>
                        <p className="text-xs text-white/50 mt-1">
                          {lang === 'ar' ? 'سيارتكِ بالانتظار بالخارج' : 'Your vehicle is waiting outside'}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bottom App Card HUD */}
                <div className="space-y-2 mt-auto">
                  <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-start backdrop-blur-md border border-white/10">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                      <Icon path={ICONS.pin} className="h-5 w-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/60">{t.hero.destLabel}</p>
                      <p className="text-xs font-bold text-white truncate">{t.hero.cardTitle}</p>
                    </div>
                    <span className="rounded-full px-2.5 py-0.5 text-[9px] font-bold text-purple-900 bg-purple-300">{t.hero.cardSub}</span>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-start backdrop-blur-md border border-white/10">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
                      <Icon path={ICONS.star} className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-[10px] text-white/60">{t.hero.rateLabel}</p>
                      <p className="text-xs font-bold text-white">{t.hero.rateVal}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================ Metrics Ribbon ============================ */}
      <section className="border-y border-purple-100/60 bg-gradient-to-r from-purple-500/5 via-amber-500/5 to-purple-500/5 dark:border-purple-900/20">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-5 py-10 md:grid-cols-4">
          {t.stats.map((s, idx) => (
            <motion.div
              key={s.v}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 to-amber-500 dark:from-purple-400 dark:to-amber-400 bg-clip-text text-transparent">{s.k}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-medium">{s.v}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* =============================== Features Bento Grid =============================== */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/40 rounded-full px-4 py-1.5 bg-purple-50/50 dark:bg-purple-950/20">{t.feat.tag}</span>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white md:text-5xl">{t.feat.h}</h2>
          <p className="mt-4 text-slate-500 dark:text-slate-400 text-md">{t.feat.sub}</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          {/* Bento Box 1 - 100% Women-only */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="md:col-span-2 group rounded-3xl border border-slate-150 bg-white p-8 shadow-sm hover:shadow-lg dark:border-purple-900/20 dark:bg-slate-900/60 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Icon path={FEAT_ICONS[0]} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">{t.feat.items[0].t}</h3>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 max-w-lg">{t.feat.items[0].d}</p>
            </div>
            
            {/* Visual enhancement: avatars display */}
            <div className="flex items-center gap-3 mt-8">
              <div className="flex -space-x-3 rtl:space-x-reverse">
                <div className="w-10 h-10 rounded-full bg-purple-600 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-bold text-white">S</div>
                <div className="w-10 h-10 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-bold text-white">A</div>
                <div className="w-10 h-10 rounded-full bg-pink-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-bold text-white">L</div>
              </div>
              <span className="text-xs font-medium text-slate-400">{lang === 'ar' ? 'سائقات وعميلات موثقات بنسبة 100%' : '100% Verified profiles'}</span>
            </div>
          </motion.div>

          {/* Bento Box 2 - Safety & Privacy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="group rounded-3xl border border-slate-150 bg-white p-8 shadow-sm hover:shadow-lg dark:border-purple-900/20 dark:bg-slate-900/60 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <Icon path={FEAT_ICONS[1]} />
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">{t.feat.items[1].t}</h3>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t.feat.items[1].d}</p>
            </div>
            
            {/* Visual enhancement: Active emergency SOS alert trigger */}
            <div className="mt-8 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 flex justify-between items-center">
              <span className="text-xs font-bold text-red-500 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                {lang === 'ar' ? 'بث طوارئ SOS نشط' : 'Active SOS Alert'}
              </span>
              <span className="text-[10px] text-red-400/80 font-bold">24/7 Monitoring</span>
            </div>
          </motion.div>

          {/* Bento Box 3 - Built-in AI */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="group rounded-3xl border border-slate-150 bg-white p-8 shadow-sm hover:shadow-lg dark:border-purple-900/20 dark:bg-slate-900/60 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Icon path={FEAT_ICONS[2]} />
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">{t.feat.items[2].t}</h3>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t.feat.items[2].d}</p>
            </div>
            <div className="mt-6 flex justify-end">
              <span className="rounded-full bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 px-3 py-1 text-xs font-bold">Groq AI</span>
            </div>
          </motion.div>

          {/* Bento Box 4 - Fair Dynamic Pricing */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="md:col-span-2 group rounded-3xl border border-slate-150 bg-white p-8 shadow-sm hover:shadow-lg dark:border-purple-900/20 dark:bg-slate-900/60 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <Icon path={FEAT_ICONS[3]} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">{t.feat.items[3].t}</h3>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 max-w-lg">{t.feat.items[3].d}</p>
            </div>

            {/* Visual enhancement: Dynamic Pricing Chart Mockup */}
            <div className="mt-8 h-20 w-full flex items-end gap-2 border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
              <div className="w-full h-8 bg-slate-100 dark:bg-slate-800 rounded-t-lg transition-all group-hover:h-12 duration-500" />
              <div className="w-full h-12 bg-slate-100 dark:bg-slate-800 rounded-t-lg transition-all group-hover:h-16 duration-500" />
              <div className="w-full h-16 bg-gradient-to-t from-purple-500 to-amber-500 rounded-t-lg transition-all group-hover:h-20 duration-500" />
              <div className="w-full h-10 bg-slate-100 dark:bg-slate-800 rounded-t-lg transition-all group-hover:h-14 duration-500" />
            </div>
          </motion.div>

          {/* Bento Box 5 - Real-time Tracking */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="md:col-span-2 group rounded-3xl border border-slate-150 bg-white p-8 shadow-sm hover:shadow-lg dark:border-purple-900/20 dark:bg-slate-900/60 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Icon path={FEAT_ICONS[4]} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">{t.feat.items[4].t}</h3>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 max-w-lg">{t.feat.items[4].d}</p>
            </div>

            <div className="mt-8 flex items-center gap-4 text-xs font-semibold text-purple-600 dark:text-purple-400">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Mapbox Live Route Streaming active</span>
            </div>
          </motion.div>

          {/* Bento Box 6 - Smart Support */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="group rounded-3xl border border-slate-150 bg-white p-8 shadow-sm hover:shadow-lg dark:border-purple-900/20 dark:bg-slate-900/60 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <Icon path={FEAT_ICONS[5]} />
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">{t.feat.items[5].t}</h3>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t.feat.items[5].d}</p>
            </div>

            <div className="mt-8 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">{lang === 'ar' ? 'فريق الدعم نشط' : 'Support desk active'}</span>
              <Icon path={ICONS.headset} className="h-5 w-5 text-amber-500" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================== How It Works ============================== */}
      <section id="how" className="scroll-mt-20 bg-gradient-to-b from-purple-50/50 to-white py-20 dark:from-purple-950/10 dark:to-slate-950">
        <div className="mx-auto max-w-5xl px-5">
          <div className="mb-20 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/40 rounded-full px-4 py-1.5 bg-purple-50/50 dark:bg-purple-950/20">{t.how.tag}</span>
            <h2 className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white md:text-5xl">{t.how.h}</h2>
          </div>
          
          <div className="relative grid gap-12 md:grid-cols-3">
            <div className="absolute inset-x-[16%] top-10 hidden border-t-2 border-dashed border-purple-200/55 dark:border-purple-500/20 md:block" />
            {t.how.items.map((s, i) => (
              <motion.div
                key={s.t}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative flex flex-col items-center text-center group"
              >
                <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white text-purple-600 shadow-xl ring-8 ring-purple-50 dark:bg-slate-900 dark:text-purple-400 dark:ring-purple-500/5 transition-transform duration-300 group-hover:scale-105">
                  <Icon path={HOW_ICONS[i]} className="h-9 w-9 text-purple-600 dark:text-purple-400" />
                  <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #7C3AED, #EAB308)' }}>{i + 1}</span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{s.t}</h3>
                <p className="max-w-[240px] text-sm leading-relaxed text-slate-500 dark:text-slate-400">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =============================== Safety Section =============================== */}
      <section id="safety" className="scroll-mt-20 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="overflow-hidden rounded-[3rem] px-8 py-16 text-white shadow-2xl md:px-16 relative"
            style={{ background: 'linear-gradient(150deg, #3B0764 0%, #1e1b4b 100%)' }}
          >
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[80px]" />

            <div className="grid items-center gap-12 md:grid-cols-2 relative z-10">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-purple-300 border border-purple-500/20 bg-purple-500/10">
                  <Icon path={ICONS.shield} className="h-4 w-4 text-purple-400" /> {t.safety.badge}
                </span>
                <h2 className="mt-6 text-3xl font-extrabold leading-tight md:text-5xl">{t.safety.h}</h2>
                <p className="mt-4 leading-relaxed text-white/70 text-md">{t.safety.sub}</p>
              </div>
              <ul className="space-y-4">
                {t.safety.items.map((f, i) => (
                  <motion.li
                    key={f.t}
                    whileHover={{ x: lang === 'ar' ? -5 : 5 }}
                    className="flex items-start gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur-md"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-purple-300 bg-purple-500/10">
                      <Icon path={SAFETY_ICONS[i]} className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="font-bold text-white">{f.t}</p>
                      <p className="text-sm text-white/60 mt-1">{f.d}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================== Download App Center ============================== */}
      <section id="download" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[3rem] px-8 py-20 text-center shadow-2xl border border-purple-500/10"
          style={{ background: 'linear-gradient(135deg, #4C1D95 0%, #1E1B4B 50%, #7C3AED 100%)' }}
        >
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-xl" />
          <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-amber-500/5 blur-xl" />
          
          <div className="relative mx-auto max-w-2xl text-white">
            <h2 className="text-3xl font-extrabold md:text-5xl leading-tight">{t.dl.h}</h2>
            <p className="mt-4 text-white/80 text-md">{t.dl.sub}</p>
            <div className="mx-auto mt-10 flex max-w-2xl flex-col gap-4 sm:flex-row sm:justify-center">
              <DownloadCard app="passenger" label={t.store.passenger} sub={t.store.sub} onDark />
              <DownloadCard app="driver" label={t.store.driver} sub={t.store.sub} onDark />
            </div>
          </div>
        </motion.div>
      </section>

      {/* =============================== Footer =============================== */}
      <footer className="border-t border-purple-100/60 bg-purple-50/20 dark:border-purple-900/10 dark:bg-slate-900/20">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow ring-1 ring-purple-100 dark:ring-purple-800/40">
                  <img src="/amana-logo.jpg" alt="أمانة" className="h-9 w-9 object-cover" />
                </span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white bg-gradient-to-r from-purple-600 to-amber-500 bg-clip-text text-transparent">أمانة</span>
              </div>
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t.footer.tagline}</p>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">{t.footer.cPlatform}</h4>
              <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                <li><a href="#features" className="transition hover:text-purple-600 dark:hover:text-purple-400">{t.nav.features}</a></li>
                <li><a href="#how" className="transition hover:text-purple-600 dark:hover:text-purple-400">{t.nav.how}</a></li>
                <li><a href="#safety" className="transition hover:text-purple-600 dark:hover:text-purple-400">{t.nav.safety}</a></li>
                <li><a href="#download" className="transition hover:text-purple-600 dark:hover:text-purple-400">{t.nav.download}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">{t.footer.cCompany}</h4>
              <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                <li><a href="#" className="transition hover:text-purple-600 dark:hover:text-purple-400">{t.footer.about}</a></li>
                <li><a href="#" className="transition hover:text-purple-600 dark:hover:text-purple-400">{t.footer.joinDriver}</a></li>
                <li><a href="#" className="transition hover:text-purple-600 dark:hover:text-purple-400">{t.footer.contact}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">{t.footer.cLegal}</h4>
              <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                <li><a href="#" className="transition hover:text-purple-600 dark:hover:text-purple-400">{t.footer.terms}</a></li>
                <li><a href="#" className="transition hover:text-purple-600 dark:hover:text-purple-400">{t.footer.privacy}</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-purple-100/60 dark:border-purple-900/10 pt-8 text-sm text-slate-400 dark:text-slate-500 sm:flex-row">
            <p>{t.footer.rights}</p>
            <Link href="/dashboard" className="transition hover:text-purple-600 dark:hover:text-purple-400 font-semibold">{t.footer.admin}</Link>
          </div>
        </div>
      </footer>

      {/* Guest intelligent AI widget */}
      <AiChatWidget lang={lang} />
    </div>
  );
}
