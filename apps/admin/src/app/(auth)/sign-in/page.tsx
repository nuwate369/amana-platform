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
import { translateSupabaseError } from '@/lib/supabase-errors';
import { Mail, Lock, LogIn, ShieldCheck, Eye, EyeOff, Globe } from 'lucide-react';
import { i18n } from '@/lib/i18n';

export default function SignInPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      notify.error(translateSupabaseError(error.message, t));
      return;
    }

    // حفظ التذكير في localStorage
    if (rememberMe) {
      localStorage.setItem('amana_remember_email', values.email);
    } else {
      localStorage.removeItem('amana_remember_email');
    }

    notify.success(t('common.success'));
    router.replace('/');
  });

  // استرجاع البريد المحفوظ
  const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('amana_remember_email') : null;

  return (
    <div className="w-full bg-card border border-border rounded-3xl p-8 shadow-sm">
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {t('auth.signInTitle', 'تسجيل الدخول')}
        </h2>

        <div className="space-y-4">
          {/* Email Input */}
          <div>
            <div className="relative">
              <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="email"
                defaultValue={savedEmail || ''}
                className={`w-full rounded-xl border border-input bg-background py-3.5 ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors`}
                placeholder={t('auth.email', 'البريد الإلكتروني')}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-sm text-red-500">{translateError(t, errors.email.message)}</p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <div className="relative">
              <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className={`w-full rounded-xl border border-input bg-background py-3.5 ${isRtl ? 'pr-12 pl-12' : 'pl-12 pr-12'} text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors`}
                placeholder={t('auth.password', 'كلمة المرور')}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute inset-y-0 ${isRtl ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center text-muted-foreground hover:text-foreground transition-colors`}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-sm text-red-500">{translateError(t, errors.password.message)}</p>
            )}
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setRememberMe(!rememberMe)}
            className={`relative w-10 h-5 rounded-full transition-colors ${rememberMe ? 'bg-primary' : 'bg-muted border border-border'}`}
          >
            <span className={`absolute top-[1px] w-4 h-4 rounded-full bg-white transition-transform ${rememberMe ? (isRtl ? 'right-5' : 'left-5') : (isRtl ? 'right-0.5' : 'left-0.5')} shadow-sm`} />
          </button>
          <span className="text-sm text-muted-foreground">{t('auth.rememberMe', 'تذكرني')}</span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3.5 font-bold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70 transition-all shadow-sm active:scale-[0.98]"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
              <span>{t('auth.signInButton', 'دخول')}</span>
            </>
          )}
        </button>

        {/* Links — الدخول بالدعوة فقط؛ لا تسجيل ذاتي */}
        <div className="flex justify-center items-center pt-2 text-sm">
          <Link href="/forgot-password" className="text-muted-foreground hover:text-primary transition-colors">
            {t('auth.forgotPasswordLink', 'نسيت كلمة المرور؟')}
          </Link>
        </div>
      </form>
    </div>
  );
}
