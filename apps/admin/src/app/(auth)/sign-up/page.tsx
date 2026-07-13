'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { signUpSchema, translateError, type SignUpInput } from '@amana/shared-ui/validation';
import { supabase } from '@/lib/supabase/client';
import { notify } from '@/lib/toast';

export default function SignUpPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = handleSubmit(async (values) => {
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.fullName, role: 'admin' } },
    });
    if (error) {
      notify.error(error.message || t('common.error'));
      return;
    }
    notify.success(t('common.success'));
    router.replace('/verify-email');
  });

  const inputClass =
    'w-full rounded-lg border border-brand-200 bg-transparent px-4 py-3 text-brand-900 dark:text-brand-50';

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4" noValidate>
        <h1 className="text-2xl font-bold text-brand-800 dark:text-brand-50">
          {t('auth.signUpTitle')}
        </h1>

        <div>
          <input
            className={inputClass}
            placeholder={t('auth.fullName')}
            {...register('fullName')}
          />
          {errors.fullName && (
            <p className="mt-1 text-sm text-red-500">{translateError(t, errors.fullName.message)}</p>
          )}
        </div>

        <div>
          <input
            type="email"
            className={inputClass}
            placeholder={t('auth.email')}
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{translateError(t, errors.email.message)}</p>
          )}
        </div>

        <div>
          <input
            type="password"
            className={inputClass}
            placeholder={t('auth.password')}
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-500">{translateError(t, errors.password.message)}</p>
          )}
        </div>

        <div>
          <input
            type="password"
            className={inputClass}
            placeholder={t('auth.confirmPassword')}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-500">
              {translateError(t, errors.confirmPassword.message)}
            </p>
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
            <span>{t('auth.signUpButton')}</span>
          )}
        </button>

        <div className="flex justify-center gap-1 text-sm">
          <span className="text-brand-500">{t('auth.haveAccount')}</span>
          <Link href="/sign-in" className="font-semibold text-accent-600 hover:underline">
            {t('auth.signInButton')}
          </Link>
        </div>
      </form>
    </main>
  );
}
