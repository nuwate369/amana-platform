import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/** لقطة حالة الراكبة من صفّها في profiles. */
interface ProfileState {
  status: string | null; // pending_approval | active | suspended | disabled
  isActive: boolean; // false ⇒ محظورة
}

/** قيمة سياق المصادقة المشتركة عبر شاشات تطبيق الراكبة. */
interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  /** حالة التفعيل من profiles. */
  status: string | null;
  isActive: boolean;
  /** مفعّلة فعليًّا (نشطة + غير محظورة) ⇒ تدخل التطبيق. */
  isApproved: boolean;
  /** يجري تحميل صفّ profiles (تنتظره البوّابة قبل التوجيه). */
  profileLoading: boolean;
  refreshProfile: () => Promise<ProfileState | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * مزوّد المصادقة: يقرأ الجلسة + حالة التفعيل (profiles.status/is_active) عند التركيب
 * ثم يستمع لتغيّرات الحالة. البوّابة (useProtectedRoute) تعتمد isApproved لتقرّر
 * الوجهة: مفعّلة ⇒ الرئيسية، غير مفعّلة ⇒ شاشة «قيد المراجعة».
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async (uid: string): Promise<ProfileState> => {
    const { data } = await supabase
      .from('profiles')
      .select('status, is_active')
      .eq('id', uid)
      .maybeSingle();
    const st = (data?.status as string | null) ?? null;
    // قبل الهجرة قد لا يوجد العمود ⇒ نعتبرها مفعّلة (grandfathered).
    const act = data?.is_active === undefined ? true : !!data.is_active;
    setStatus(st);
    setIsActive(act);
    return { status: st, isActive: act };
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        setProfileLoading(true);
        await loadProfile(data.session.user.id);
        if (mounted) setProfileLoading(false);
      }
      if (mounted) setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        setProfileLoading(true);
        await loadProfile(nextSession.user.id);
        setProfileLoading(false);
      } else {
        setStatus(null);
        setIsActive(true);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async (): Promise<ProfileState | null> => {
    const uid = session?.user?.id;
    if (!uid) return null;
    return loadProfile(uid);
  }, [session, loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // status الافتراضي قبل الهجرة = null ⇒ نعتبرها مفعّلة كي لا نحبس المستخدمين القدامى.
  const isApproved = (status === null || status === 'active') && isActive;

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        status,
        isActive,
        isApproved,
        profileLoading,
        refreshProfile,
        signOut,
      }}
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
