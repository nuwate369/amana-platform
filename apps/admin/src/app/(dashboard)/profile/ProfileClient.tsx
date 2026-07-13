'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Mail, Lock, ShieldCheck, Save, AlertCircle, CheckCircle2, Phone, Camera, Globe, Moon, Monitor, Smartphone, Trash2, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { STAFF_TYPE_LABELS, type UserType } from '@amana/shared-types';
import { listTrustedDevices, logoutAllDevices, type TrustedDevice } from '@/app/actions/devices';
import { notify } from '@/lib/toast';

export default function ProfileClient() {
  const { user } = useAuth();
  const { i18n, t } = useTranslation();
  const { theme, setTheme } = useTheme();
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [roleName, setRoleName] = useState('جاري التحميل...');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [preferredLang, setPreferredLang] = useState('ar');
  const [preferredTheme, setPreferredTheme] = useState('system');

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState(false);

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

      // جلب الأجهزة الموثوقة
      loadDevices();
    }
  }, [user]);

  async function loadDevices() {
    if (!user) return;
    setDevicesLoading(true);
    const list = await listTrustedDevices(user.id);
    setDevices(list);
    setDevicesLoading(false);
  }

  async function handleLogoutAll() {
    setShowLogoutAllConfirm(true);
  }

  async function confirmLogoutAll() {
    if (!user) return;
    setShowLogoutAllConfirm(false);
    setLoggingOutAll(true);
    const result = await logoutAllDevices(user.id);
    if (result.success) {
      notify.success('تم تسجيل الخروج من كل الأجهزة');
      loadDevices();
    } else {
      notify.error(result.error || 'حدث خطأ');
    }
    setLoggingOutAll(false);
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      setError(null);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('يجب اختيار صورة.');
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

      // Password Change Logic
      if (oldPassword || newPassword || confirmPassword) {
        if (!oldPassword || !newPassword || !confirmPassword) {
          throw new Error('يرجى تعبئة جميع حقول كلمة المرور.');
        }
        if (newPassword !== confirmPassword) {
          throw new Error('كلمة المرور الجديدة غير متطابقة.');
        }
        if (newPassword.length < 6) {
          throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
        }

        // Validate old password by trying to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email!,
          password: oldPassword,
        });

        if (signInError) {
          throw new Error('كلمة المرور القديمة غير صحيحة.');
        }

        // Proceed to update password
        const { error: updateAuthError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateAuthError) throw updateAuthError;
      }

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
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return <div className="p-8 text-center text-muted-foreground">جاري تحميل البيانات...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="relative group">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center overflow-hidden border border-border">
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
          <h1 className="text-2xl font-bold text-foreground">الملف الشخصي</h1>
          <p className="text-sm text-muted-foreground">إدارة معلومات حسابك والتفضيلات</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          
          {error && (
            <div className="flex items-center gap-2 p-4 text-sm text-red-700 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400 rounded-xl">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900/50 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              تم تحديث البيانات بنجاح!
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">المعلومات الأساسية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">البريد الإلكتروني</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground"><Mail className="w-5 h-5" /></div>
                  <input type="email" readOnly disabled className="w-full pl-4 pr-10 py-2.5 bg-muted border border-border rounded-lg text-muted-foreground cursor-not-allowed" value={user.email} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">الصلاحية</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-primary"><ShieldCheck className="w-5 h-5" /></div>
                  <input type="text" readOnly disabled className="w-full pl-4 pr-10 py-2.5 bg-muted border border-border rounded-lg text-muted-foreground cursor-not-allowed font-medium" value={roleName} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">الاسم الكامل</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground"><User className="w-5 h-5" /></div>
                  <input type="text" required className="w-full pl-4 pr-10 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground" value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">رقم الجوال</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground"><Phone className="w-5 h-5" /></div>
                  <input type="tel" className="w-full pl-4 pr-10 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground text-left" dir="ltr" placeholder="+966500000000" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-border">
            <h3 className="text-lg font-semibold text-foreground">التفضيلات</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">اللغة المفضلة</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground"><Globe className="w-5 h-5" /></div>
                  <select className="w-full pl-4 pr-10 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground appearance-none" value={preferredLang} onChange={e => setPreferredLang(e.target.value)}>
                    <option value="ar">العربية (Arabic)</option>
                    <option value="en">الإنجليزية (English)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">المظهر</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground"><Moon className="w-5 h-5" /></div>
                  <select className="w-full pl-4 pr-10 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground appearance-none" value={preferredTheme} onChange={e => setPreferredTheme(e.target.value)}>
                    <option value="system">النظام الأساسي</option>
                    <option value="light">الوضع المضيء</option>
                    <option value="dark">الوضع الداكن</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-border">
            <h3 className="text-lg font-semibold text-foreground">تغيير كلمة المرور (اختياري)</h3>
            <p className="text-sm text-muted-foreground">اترك الحقول فارغة إذا كنت لا تود التغيير.</p>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">كلمة المرور الحالية</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground"><Lock className="w-5 h-5" /></div>
                  <input type="password" placeholder="********" className="w-full pl-4 pr-10 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground"><Lock className="w-5 h-5" /></div>
                    <input type="password" placeholder="********" className="w-full pl-4 pr-10 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">تأكيد كلمة المرور الجديدة</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground"><Lock className="w-5 h-5" /></div>
                    <input type="password" placeholder="********" className="w-full pl-4 pr-10 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-border">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              الأمان
            </h3>

            {/* Trusted Devices */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground">الأجهزة الموثوقة</h4>
                <button
                  onClick={handleLogoutAll}
                  disabled={loggingOutAll || devices.length === 0}
                  className="text-xs text-destructive hover:text-destructive/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  {loggingOutAll ? 'جاري...' : 'تسجيل الخروج من كل الأجهزة'}
                </button>
              </div>

              {devicesLoading ? (
                <div className="text-sm text-muted-foreground py-4 text-center">جاري تحميل الأجهزة...</div>
              ) : devices.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center bg-muted/50 rounded-lg">لا توجد أجهزة مسجلة</div>
              ) : (
                <div className="space-y-2">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        {device.os?.toLowerCase().includes('android') || device.os?.toLowerCase().includes('ios') ? (
                          <Smartphone className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Monitor className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {device.deviceName}
                            {device.isCurrent && (
                              <span className="mr-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">هذا الجهاز</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground/80">
                            {device.browser} · {device.os} · {device.ipAddress}
                          </p>
                          <p className="text-xs text-muted-foreground/60">
                            آخر ظهور: {new Date(device.lastSeenAt).toLocaleDateString('ar-SA')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 rounded-lg font-bold transition-all shadow-md active:scale-95 disabled:opacity-70"
            >
              {loading ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>

      {/* Logout All Confirmation Dialog */}
      {showLogoutAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-destructive rotate-180" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">تسجيل الخروج من كل الأجهزة</h3>
                <p className="text-xs text-muted-foreground">هل أنت متأكد؟</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              سيتم إنهاء جميع الجلسات النشطة على جميع الأجهزة. سيُطلب منك إعادة تسجيل الدخول على كل جهاز.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={confirmLogoutAll}
                className="flex-1 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-sm transition-colors"
              >
                نعم، إنهاء كل الجلسات
              </button>
              <button
                onClick={() => setShowLogoutAllConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-sm transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
