'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Moon, Sun, Languages, LogOut, UserCircle, Menu, X, LayoutDashboard, Headset, ChevronRight, ChevronLeft, Lock } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import type { Metadata } from 'next';
import { RequireAuth } from '@/components/RequireAuth';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import { DangerButton, CancelButton } from '@/components/ui/ActionButtons';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
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
  '/ratings':             { ar: 'التقييمات',                  en: 'Ratings', descAr: 'إدارة أسئلة التقييم ومتابعة التقييمات الواردة من التطبيقات', descEn: 'Manage rating questions and monitor incoming ratings' },
  '/support':             { ar: 'الدعم الفني',                 en: 'Support', descAr: 'تذاكر الدعم الفني — استقبال الأسئلة والشكاوى من الركاب والسائقين', descEn: 'Support tickets — handle questions and complaints from riders and drivers' },
  '/groups':              { ar: 'مجموعات النقل المشتركة',    en: 'Shared Ride Groups', descAr: 'مجموعات تنسيق الرحلات بين الراكبات — للمراقبة والإشراف فقط', descEn: 'Ride coordination groups between passengers — for monitoring only' },
  '/notifications':       { ar: 'الإعلانات والتنبيهات العامة', en: 'Announcements & Alerts', descAr: 'إرسال رسائل تظهر داخل تطبيقي الراكبة والسائقة', descEn: 'Send messages that appear inside the passenger and driver apps' },
  '/staff':               { ar: 'فريق العمل',                 en: 'Staff' },
  '/audit-log':           { ar: 'سجل الحركات',                en: 'Audit Log', descAr: 'سجلّ زمني لكل إجراء حسّاس على النظام — للمدير العام والمدير', descEn: 'Chronological log of every sensitive action — for super admin and admin' },
  '/notification-settings': { ar: 'إعدادات التنبيهات',         en: 'Notification Settings', descAr: 'تخصيص كيفية وصول الإشعارات للموظفين', descEn: 'Customize how notifications reach staff' },
  '/system-notifications':{ ar: 'الإشعارات',                   en: 'Notifications' },
};

function Sidebar({ isOpen, onClose, isCollapsed }: { isOpen: boolean, onClose: () => void, isCollapsed: boolean }) {
  const pathname = usePathname();
  const { i18n, t } = useTranslation();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const isRtl = lang === 'ar';
  
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
        fixed inset-y-0 start-0 z-50 flex shrink-0 flex-col bg-card border-e border-border text-foreground overflow-x-hidden
        transition-all duration-300 ease-in-out md:static md:!transform-none
        ${isCollapsed && !isOpen ? 'w-20' : 'w-64'}
        ${isOpen ? 'translate-x-0' : 'translate-x-full rtl:translate-x-full ltr:-translate-x-full'}
      `}>
        <div className={`flex h-16 shrink-0 items-center border-b border-border px-4 ${isCollapsed && !isOpen ? 'justify-center' : 'justify-between'}`}>
          {!(isCollapsed && !isOpen) ? (
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8">
                <Image src="/logo.png" alt="Amana Logo" fill className="object-contain" />
              </div>
              <span className="text-xl font-bold text-primary">{t('app.passenger', 'أمانة')}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <div className="relative w-8 h-8">
                <Image src="/logo.png" alt="Amana Logo" fill className="object-contain" />
              </div>
            </div>
          )}
          {!(isCollapsed && !isOpen) && (
          <button onClick={onClose} className="md:hidden text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
          )}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3">
          {NAV_ITEMS.map(({ href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            const i18nKey = NAV_I18N[href];
            const label = i18nKey ? (lang === 'ar' ? i18nKey.ar : i18nKey.en) : href;
            const tooltip = i18nKey ? (lang === 'ar' ? i18nKey.descAr : i18nKey.descEn) : undefined;
            return (
              <div key={href} className="relative group">
                <Link
                  href={href}
                  className={`flex items-center rounded-lg py-2.5 transition-colors ${
                    isCollapsed && !isOpen ? 'justify-center px-0' : 'gap-3 px-3'
                  } ${
                    active
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  title={isCollapsed && !isOpen ? label : undefined}
                >
                  <Icon size={18} strokeWidth={active ? 2.4 : 2} className="shrink-0" />
                  {!(isCollapsed && !isOpen) && <span className="truncate text-sm">{label}</span>}
                </Link>
                {tooltip && !(isCollapsed && !isOpen) && (
                  <div className="pointer-events-none absolute start-full top-1/2 z-[60] ms-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-card border border-border px-3 py-1.5 text-xs text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {tooltip}
                    <div className="absolute top-1/2 -start-1.5 -translate-y-1/2 border-4 border-transparent border-e-border" />
                  </div>
                )}
                {(isCollapsed && !isOpen) && (
                  <div className="pointer-events-none absolute start-full top-1/2 z-[60] ms-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-card border border-border px-3 py-1.5 text-xs text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    <span className="font-semibold block">{label}</span>
                    {tooltip && <span className="block text-muted-foreground mt-0.5">{tooltip}</span>}
                    <div className="absolute top-1/2 -start-1.5 -translate-y-1/2 border-4 border-transparent border-e-border" />
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

function Topbar({ 
  onMenuToggle,
  onDesktopMenuToggle
}: { 
  onMenuToggle: () => void,
  onDesktopMenuToggle: () => void
}) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { t, i18n } = useTranslation();
  // قراءة user_type من ملف المستخدم مباشرةً (بدون جداول RBAC)
  const [userTypeLabel, setUserTypeLabel] = useState(t('app.adminRole', 'مسؤول'));
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [userRole, setUserRole] = useState<UserType | null>(null);
  const lang = i18n.language === 'ar' ? 'ar' : 'en';

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
    const nextLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('amana-lang', nextLang);
    
    const el = document.documentElement;
    el.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
    el.lang = nextLang;
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuToggle}
          className="md:hidden p-2 -ms-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        >
          <Menu size={22} />
        </button>
        <button 
          onClick={onDesktopMenuToggle}
          className="hidden md:block p-2 -ms-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        >
          <Menu size={22} />
        </button>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={toggleLang}
            className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted transition-colors"
            aria-label="تبديل اللغة"
            title={i18n.language === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
          >
            <img 
              src={i18n.language === 'ar' ? 'https://flagcdn.com/gb.svg' : 'https://flagcdn.com/sa.svg'} 
              alt={i18n.language === 'ar' ? 'English' : 'العربية'}
              className="w-5 h-auto rounded-[2px] shadow-sm"
            />
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors"
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
            className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-muted/50 hover:bg-muted transition-colors overflow-hidden"
            aria-label="قائمة المستخدم"
            aria-expanded={menuOpen}
          >
            <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center">
              <UserCircle size={20} />
            </div>
          </button>

          {menuOpen && (
            <div
              ref={menuRef}
              className="absolute end-0 top-full mt-2 w-64 rounded-xl bg-card border border-border shadow-xl z-50 animate-in fade-in zoom-in duration-200"
            >
              
              <div className="px-4 py-4 border-b border-border flex flex-col items-center text-center">
                <h3 className="font-bold text-lg text-foreground mb-0.5">
                  {user?.user_metadata?.full_name || t('app.defaultAdmin', 'مسؤول أمانة')}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">{user?.email}</p>
                
                <span className="px-3 py-1 mb-3 bg-muted text-muted-foreground rounded-lg border border-border text-xs font-mono tracking-wider">
                  HQ-{(user?.id || '0000').substring(0, 5).toUpperCase()}
                </span>
                
                <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-xs font-bold w-full shadow-sm">
                  {userTypeLabel}
                </span>
              </div>
              
              <div className="py-2">
                <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <LayoutDashboard size={18} className="text-muted-foreground" />
                  {t('nav.dashboard', 'لوحة المعلومات')}
                </Link>
                <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <UserCircle size={18} className="text-muted-foreground" />
                  {t('nav.profile', 'الملف الشخصي')}
                </Link>

                <Link href="/support" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Headset size={18} className="text-muted-foreground" />
                  {t('nav.support', 'الدعم الفني')}
                </Link>

                <button 
                  onClick={() => {
                    setMenuOpen(false);
                    setShowPasswordModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Lock size={18} className="text-muted-foreground" />
                  {t('auth.changePassword', 'تغيير كلمة المرور')}
                </button>

              </div>

              <div className="border-t border-border py-2">
                <button 
                  onClick={() => { 
                    setMenuOpen(false);
                    setShowLogoutModal(true);
                  }} 
                  className="w-full flex items-center gap-3 px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <LogOut size={18} className="text-muted-foreground" />
                  {t('auth.logout', 'تسجيل خروج')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-border animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto w-14 h-14 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-5">
                <LogOut size={28} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                {t('auth.logout', 'تسجيل خروج')}
              </h3>
              <p className="text-sm text-muted-foreground mb-8">
                {t('auth.logoutConfirm', 'هل أنت متأكد من تسجيل الخروج؟')}
              </p>
              <div className="flex items-center gap-3 w-full">
                <DangerButton
                  onClick={() => {
                    setShowLogoutModal(false);
                    supabase.auth.signOut();
                  }}
                  fullWidth
                >
                  {t('auth.logout', 'تسجيل خروج')}
                </DangerButton>
                <CancelButton onClick={() => setShowLogoutModal(false)} fullWidth />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تغيير كلمة المرور */}
      <ChangePasswordModal 
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { i18n, t } = useTranslation();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';

  // تحديث عنوان الصفحة ديناميكياً
  useEffect(() => {
    const i18nKey = NAV_I18N[pathname];
    if (i18nKey) {
      document.title = `${t('app.passenger', 'أمانة')} | ${lang === 'ar' ? i18nKey.ar : i18nKey.en}`;
    } else {
      document.title = `${t('app.passenger', 'أمانة')} | ${t('app.adminPanel', 'لوحة الإدارة')}`;
    }
  }, [pathname, lang]);

  return (
    <RequireAuth>
      <div className="flex h-screen w-full overflow-hidden bg-background relative">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isCollapsed={isCollapsed} />
        <div className="flex flex-1 flex-col w-full h-full overflow-hidden min-w-0">
          <Topbar 
            onMenuToggle={() => setSidebarOpen(true)} 
            onDesktopMenuToggle={() => setIsCollapsed(!isCollapsed)}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 w-full">
            <div className="w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </RequireAuth>
  );
}
