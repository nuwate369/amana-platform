'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { emailOnlySchema, translateError } from '@amana/shared-ui/validation';
import { supabase } from '@/lib/supabase/client';
import { notify } from '@/lib/toast';

type ForgotInput = z.infer<typeof emailOnlySchema>;

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotInput>({ resolver: zodResolver(emailOnlySchema) });

  const onSubmit = handleSubmit(async (values) => {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${siteUrl}/reset-password`,
    });
    if (error) {
      notify.error(error.message || t('common.error'));
      return;
    }
    notify.success(t('common.success'));
    setSent(true);
  });

  return (
    <div className="w-full bg-card border border-border rounded-3xl p-8 shadow-sm">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <h1 className="text-xl font-bold text-foreground text-center mb-4">
          {t('auth.forgotPasswordTitle')}
        </h1>
        {sent ? (
          <p className="text-muted-foreground text-center text-sm">{t('auth.verifyEmailBody')}</p>
        ) : (
          <>
            <div>
              <input
                type="email"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
                placeholder={t('auth.email')}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{translateError(t, errors.email.message)}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-70 transition-colors shadow-sm"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <span>{t('auth.sendResetLink')}</span>
              )}
            </button>
          </>
        )}
        <Link href="/sign-in" className="block text-center text-sm text-muted-foreground hover:text-primary transition-colors mt-4">
          {t('auth.backToSignIn')}
        </Link>
      </form>
    </div>
  );
}
