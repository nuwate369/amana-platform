'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-3xl font-bold text-brand-800 dark:text-brand-50">{t('app.admin')}</h1>
      <p className="text-brand-500 dark:text-brand-200">لوحة إدارة منصة أمانة</p>
      <Link
        href="/sign-in"
        className="rounded-lg bg-accent-500 px-6 py-3 font-semibold text-brand-900 transition hover:bg-accent-400"
      >
        {t('auth.signInButton')}
      </Link>
    </main>
  );
}
