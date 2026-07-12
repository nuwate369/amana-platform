'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-brand-800 dark:text-brand-50">
          {t('auth.forgotPasswordTitle')}
        </h1>
        {sent ? (
          <p className="text-brand-500 dark:text-brand-200">{t('auth.verifyEmailBody')}</p>
        ) : (
          <>
            <input
              type="email"
              className="w-full rounded-lg border border-brand-200 bg-transparent px-4 py-3 text-brand-900 dark:text-brand-50"
              placeholder={t('auth.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-accent-500 px-6 py-3 font-semibold text-brand-900 hover:bg-accent-400 disabled:opacity-60"
            >
              {loading ? t('common.loading') : t('auth.sendResetLink')}
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
