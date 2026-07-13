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
    const { error } = await supabase.auth.resetPasswordForEmail(values.email);
    if (error) {
      notify.error(error.message || t('common.error'));
      return;
    }
    notify.success(t('common.success'));
    setSent(true);
  });

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4" noValidate>
        <h1 className="text-2xl font-bold text-brand-800 dark:text-brand-50">
          {t('auth.forgotPasswordTitle')}
        </h1>
        {sent ? (
          <p className="text-brand-500 dark:text-brand-200">{t('auth.verifyEmailBody')}</p>
        ) : (
          <>
            <div>
              <input
                type="email"
                className="w-full rounded-lg border border-brand-200 bg-transparent px-4 py-3 text-brand-900 dark:text-brand-50"
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
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-6 py-3 font-semibold text-brand-900 hover:bg-accent-400 disabled:opacity-60"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-brand-900/30 border-t-brand-900 rounded-full animate-spin" />
              ) : (
                <span>{t('auth.sendResetLink')}</span>
              )}
            </button>
          </>
        )}
        <Link href="/sign-in" className="block text-center text-sm text-brand-500 hover:underline">
          {t('auth.backToSignIn')}
        </Link>
      </form>
    </main>
  );
}
