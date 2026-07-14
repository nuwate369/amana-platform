'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Mail, Lock, ShieldCheck, Save, AlertCircle, CheckCircle2, Phone, Camera, Globe, Moon, Monitor, Smartphone, Trash2, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { STAFF_TYPE_LABELS, type UserType } from '@amana/shared-types';
import { notify } from '@/lib/toast';

export default function ProfileClient() {
  const { user } = useAuth();
  const { i18n, t } = useTranslation();
  const { theme, setTheme } = useTheme();
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [roleName, setRoleName] = useState('جاري التحميل...');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const [preferredLang, setPreferredLang] = useState('ar');
  const [preferredTheme, setPreferredTheme] = useState('system');

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '');
      
      // جلب user_type وبيانات الملف الشخصي من profiles مباشرةً
      supabase
        .from('profiles')
        .select('user_type, phone, avatar_url, preferred_language, preferred_theme')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            const label = STAFF_TYPE_LABELS[data.user_type as UserType];
            setRoleName(label || data.user_type || 'مستخدم');
            setPhone(data.phone || '');
            setAvatarUrl(data.avatar_url || '');
            setPreferredLang(data.preferred_language || 'ar');
            setPreferredTheme(data.preferred_theme || 'system');
          }
        });

    }
  }, [user]);


  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      setError(null);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error(t('profile.uploadingError', 'يجب اختيار صورة.'));
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      // Update profile
      if (user) {
        await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
        setAvatarUrl(data.publicUrl);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!user) throw new Error('يجب تسجيل الدخول');

      // Update Profile Details
      const updates = {
        full_name: fullName,
        phone: phone,
        preferred_language: preferredLang,
        preferred_theme: preferredTheme,
        updated_at: new Date().toISOString()
      };

      const { error: profileError } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (profileError) throw profileError;

      // Update Auth Metadata for full_name
      await supabase.auth.updateUser({ data: { full_name: fullName } });

      // Apply language immediately
      if (i18n.language !== preferredLang) {
        i18n.changeLanguage(preferredLang);
        const el = document.documentElement;
        el.dir = preferredLang === 'ar' ? 'rtl' : 'ltr';
        el.lang = preferredLang;
      }

      // Apply theme immediately
      if (theme !== preferredTheme) {
        setTheme(preferredTheme);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err: any) {
      setError(err.message || t('profile.unexpectedError', 'حدث خطأ غير متوقع'));
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return <div className="p-8 text-center text-muted-foreground">{t('profile.loading', 'جاري تحميل البيانات...')}</div>;
  }

  return (
    <div className="w-full max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center overflow-hidden border border-border shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10" />
              )}
            </div>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 bg-black/40 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {uploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Camera className="w-6 h-6" />}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{t('profile.title', 'الملف الشخصي')}</h1>
            <p className="text-sm text-muted-foreground pt-1">{t('profile.subtitle', 'إدارة معلومات حسابك والتفضيلات')}</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <form id="profile-form" onSubmit={handleSubmit} className="p-6 space-y-8">
          
          {error && (
            <div className="flex items-center gap-2 p-4 text-sm text-red-700 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400 rounded-xl">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900/50 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              {t('profile.successMessage', 'تم تحديث البيانات بنجاح!')}
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">{t('profile.sections.basic', 'المعلومات الأساسية')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <label className="text-sm font-semibold text-muted-foreground xl:w-1/3 shrink-0">{t('profile.fields.email', 'البريد الإلكتروني')}</label>
                <div className="relative w-full">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground"><Mail className="w-5 h-5" /></div>
                  <input type="email" readOnly disabled className="w-full pl-4 pr-10 py-2 bg-muted border border-border rounded-lg text-muted-foreground cursor-not-allowed" value={user.email} />
                </div>
              </div>

              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <label className="text-sm font-semibold text-muted-foreground xl:w-1/3 shrink-0">{t('profile.fields.role', 'الصلاحية')}</label>
                <div className="relative w-full">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-primary"><ShieldCheck className="w-5 h-5" /></div>
                  <input type="text" readOnly disabled className="w-full pl-4 pr-10 py-2 bg-muted border border-border rounded-lg text-muted-foreground cursor-not-allowed font-medium" value={roleName} />
                </div>
              </div>

              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <label className="text-sm font-semibold text-muted-foreground xl:w-1/3 shrink-0">{t('profile.fields.fullName', 'الاسم الكامل')}</label>
                <div className="relative w-full">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground"><User className="w-5 h-5" /></div>
                  <input type="text" required className="w-full pl-4 pr-10 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground" value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
              </div>

              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <label className="text-sm font-semibold text-muted-foreground xl:w-1/3 shrink-0">{t('profile.fields.phone', 'رقم الجوال')}</label>
                <div className="relative w-full">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground"><Phone className="w-5 h-5" /></div>
                  <input type="tel" className="w-full pl-4 pr-10 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground text-left" dir="ltr" placeholder="+966500000000" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-border">
            <h3 className="text-lg font-semibold text-foreground">{t('profile.sections.preferences', 'التفضيلات')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <label className="text-sm font-semibold text-muted-foreground xl:w-1/3 shrink-0">{t('profile.fields.language', 'اللغة المفضلة')}</label>
                <div className="relative w-full">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground"><Globe className="w-5 h-5" /></div>
                  <select className="w-full pl-4 pr-10 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground appearance-none" value={preferredLang} onChange={e => setPreferredLang(e.target.value)}>
                    <option value="ar">{t('profile.fields.languageOptions.ar', 'العربية (Arabic)')}</option>
                    <option value="en">{t('profile.fields.languageOptions.en', 'الإنجليزية (English)')}</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <label className="text-sm font-semibold text-muted-foreground xl:w-1/3 shrink-0">{t('profile.fields.theme', 'المظهر')}</label>
                <div className="relative w-full">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground"><Moon className="w-5 h-5" /></div>
                  <select className="w-full pl-4 pr-10 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground appearance-none" value={preferredTheme} onChange={e => setPreferredTheme(e.target.value)}>
                    <option value="system">{t('profile.fields.themeOptions.system', 'النظام الأساسي')}</option>
                    <option value="light">{t('profile.fields.themeOptions.light', 'الوضع المضيء')}</option>
                    <option value="dark">{t('profile.fields.themeOptions.dark', 'الوضع الداكن')}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 rounded-lg font-bold transition-all shadow-sm active:scale-95 disabled:opacity-70"
            >
              {loading ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
              {t('profile.save', 'حفظ التعديلات')}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
