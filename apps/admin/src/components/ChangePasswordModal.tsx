'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import { PrimaryButton, CancelButton } from './ui/ActionButtons';
import { notify } from '@/lib/toast';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // إعادة تعيين الحقول عند كل فتح للنافذة
  useEffect(() => {
    if (open) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      if (!oldPassword || !newPassword || !confirmPassword) {
        throw new Error(t('profile.fillAllPasswords', 'يرجى تعبئة جميع حقول كلمة المرور.'));
      }
      if (newPassword !== confirmPassword) {
        throw new Error(t('profile.passwordsMismatch', 'كلمة المرور الجديدة غير متطابقة.'));
      }
      if (newPassword.length < 6) {
        throw new Error(t('profile.passwordLength', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'));
      }

      // 1) Verify old password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: oldPassword,
      });

      if (signInError) {
        throw new Error(t('profile.wrongOldPassword', 'كلمة المرور الحالية غير صحيحة.'));
      }

      // 2) Proceed to update password
      const { error: updateAuthError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateAuthError) throw updateAuthError;

      // 3) On success, sign out and redirect
      notify.success(t('auth.passwordChanged', 'تم تغيير كلمة المرور بنجاح. يرجى تسجيل الدخول مجدداً.'));
      await supabase.auth.signOut();
      onClose();
      router.push('/login');

    } catch (err: any) {
      setError(err.message || t('common.error', 'حدث خطأ غير متوقع'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir={document.documentElement.dir || 'rtl'}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-border">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">{t('auth.changePassword', 'تغيير كلمة المرور')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400 rounded-lg">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">{t('profile.fields.oldPassword', 'كلمة المرور الحالية')}</label>
            <div className="relative">
              <input
                type={showOldPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="********"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground ltr:pr-10 rtl:pl-10"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute inset-y-0 ltr:right-0 rtl:left-0 flex items-center justify-center w-10 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">{t('profile.fields.newPassword', 'كلمة المرور الجديدة')}</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="********"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground ltr:pr-10 rtl:pl-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 ltr:right-0 rtl:left-0 flex items-center justify-center w-10 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">{t('profile.fields.confirmPassword', 'تأكيد كلمة المرور الجديدة')}</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="********"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground ltr:pr-10 rtl:pl-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 ltr:right-0 rtl:left-0 flex items-center justify-center w-10 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <PrimaryButton
              type="submit"
              loading={loading}
              fullWidth
            >
              {t('common.save', 'حفظ التعديلات')}
            </PrimaryButton>
            <CancelButton type="button" onClick={onClose} fullWidth />
          </div>
        </form>
      </div>
    </div>
  );
}
