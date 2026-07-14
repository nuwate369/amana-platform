'use client';

import { ThemeProvider } from 'next-themes';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { i18n } from '@/lib/i18n';
import { AuthProvider } from '@/lib/auth';

/**
 * مُنبّهات react-hot-toast:
 *  - الموضع: أسفل الوسط.
 *  - زر إغلاق (X) على كل رسالة.
 *  - مدة ظهور أطول قليلاً (نجاح/معلومة 5s، خطأ 6s).
 *  - شكل محسّن يدعم الوضعين الفاتح/الداكن (عبر متغيّرات HSL) واتجاه حسب اللغة.
 */
function AppToaster() {
  const { i18n: i18nInst } = useTranslation();
  const isRtl = i18nInst.language === 'ar';

  return (
    <Toaster
      position="bottom-center"
      gutter={10}
      containerStyle={{ bottom: 28 }}
      toastOptions={{
        duration: 5000,
        style: {
          direction: isRtl ? 'rtl' : 'ltr',
          background: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '12px',
          padding: '10px 12px',
          boxShadow: '0 12px 32px -12px rgba(0,0,0,0.35)',
          fontSize: '14px',
          fontWeight: 500,
          maxWidth: '440px',
        },
        success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
        error: { duration: 6000, iconTheme: { primary: '#dc2626', secondary: '#fff' } },
      }}
    >
      {(tst) => (
        <ToastBar toast={tst}>
          {({ icon, message }) => (
            <div className="flex items-center gap-2">
              {icon}
              <div className="flex-1 leading-snug">{message}</div>
              {tst.type !== 'loading' && (
                <button
                  type="button"
                  onClick={() => toast.dismiss(tst.id)}
                  className="ms-1 shrink-0 rounded-md p-1 opacity-50 transition-all hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                  aria-label={isRtl ? 'إغلاق' : 'Close'}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}

/**
 * مزوّدات جهة العميل: الوضع الداكن (next-themes) + الترجمة (react-i18next)
 * + سياق المصادقة (AuthProvider) + مُنبّهات (react-hot-toast).
 */
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    const el = document.documentElement;
    el.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    el.lang = i18n.language;
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>{children}</AuthProvider>
        <AppToaster />
      </I18nextProvider>
    </ThemeProvider>
  );
}
