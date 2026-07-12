'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase/client';

export default function SignInPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace('/');
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-brand-800 dark:text-brand-50">
          {t('auth.signInTitle')}
        </h1>
        <input
          type="email"
          className="w-full rounded-lg border border-brand-200 bg-transparent px-4 py-3 text-brand-900 dark:text-brand-50"
          placeholder={t('auth.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="w-full rounded-lg border border-brand-200 bg-transparent px-4 py-3 text-brand-900 dark:text-brand-50"
          placeholder={t('auth.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent-500 px-6 py-3 font-semibold text-brand-900 hover:bg-accent-400 disabled:opacity-60"
        >
          {loading ? t('common.loading') : t('auth.signInButton')}
        </button>
        <div className="flex justify-between text-sm">
          <Link href="/forgot-password" className="text-brand-500 hover:underline">
            {t('auth.forgotPasswordLink')}
          </Link>
          <Link href="/sign-up" className="font-semibold text-accent-600 hover:underline">
            {t('auth.signUpButton')}
          </Link>
        </div>
      </form>
    </main>
  );
}
