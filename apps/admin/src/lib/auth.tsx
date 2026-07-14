'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { UserType } from '@amana/shared-types';
import { supabase } from '@/lib/supabase/client';

/** قيمة سياق المصادقة المشتركة عبر صفحات لوحة الإدارة. */
interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  /** نوع المستخدم من profiles.user_type (المصدر الوحيد للصلاحيات). */
  role: UserType | null;
  /** حالة الحساب من profiles.status. */
  status: string | null;
  /** رابط صورة المستخدم من profiles.avatar_url (أو null). */
  avatarUrl: string | null;
  /** يُحمّل أثناء جلب الملف (الدور/الحالة/الصورة) لأول مرة بعد توفّر الجلسة. */
  profileLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * مزوّد المصادقة: يقرأ الجلسة الحالية ثم يجلب ملف المستخدم (الدور + الحالة)
 * مرّة واحدة، ويوفّرهما لكل مكوّنات اللوحة (الحارس، القائمة، الشريط العلوي)
 * بدل تكرار الجلب في كل مكوّن.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<UserType | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // 1) الجلسة + الاشتراك في تغيّراتها.
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 2) جلب الدور والحالة عند توفّر جلسة.
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) {
      setRole(null);
      setStatus(null);
      setAvatarUrl(null);
      setProfileLoading(false);
      return;
    }
    let alive = true;
    setProfileLoading(true);
    supabase
      .from('profiles')
      .select('user_type, status, avatar_url')
      .eq('id', uid)
      .single()
      .then(({ data }) => {
        if (!alive) return;
        setRole((data?.user_type as UserType | undefined) ?? null);
        setStatus((data?.status as string | undefined) ?? null);
        setAvatarUrl((data?.avatar_url as string | undefined) ?? null);
        setProfileLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [session?.user?.id]);

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, isLoading, role, status, avatarUrl, profileLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** خطّاف المصادقة — يرمي خطأً إن استُخدم خارج AuthProvider. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth يجب أن يُستخدم داخل <AuthProvider>.');
  }
  return ctx;
}
