'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { acceptInviteSchema, translateError, type AcceptInviteInput } from '@amana/shared-ui/validation';
import { supabase } from '@/lib/supabase/client';
import { notify } from '@/lib/toast';
import { translateSupabaseError } from '@/lib/supabase-errors';
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { PrimaryButton } from '@/components/ui/ActionButtons';

type Step = 'loading' | 'form' | 'success' | 'error';

export default function AcceptInvitePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState<Step>('loading');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
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
          setErrorMsg(t('auth.inviteInvalidOrExpired', 'رابط الدعوة غير صالح أو منتهي الصلاحية.'));
          return;
        }

        if (!session) {
          // المستخدم لم يُعرَّف بعد — قد يكون الرابط غير صالح
          setStep('error');
          setErrorMsg(t('auth.inviteInvalidCheckEmail', 'رابط الدعوة غير صالح. تحقق من البريد الإلكتروني وانقر على الرابط مرة أخرى.'));
          return;
        }

        // المستخدم معرّف — نعرض له نموذج تعيين كلمة المرور
        setUserEmail(session.user.email ?? '');
        setUserId(session.user.id);
        setStep('form');
      } catch (err: any) {
        console.error('[accept-invite] unexpected:', err);
        setStep('error');
        setErrorMsg(t('auth.unexpectedErrorTryAgain', 'حدث خطأ غير متوقع. حاول مرة أخرى.'));
      }
    })();
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        notify.error(translateSupabaseError(error.message, t));
        return;
      }

      // تفعيل الحساب: تحويل الحالة من pending_invite إلى active بعد قبول الدعوة.
      // RLS (profiles_update_own) يسمح للمستخدم بتحديث صفّه؛ لولا هذا يبقى محجوباً
      // بشاشة «الحساب غير متاح» رغم تعيين كلمة المرور.
      if (userId) {
        const { error: statusError } = await supabase
          .from('profiles')
          .update({ status: 'active' })
          .eq('id', userId);
        if (statusError) {
          // لا نُفشل العملية (كلمة المرور ضُبطت) لكن ننبّه ليُفعَّل يدوياً إن لزم.
          console.error('[accept-invite] فشل تفعيل الحساب:', statusError.message);
          notify.error(t('auth.activationFailedContactAdmin', 'تم تعيين كلمة المرور، لكن تعذّر تفعيل الحساب تلقائياً. تواصل مع المدير.'));
        }
      }

      setStep('success');
      notify.success(t('auth.passwordSetSuccess', 'تم تعيين كلمة المرور وتفعيل الحساب بنجاح!'));

      // توجيه لصفحة تسجيل الدخول بعد ثانيتين
      setTimeout(() => {
        router.replace('/sign-in');
      }, 2000);
    } catch (err: any) {
      notify.error(translateSupabaseError(err.message, t));
    }
  });

  return (
    <div className="w-full bg-card border border-border rounded-xl p-8 shadow-sm">
      {/* حالة: تحميل */}
      {step === 'loading' && (
        <div className="flex flex-col items-center py-8 space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">{t('auth.verifyingLink', 'جاري التحقق من الرابط...')}</p>
        </div>
      )}

      {/* حالة: خطأ */}
      {step === 'error' && (
        <div className="flex flex-col items-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground text-center">{t('auth.invalidInviteTitle', 'رابط الدعوة غير صالح')}</h2>
          <p className="text-muted-foreground text-sm text-center leading-relaxed">{errorMsg}</p>
          <button
            onClick={() => router.replace('/sign-in')}
            className="mt-4 px-6 py-2.5 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg font-medium transition-colors"
          >
            {t('auth.goToLogin', 'الذهاب لصفحة الدخول')}
          </button>
        </div>
      )}

      {/* حالة: نجاح */}
      {step === 'success' && (
        <div className="flex flex-col items-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground text-center">{t('auth.passwordSetTitle', 'تم تعيين كلمة المرور!')}</h2>
          <p className="text-muted-foreground text-sm text-center">{t('auth.redirectingToLogin', 'جاري التحويل لصفحة تسجيل الدخول...')}</p>
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      )}

      {/* حالة: نموذج تعيين كلمة المرور */}
      {step === 'form' && (
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-1">{t('auth.setPasswordTitle', 'تعيين كلمة المرور')}</h2>
            <p className="text-muted-foreground text-sm">
              {t('auth.setPasswordSubtitle', 'مرحباً بك! أدخل كلمة المرور لإنشاء حسابك في منصة أمانة.')}
            </p>
          </div>

          {/* البريد الإلكتروني (للعرض فقط) */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">{t('auth.email', 'البريد الإلكتروني')}</label>
            <div className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg flex items-center min-h-[42px] cursor-not-allowed">
              <p className="text-sm font-mono text-muted-foreground truncate" dir="ltr">{userEmail}</p>
            </div>
          </div>

          {/* كلمة المرور */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">{t('auth.password', 'كلمة المرور')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                <Lock className="h-5 w-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full pr-10 pl-10 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
                placeholder={t('auth.passwordPlaceholder', '6 أحرف على الأقل')}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
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
            <label className="text-sm font-medium text-foreground">{t('auth.confirmPassword', 'تأكيد كلمة المرور')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                <Lock className="h-5 w-5" />
              </div>
              <input
                type={showConfirm ? 'text' : 'password'}
                className="w-full pr-10 pl-10 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
                placeholder={t('auth.confirmPasswordPlaceholder', 'أعد إدخال كلمة المرور')}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1.5 text-sm text-red-500">{translateError(t, errors.confirmPassword.message)}</p>
            )}
          </div>

          {/* زر التأكيد */}
          <PrimaryButton type="submit" loading={isSubmitting} fullWidth>
            {t('auth.confirmAndCreateAccount', 'تأكيد وإنشاء الحساب')}
          </PrimaryButton>
        </form>
      )}
    </div>
  );
}

