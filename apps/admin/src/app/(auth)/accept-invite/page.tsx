'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { acceptInviteSchema, translateError, type AcceptInviteInput } from '@amana/shared-ui/validation';
import { supabase } from '@/lib/supabase/client';
import { notify } from '@/lib/toast';
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

type Step = 'loading' | 'form' | 'success' | 'error';

export default function AcceptInvitePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState<Step>('loading');
  const [userEmail, setUserEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInviteInput>({
    resolver: zodResolver(acceptInviteSchema),
  });

  // معالجة رابط الدعوة عند تحميل الصفحة
  useEffect(() => {
    (async () => {
      try {
        // Supabase يكشف الرابط تلقائياً من hash fragment (#access_token=...&type=invite)
        // detectSessionInUrl: true في إعدادات العميل يتكفل بذلك
        const { data: { session }, error: sessErr } = await supabase.auth.getSession();

        if (sessErr) {
          console.error('[accept-invite] session error:', sessErr);
          setStep('error');
          setErrorMsg('رابط الدعوة غير صالح أو منتهي الصلاحية.');
          return;
        }

        if (!session) {
          // المستخدم لم يُعرَّف بعد — قد يكون الرابط غير صالح
          setStep('error');
          setErrorMsg('رابط الدعوة غير صالح. تحقق من البريد الإلكتروني وانقر على الرابط مرة أخرى.');
          return;
        }

        // المستخدم معرّف — نعرض له نموذج تعيين كلمة المرور
        setUserEmail(session.user.email ?? '');
        setStep('form');
      } catch (err: any) {
        console.error('[accept-invite] unexpected:', err);
        setStep('error');
        setErrorMsg('حدث خطأ غير متوقع. حاول مرة أخرى.');
      }
    })();
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        notify.error(error.message || t('common.error'));
        return;
      }

      setStep('success');
      notify.success('تم تعيين كلمة المرور بنجاح!');

      // توجيه لصفحة تسجيل الدخول بعد ثانيتين
      setTimeout(() => {
        router.replace('/sign-in');
      }, 2000);
    } catch (err: any) {
      notify.error(err.message || t('common.error'));
    }
  });

  return (
    <div className="w-full bg-card border border-border rounded-3xl p-8 shadow-sm">
      {/* حالة: تحميل */}
      {step === 'loading' && (
        <div className="flex flex-col items-center py-8 space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">جاري التحقق من الرابط...</p>
        </div>
      )}

      {/* حالة: خطأ */}
      {step === 'error' && (
        <div className="flex flex-col items-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground text-center">رابط الدعوة غير صالح</h2>
          <p className="text-muted-foreground text-sm text-center leading-relaxed">{errorMsg}</p>
          <button
            onClick={() => router.replace('/sign-in')}
            className="mt-4 px-6 py-2.5 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl font-medium transition-colors"
          >
            الذهاب لصفحة الدخول
          </button>
        </div>
      )}

      {/* حالة: نجاح */}
      {step === 'success' && (
        <div className="flex flex-col items-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground text-center">تم تعيين كلمة المرور!</h2>
          <p className="text-muted-foreground text-sm text-center">جاري التحويل لصفحة تسجيل الدخول...</p>
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      )}

      {/* حالة: نموذج تعيين كلمة المرور */}
      {step === 'form' && (
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-1">تعيين كلمة المرور</h2>
            <p className="text-muted-foreground text-sm">
              مرحباً بك! أدخل كلمة المرور لإنشاء حسابك في منصة أمانة.
            </p>
          </div>

          {/* البريد الإلكتروني (للعرض فقط) */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">البريد الإلكتروني</label>
            <div className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3.5 text-muted-foreground text-sm cursor-not-allowed">
              {userEmail}
            </div>
          </div>

          {/* كلمة المرور */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">كلمة المرور</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded-xl border border-input bg-background py-3.5 pr-12 pl-12 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
                placeholder="6 أحرف على الأقل"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-sm text-red-500">{translateError(t, errors.password.message)}</p>
            )}
          </div>

          {/* تأكيد كلمة المرور */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">تأكيد كلمة المرور</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type={showConfirm ? 'text' : 'password'}
                className="w-full rounded-xl border border-input bg-background py-3.5 pr-12 pl-12 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
                placeholder="أعد إدخال كلمة المرور"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1.5 text-sm text-red-500">{translateError(t, errors.confirmPassword.message)}</p>
            )}
          </div>

          {/* زر التأكيد */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-bold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-70 transition-all shadow-sm active:scale-[0.98]"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              'تأكيد وإنشاء الحساب'
            )}
          </button>
        </form>
      )}
    </div>
  );
}
