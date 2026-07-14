'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase/client';
import { notify } from '@/lib/toast';
import { Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { i18n } from '@/lib/i18n';
import { resetUserPassword } from '@/app/actions/admin';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const isRtl = i18n.language === 'ar';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('رابط إعادة التعيين منتهي الصلاحية أو غير صالح');
        setLoading(false);
        return;
      }
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('يرجى تعبئة جميع الحقول');
      return;
    }
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setSaving(true);
    try {
      // جلب معرّف المستخدم من الجلسة
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError('يجب تسجيل الدخول أولاً');
        setSaving(false);
        return;
      }

      // استخدام service_role لتخطي قيد AAL2
      const result = await resetUserPassword(session.user.id, password);
      if (!result.success) {
        setError(result.error || 'حدث خطأ');
        setSaving(false);
        return;
      }

      setDone(true);
      notify.success('تم تغيير كلمة المرور بنجاح');
      setTimeout(() => router.replace('/sign-in'), 3000);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full bg-card border border-border rounded-3xl p-8 shadow-sm">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
          <p className="text-muted-foreground text-sm">جاري التحقق من الرابط...</p>
        </div>
      ) : done ? (
        <div className="text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">تم تغيير كلمة المرور</h2>
          <p className="text-muted-foreground text-sm mb-6">سيتم تحويلك لصفحة تسجيل الدخول...</p>
          <button
            onClick={() => router.replace('/sign-in')}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-colors shadow-sm"
          >
            تسجيل الدخول الآن
          </button>
        </div>
      ) : error && !password ? (
        <div className="text-center py-8">
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => router.replace('/sign-in')}
            className="w-full py-3 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground font-bold text-sm transition-colors"
          >
            العودة لتسجيل الدخول
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="text-center mb-2">
            <h2 className="text-xl font-semibold text-foreground mb-1">تعيين كلمة مرور جديدة</h2>
            <p className="text-muted-foreground text-sm">أدخل كلمة المرور الجديدة لحسابك</p>
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center bg-red-50 rounded-lg p-2">{error}</p>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">كلمة المرور الجديدة</label>
            <div className="relative">
              <Lock className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground`} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 أحرف على الأقل"
                className={`w-full ${isRtl ? 'pl-10 pr-4' : 'pr-10 pl-4'} py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">تأكيد كلمة المرور</label>
            <div className="relative">
              <Lock className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground`} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور"
                className={`w-full ${isRtl ? 'pl-10 pr-4' : 'pr-10 pl-4'} py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {saving ? 'جاري الحفظ...' : 'تعيين كلمة المرور'}
          </button>
        </form>
      )}
    </div>
  );
}
