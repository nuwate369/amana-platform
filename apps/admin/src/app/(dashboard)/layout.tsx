'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Moon, Sun, Languages, LogOut } from 'lucide-react';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import { NAV_ITEMS } from '@/lib/nav';

/** القائمة الجانبية (يمين الشاشة في الوضع RTL). */
function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-64 shrink-0 flex-col bg-brand-800 text-brand-100 dark:bg-brand-900">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
        <span className="text-xl font-bold text-accent-400">أمانة</span>
        <span className="text-xs text-brand-300">لوحة الإدارة</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? 'bg-accent-500/15 font-semibold text-accent-400'
                  : 'text-brand-200 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/** الشريط العلوي: تبديل المظهر واللغة + المستخدم والخروج. */
function Topbar() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  function toggleLang() {
    const el = document.documentElement;
    const next = el.dir === 'rtl' ? 'ltr' : 'rtl';
    el.dir = next;
    el.lang = next === 'rtl' ? 'ar' : 'en';
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-brand-200 bg-white px-6 dark:border-brand-700 dark:bg-brand-800">
      <div className="text-sm text-brand-500 dark:text-brand-300">مرحبًا بك في لوحة أمانة</div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleLang}
          className="rounded-lg p-2 text-brand-500 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-brand-700"
          aria-label="تبديل اللغة"
        >
          <Languages size={18} />
        </button>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-lg p-2 text-brand-500 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-brand-700"
          aria-label="تبديل المظهر"
        >
          <Moon size={18} className="hidden dark:block" />
          <Sun size={18} className="block dark:hidden" />
        </button>
        <div className="mx-1 hidden text-sm text-brand-600 dark:text-brand-200 sm:block">
          {user?.email ?? 'مسؤول'}
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-1 rounded-lg bg-brand-100 px-3 py-2 text-sm text-brand-700 hover:bg-brand-200 dark:bg-brand-700 dark:text-brand-100"
        >
          <LogOut size={16} />
          خروج
        </button>
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex h-screen overflow-hidden bg-brand-50 dark:bg-brand-900">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
