'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Moon, Sun, Languages, LogOut, UserCircle, Menu, X, LayoutDashboard, Headset } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import { NAV_ITEMS } from '@/lib/nav';
import { STAFF_TYPE_LABELS, type UserType } from '@amana/shared-types';
import { useTranslation } from 'react-i18next';

/** مفاتيح الترجمة لكل عنصر في القائمة الجانبية — يُستخدم المفتاح العربي كقيمة افتراضية. */
const NAV_I18N: Record<string, { ar: string; en: string; descAr?: string; descEn?: string }> = {
  '/dashboard':           { ar: 'لوحة المعلومات',              en: 'Dashboard' },
  '/drivers':             { ar: 'السائقات',                    en: 'Drivers' },
  '/passengers':          { ar: 'الركاب',                      en: 'Passengers' },
  '/rides':               { ar: 'الرحلات الحية',              en: 'Live Rides' },
  '/pricing':             { ar: 'التسعير',                    en: 'Pricing' },
  '/reports':             { ar: 'التقارير',                   en: 'Reports' },
  '/groups':              { ar: 'مجموعات النقل المشتركة',    en: 'Shared Ride Groups', descAr: 'مجموعات تنسيق الرحلات بين الراكبات — للمراقبة والإشراف فقط', descEn: 'Ride coordination groups between passengers — for monitoring only' },
  '/notifications':       { ar: 'الإعلانات والتنبيهات العامة', en: 'Announcements & Alerts', descAr: 'إرسال رسائل تظهر داخل تطبيقي الراكبة والسائقة', descEn: 'Send messages that appear inside the passenger and driver apps' },
  '/staff':               { ar: 'فريق العمل',                 en: 'Staff' },
  '/system-notifications':{ ar: 'الإشعارات',                   en: 'Notifications' },
};

function Sidebar({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const pathname = usePathname();
  const { i18n } = useTranslation();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  
  // Close sidebar when route changes on mobile
  useEffect(() => {
    onClose();
  }, [pathname]);

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity md:hidden" 
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 start-0 z-50 flex w-64 shrink-0 flex-col bg-brand-800 text-brand-100 dark:bg-brand-900 
        transition-transform duration-300 ease-in-out md:static md:!transform-none
        ${isOpen ? 'translate-x-0' : 'translate-x-full rtl:translate-x-full ltr:-translate-x-full'}
      `}>
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-accent-400">أمانة</span>
            <span className="text-xs text-brand-300">لوحة الإدارة</span>
          </div>
          <button onClick={onClose} className="md:hidden text-brand-300 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map(({ href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            const i18nKey = NAV_I18N[href];
            const label = i18nKey ? (lang === 'ar' ? i18nKey.ar : i18nKey.en) : href;
            const tooltip = i18nKey ? (lang === 'ar' ? i18nKey.descAr : i18nKey.descEn) : undefined;
            return (
              <div key={href} className="relative group">
                <Link
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    active
                      ? 'bg-accent-500/15 font-semibold text-accent-400'
                      : 'text-brand-200 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.4 : 2} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
                {tooltip && (
                  <div className="pointer-events-none absolute start-full top-1/2 z-[60] ms-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-brand-900 px-3 py-1.5 text-xs text-brand-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-brand-700 dark:text-brand-50">
                    {tooltip}
                    <div className="absolute top-1/2 -start-1.5 -translate-y-1/2 border-4 border-transparent border-e-brand-900 dark:border-e-brand-700" />
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

function Topbar({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // قراءة user_type من ملف المستخدم مباشرةً (بدون جداول RBAC)
  const [userTypeLabel, setUserTypeLabel] = useState('مسؤول');

  // إغلاق القائمة عند الضغط خارجها (أي مكان في الشاشة)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.user_type) {
            const label = STAFF_TYPE_LABELS[data.user_type as UserType];
            if (label) setUserTypeLabel(label);
          }
        });
    }
  }, [user]);

  function toggleLang() {
    const el = document.documentElement;
    const next = el.dir === 'rtl' ? 'ltr' : 'rtl';
    el.dir = next;
    el.lang = next === 'rtl' ? 'ar' : 'en';
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-brand-200 bg-white px-4 md:px-6 dark:border-brand-700 dark:bg-brand-800">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuToggle}
          className="md:hidden p-2 -ms-2 rounded-lg text-brand-600 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-brand-700 transition-colors"
        >
          <Menu size={22} />
        </button>
        <div className="text-sm font-semibold md:font-normal text-brand-700 dark:text-brand-300">مرحبًا بك في لوحة أمانة</div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={toggleLang}
            className="rounded-lg p-2 text-brand-500 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-brand-700 transition-colors"
            aria-label="تبديل اللغة"
          >
            <Languages size={18} />
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-lg p-2 text-brand-500 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-brand-700 transition-colors"
            aria-label="تبديل المظهر"
          >
            <Moon size={18} className="hidden dark:block" />
            <Sun size={18} className="block dark:hidden" />
          </button>
        </div>

        <NotificationBell />

        {/* User Dropdown */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center justify-center w-10 h-10 rounded-full border border-brand-200 dark:border-brand-700 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/50 dark:hover:bg-brand-900 transition-colors overflow-hidden"
            aria-label="قائمة المستخدم"
            aria-expanded={menuOpen}
          >
            <div className="w-full h-full bg-accent-500/10 text-accent-600 flex items-center justify-center">
              <UserCircle size={20} />
            </div>
          </button>

          {menuOpen && (
            <div
              dir="rtl"
              ref={menuRef}
              className="absolute end-0 top-full mt-2 w-64 rounded-xl bg-white dark:bg-brand-800 border border-brand-200 dark:border-brand-700 shadow-xl z-50 animate-in fade-in zoom-in duration-200"
            >
              
              <div className="px-4 py-4 border-b border-brand-100 dark:border-brand-700 flex flex-col items-center text-center">
                <h3 className="font-bold text-lg text-brand-900 dark:text-brand-50 mb-0.5">
                  {user?.user_metadata?.full_name || 'مسؤول أمانة'}
                </h3>
                <p className="text-sm text-brand-500 dark:text-brand-400 mb-3">{user?.email}</p>
                
                <span className="px-3 py-1 mb-3 bg-brand-50 dark:bg-brand-900 text-brand-600 dark:text-brand-300 rounded-lg border border-brand-200 dark:border-brand-700 text-xs font-mono tracking-wider">
                  HQ-{(user?.id || '0000').substring(0, 5).toUpperCase()}
                </span>
                
                <span className="bg-brand-950 text-white dark:bg-brand-100 dark:text-brand-900 px-4 py-1.5 rounded-full text-xs font-bold w-full shadow-sm">
                  {userTypeLabel}
                </span>
              </div>
              
              <div className="py-2">
                <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-5 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 hover:text-brand-900 dark:text-brand-200 dark:hover:bg-brand-700 dark:hover:text-white transition-colors">
                  <LayoutDashboard size={18} className="text-brand-400 dark:text-brand-500" />
                  لوحة المعلومات
                </Link>
                <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-5 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 hover:text-brand-900 dark:text-brand-200 dark:hover:bg-brand-700 dark:hover:text-white transition-colors">
                  <UserCircle size={18} className="text-brand-400 dark:text-brand-500" />
                  الملف الشخصي
                </Link>

                <button className="w-full flex items-center gap-3 px-5 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 hover:text-brand-900 dark:text-brand-200 dark:hover:bg-brand-700 dark:hover:text-white transition-colors">
                  <Headset size={18} className="text-brand-400 dark:text-brand-500" />
                  الدعم الفني
                </button>

              </div>

              <div className="border-t border-brand-100 dark:border-brand-700 py-2">
                <button 
                  onClick={() => { setMenuOpen(false); supabase.auth.signOut(); }} 
                  className="w-full flex items-center gap-3 px-5 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 hover:text-brand-900 dark:text-brand-200 dark:hover:bg-brand-700 dark:hover:text-white transition-colors"
                >
                  <LogOut size={18} className="text-brand-400 dark:text-brand-500" />
                  تسجيل خروج
                </button>
                <button className="w-full flex items-center gap-3 px-5 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors">
                  <LogOut size={18} className="rotate-180" />
                  إنهاء كافة الجلسات
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <RequireAuth>
      <div className="flex h-screen w-full overflow-hidden bg-brand-50 dark:bg-brand-900 relative">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-1 flex-col w-full h-full overflow-hidden min-w-0">
          <Topbar onMenuToggle={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 w-full">
            {children}
          </main>
        </div>
      </div>
    </RequireAuth>
  );
}
