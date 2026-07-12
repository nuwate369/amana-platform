'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function VerifyEmailPage() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold text-brand-800 dark:text-brand-50">
          {t('auth.verifyEmailTitle')}
        </h1>
        <p className="text-brand-500 dark:text-brand-200">{t('auth.verifyEmailBody')}</p>
        <Link href="/sign-in" className="font-semibold text-accent-600 hover:underline">
          {t('auth.backToSignIn')}
        </Link>
      </div>
    </main>
  );
}
