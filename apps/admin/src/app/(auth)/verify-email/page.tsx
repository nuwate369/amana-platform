'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function VerifyEmailPage() {
  const { t } = useTranslation();

  return (
    <div className="w-full bg-card border border-border rounded-3xl p-8 shadow-sm text-center">
      <h1 className="text-xl font-bold text-foreground mb-4">
        {t('auth.verifyEmailTitle')}
      </h1>
      <p className="text-muted-foreground text-sm mb-6">{t('auth.verifyEmailBody')}</p>
      <Link href="/sign-in" className="font-semibold text-primary hover:text-primary/80 transition-colors">
        {t('auth.backToSignIn')}
      </Link>
    </div>
  );
}
