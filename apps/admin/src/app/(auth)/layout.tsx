'use client';

import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Globe } from 'lucide-react';
import Image from 'next/image';
import { i18n } from '@/lib/i18n';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('amana-lang', nextLang);
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = nextLang;
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 relative overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Language Switcher */}
      <button
        onClick={toggleLanguage}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 bg-card hover:bg-muted text-muted-foreground border border-border rounded-full px-4 py-2 shadow-sm transition-colors"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">{i18n.language === 'ar' ? 'English' : 'العربية'}</span>
      </button>

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Shared Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/5 border border-primary/10 shadow-sm mb-4 overflow-hidden relative">
            <Image src="/logo.png" alt="Amana Logo" fill className="object-contain p-2" />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            {t('admin.title', 'أمانة للإدارة')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('admin.subtitle', 'نظام التحكم والتشغيل الموحد')}
          </p>
        </div>

        {/* Page Content (The Card) */}
        <div className="w-full">
          {children}
        </div>

        {/* Footer info */}
        <p className="text-center text-muted-foreground text-xs mt-8">
          © {new Date().getFullYear()} {t('app.copyright', 'منصة أمانة. جميع الحقوق محفوظة.')}
        </p>
      </div>
    </div>
  );
}
