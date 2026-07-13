'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { signInSchema, translateError, type SignInInput } from '@amana/shared-ui/validation';
import { supabase } from '@/lib/supabase/client';
import { notify } from '@/lib/toast';
import { Mail, Lock, LogIn, ShieldCheck, Eye, EyeOff, Globe } from 'lucide-react';
import { i18n } from '@/lib/i18n';

export default function SignInPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const isRtl = i18n.language === 'ar';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  };

  const onSubmit = handleSubmit(async (values) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      notify.error(error.message || t('common.error'));
      return;
    }
    notify.success(t('common.success'));
    router.replace('/');
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-950 p-6 relative overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Language Switcher */}
      <button
        onClick={toggleLanguage}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 bg-brand-800/80 hover:bg-brand-700/80 text-brand-300 border border-brand-700/50 rounded-full px-4 py-2 backdrop-blur-sm transition-colors"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">{i18n.language === 'ar' ? 'English' : 'العربية'}</span>
      </button>

      {/* Premium Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-accent-900/20 blur-[120px]" />
        <div className="absolute top-[40%] -left-[20%] w-[50%] h-[50%] rounded-full bg-brand-800/40 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-800/80 border border-brand-700/50 shadow-xl mb-4 backdrop-blur-sm">
            <ShieldCheck className="w-8 h-8 text-accent-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {t('admin.title', 'أمانة للإدارة')}
          </h1>
          <p className="text-brand-300 mt-2 text-sm">
            {t('admin.subtitle', 'نظام التحكم والتشغيل الموحد')}
          </p>
        </div>

        {/* Glassmorphic Card */}
        <div className="bg-brand-900/60 backdrop-blur-md border border-brand-700/50 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={onSubmit} className="space-y-6" noValidate>
            <h2 className="text-xl font-semibold text-white mb-2">
              {t('auth.signInTitle', 'تسجيل الدخول')}
            </h2>

            <div className="space-y-4">
              {/* Email Input */}
              <div>
                <div className="relative">
                  <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                    <Mail className="h-5 w-5 text-brand-400" />
                  </div>
                  <input
                    type="email"
                    className={`w-full rounded-xl border border-brand-700/60 bg-brand-800/50 py-3.5 ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} text-white placeholder:text-brand-500 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none transition-colors`}
                    placeholder={t('auth.email', 'البريد الإلكتروني')}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-sm text-red-400">{translateError(t, errors.email.message)}</p>
                )}
              </div>

              {/* Password Input */}
              <div>
                <div className="relative">
                  <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                    <Lock className="h-5 w-5 text-brand-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={`w-full rounded-xl border border-brand-700/60 bg-brand-800/50 py-3.5 ${isRtl ? 'pr-12 pl-12' : 'pl-12 pr-12'} text-white placeholder:text-brand-500 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none transition-colors`}
                    placeholder={t('auth.password', 'كلمة المرور')}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute inset-y-0 ${isRtl ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center text-brand-400 hover:text-white transition-colors`}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-sm text-red-400">{translateError(t, errors.password.message)}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-accent-500 to-accent-600 px-6 py-3.5 font-bold text-brand-950 hover:from-accent-400 hover:to-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-brand-900 disabled:opacity-70 transition-all shadow-lg shadow-accent-900/30 active:scale-[0.98]"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-brand-950/30 border-t-brand-950 rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
                  <span>{t('auth.signInButton', 'دخول')}</span>
                </>
              )}
            </button>

            {/* Links */}
            <div className="flex justify-between items-center pt-2 text-sm">
              <Link href="/forgot-password" className="text-brand-400 hover:text-accent-400 transition-colors">
                {t('auth.forgotPasswordLink', 'نسيت كلمة المرور؟')}
              </Link>
              <Link href="/sign-up" className="font-semibold text-accent-500 hover:text-accent-400 transition-colors">
                {t('auth.signUpButton', 'إنشاء حساب')}
              </Link>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-brand-500 text-xs mt-8">
          © {new Date().getFullYear()} منصة أمانة. جميع الحقوق محفوظة.
        </p>
      </div>
    </main>
  );
}
