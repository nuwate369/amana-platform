'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileQuestion, LayoutDashboard, ArrowRight, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { i18n } from '@/lib/i18n';

export default function NotFound() {
  const router = useRouter();
  const { t } = useTranslation();
  const isRtl = i18n.language === 'ar';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-50/50 p-6 relative overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[30%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full bg-accent-900/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-xl p-10 flex flex-col items-center text-center border border-border">
        
        {/* Background 404 Text */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 text-[120px] font-black text-muted-foreground opacity-5 select-none pointer-events-none z-0">
          404
        </div>

        {/* Icon */}
        <div className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-[6px] border-primary/20 mb-6 mt-4">
          <FileQuestion className="w-10 h-10 text-primary" strokeWidth={2.5} />
        </div>

        {/* Content */}
        <h1 className="relative z-10 text-2xl font-extrabold text-foreground mb-3">
          {t('errors.notFoundTitle', 'عذراً، الصفحة غير موجودة')}
        </h1>
        <p className="relative z-10 text-muted-foreground text-sm leading-relaxed mb-8 max-w-[280px]">
          {t('errors.notFoundDesc', 'يبدو أنك وصلت إلى رابط غير صحيح أو تم حذف الصفحة. لا تقلق، يمكنك العودة للوحة التحكم أو المحاولة مرة أخرى.')}
        </p>

        {/* Buttons */}
        <div className="relative z-10 w-full space-y-3">
          <Link 
            href="/dashboard"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3.5 font-bold transition-colors shadow-lg shadow-primary/20 active:scale-[0.98]"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>{t('errors.returnToDashboard', 'العودة للوحة التحكم')}</span>
          </Link>
          
          <button 
            onClick={() => router.back()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-background border border-border text-foreground hover:bg-muted px-6 py-3.5 font-bold transition-colors active:scale-[0.98]"
          >
            {isRtl ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            <span>{t('errors.goBack', 'الرجوع للصفحة السابقة')}</span>
          </button>
        </div>
      </div>

      <p className="relative z-10 text-center text-brand-400 text-xs mt-10 font-medium">
        Amana Platform © {new Date().getFullYear()}
      </p>
    </main>
  );
}
